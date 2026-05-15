import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Called by admin after confirming a pick result = 'win'
// Pays out all winning bets for a pick via JCB POST /transactions (gambling_win)

const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!
const IPICK_URL = Deno.env.get('SUPABASE_URL')!
const IPICK_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Jollar Picks JCB partner account — receives bet charges, sends out winnings
const JPIX_ACCOUNT = Deno.env.get('JPIX_JCB_ACCOUNT')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pick_id, multiplier = 2 } = await req.json()
    if (!pick_id) return Response.json({ ok: false, error: 'Missing pick_id' }, { status: 400, headers: corsHeaders })

    const db = createClient(IPICK_URL, IPICK_SECRET)

    // Get all pending bets on this pick
    const { data: bets, error } = await db
      .from('user_bets')
      .select('id, user_id, amount')
      .eq('pick_id', pick_id)
      .is('result', null)

    if (error || !bets?.length) {
      return Response.json({ ok: false, error: error?.message ?? 'No pending bets' }, { status: 404, headers: corsHeaders })
    }

    // Get each user's JCB account number from Jollarian Federation
    const jollaria = createClient(
      Deno.env.get('JOLLARIA_URL')!,
      Deno.env.get('JOLLARIA_SERVICE_KEY')!
    )

    const results = []
    for (const bet of bets) {
      const { data: account } = await jollaria
        .from('bank_accounts')
        .select('account_number')
        .eq('user_id', bet.user_id)
        .eq('account_type', 'checking')
        .single()

      if (!account?.account_number) {
        results.push({ bet_id: bet.id, ok: false, error: 'No JCB account found' })
        continue
      }

      const payout = Number(bet.amount) * multiplier
      const ref = `WIN-${bet.id.slice(0, 8)}-${Date.now()}`

      const txRes = await fetch(`${JCB_URL}/api/v1/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
        body: JSON.stringify({
          from_account: JPIX_ACCOUNT,
          to_account: account.account_number,
          amount: payout,
          transaction_type: 'gambling_win',
          facilitator: 'Jollar Picks',
          description: `Jollar Picks — winning payout for pick ${pick_id.slice(0, 8)}`,
          reference: ref,
          metadata: { pick_id, bet_id: bet.id },
        }),
      })
      const txData = await txRes.json()

      if (txData.ok) {
        await db.from('user_bets').update({ result: 'win', payout }).eq('id', bet.id)
        results.push({ bet_id: bet.id, ok: true, payout, ref })
      } else {
        results.push({ bet_id: bet.id, ok: false, error: txData.error?.code })
      }
    }

    // Mark pick result
    await db.from('picks').update({ result: 'win' }).eq('id', pick_id)

    return Response.json({ ok: true, results }, { headers: corsHeaders })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: corsHeaders })
  }
})
