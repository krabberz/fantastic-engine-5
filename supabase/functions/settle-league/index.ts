import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!
const IPICK_URL = Deno.env.get('SUPABASE_URL')!
const IPICK_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JPIX_ACCOUNT = Deno.env.get('JPIX_JCB_ACCOUNT')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { league_id } = await req.json()
    if (!league_id) return Response.json({ ok: false, error: 'Missing league_id' }, { status: 400, headers: cors })

    const db = createClient(IPICK_URL, IPICK_SECRET)

    // Get league
    const { data: league, error: leagueErr } = await db
      .from('leagues')
      .select('*')
      .eq('id', league_id)
      .single()

    if (leagueErr || !league) return Response.json({ ok: false, error: 'League not found' }, { status: 404, headers: cors })
    if (league.status === 'settled') return Response.json({ ok: false, error: 'Already settled' }, { status: 400, headers: cors })

    // Get picks in this league with their results
    const { data: leaguePicks } = await db
      .from('league_picks')
      .select('pick_id, picks(result)')
      .eq('league_id', league_id)

    if (!leaguePicks?.length) return Response.json({ ok: false, error: 'No picks in league' }, { status: 400, headers: cors })

    const unsettled = leaguePicks.filter((lp: any) => !lp.picks?.result)
    if (unsettled.length > 0) return Response.json({ ok: false, error: `${unsettled.length} pick(s) not yet settled` }, { status: 400, headers: cors })

    // Get all entries
    const { data: entries } = await db
      .from('league_entries')
      .select('*')
      .eq('league_id', league_id)

    if (!entries?.length) {
      await db.from('leagues').update({ status: 'settled', settled_at: new Date().toISOString() }).eq('id', league_id)
      return Response.json({ ok: true, message: 'No entries — league closed with no payouts' }, { headers: cors })
    }

    // Score each entry
    const pickResultMap: Record<string, string> = {}
    for (const lp of leaguePicks as any[]) {
      pickResultMap[lp.pick_id] = lp.picks.result
    }

    const scored = entries.map((entry: any) => {
      let score = 0
      for (const [pick_id, predicted] of Object.entries(entry.predictions as Record<string, string>)) {
        if (pickResultMap[pick_id] && pickResultMap[pick_id] === predicted) score++
      }
      return { ...entry, score }
    })

    // Rank by score desc, then entry time asc for tiebreak
    scored.sort((a: any, b: any) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Prize pool = (entry_fee - rake) * entry_count
    const prizePool = (Number(league.entry_fee) - Number(league.rake)) * Number(league.entry_count)
    const splitKey = league.payout_split ?? '40/30/30'
    const splits = splitKey === '33/33/33'
      ? [1/3, 1/3, 1/3]
      : [0.4, 0.3, 0.3]

    const results = []

    for (let i = 0; i < scored.length; i++) {
      const entry = scored[i]
      const rank = i + 1
      const payoutAmount = rank <= 3 ? Math.round(prizePool * splits[i]) : 0

      if (payoutAmount > 0) {
        const { data: profile } = await db
          .from('profiles')
          .select('jcb_card_number, jcb_account_number')
          .eq('id', entry.user_id)
          .single()

        // Resolve account number: validate card first to get current linked account
      let toAccount = profile?.jcb_account_number ?? null
      if (profile?.jcb_card_number) {
        const valRes = await fetch(`${JCB_URL}/api/v1/cards/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
          body: JSON.stringify({ card_number: profile.jcb_card_number }),
        })
        const valData = await valRes.json()
        if (valData.ok && valData.data?.valid && valData.data?.account_number) {
          toAccount = valData.data.account_number
        }
      }

      if (toAccount) {
          const ref = `LEAGUE-${league_id.slice(0, 8)}-RANK${rank}-${Date.now()}`
          const txRes = await fetch(`${JCB_URL}/api/v1/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
            body: JSON.stringify({
              from_account: JPIX_ACCOUNT,
              to_account: toAccount,
              amount: payoutAmount,
              transaction_type: 'gambling_win',
              description: `Jollar Picks League — ${league.name} (${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd'} place)`,
              reference: ref,
              metadata: { league_id, entry_id: entry.id, rank },
            }),
          })
          const txData = await txRes.json()

          if (txData.ok) {
            await db.from('league_entries').update({ score: entry.score, rank, payout: payoutAmount }).eq('id', entry.id)
            results.push({ rank, user_id: entry.user_id, score: entry.score, payout: payoutAmount, ok: true })
          } else {
            await db.from('league_entries').update({ score: entry.score, rank }).eq('id', entry.id)
            results.push({ rank, user_id: entry.user_id, score: entry.score, payout: 0, ok: false, error: txData.error })
          }
        } else {
          await db.from('league_entries').update({ score: entry.score, rank }).eq('id', entry.id)
          results.push({ rank, user_id: entry.user_id, score: entry.score, payout: 0, ok: false, error: 'No JCB account' })
        }
      } else {
        await db.from('league_entries').update({ score: entry.score, rank }).eq('id', entry.id)
        results.push({ rank, user_id: entry.user_id, score: entry.score, payout: 0, ok: true })
      }
    }

    await db.from('leagues').update({ status: 'settled', settled_at: new Date().toISOString() }).eq('id', league_id)

    return Response.json({ ok: true, prize_pool: prizePool, results }, { headers: cors })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: cors })
  }
})
