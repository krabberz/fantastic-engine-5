import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!
const IPICK_URL = Deno.env.get('SUPABASE_URL')!
const IPICK_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pick_id, card_number, amount, user_id } = await req.json()

    if (!pick_id || !card_number || !amount || !user_id) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
    }

    // 1. Validate card first
    const validateRes = await fetch(`${JCB_URL}/api/v1/cards/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
      body: JSON.stringify({ card_number }),
    })
    const validateData = await validateRes.json()

    if (!validateData.ok || !validateData.data.valid) {
      return Response.json(
        { ok: false, error: validateData.data?.reason ?? 'Card validation failed' },
        { status: 422, headers: corsHeaders }
      )
    }

    // 2. Charge the card — gambling_loss type per JCB API docs
    const ref = `BET-${pick_id.slice(0, 8)}-${user_id.slice(0, 8)}-${Date.now()}`
    const chargeRes = await fetch(`${JCB_URL}/api/v1/cards/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
      body: JSON.stringify({
        card_number,
        amount,
        transaction_type: 'gambling_loss',
        description: `Jollar Picks — bet on pick ${pick_id.slice(0, 8)}`,
        reference: ref,
        metadata: { pick_id, user_id, platform: 'Jollar Picks' },
      }),
    })
    const chargeData = await chargeRes.json()

    if (!chargeData.ok) {
      return Response.json(
        { ok: false, error: chargeData.error?.code ?? 'Charge failed' },
        { status: 422, headers: corsHeaders }
      )
    }

    // 3. Record the bet in i-pick DB using service role
    const db = createClient(IPICK_URL, IPICK_SECRET)
    const { data: bet, error: dbErr } = await db
      .from('user_bets')
      .insert({
        user_id,
        pick_id,
        amount,
        jcb_transaction_ref: chargeData.data.reference,
      })
      .select()
      .single()

    if (dbErr) {
      // Charge went through but DB failed — log reference so it can be refunded
      console.error('DB insert failed after charge:', chargeData.data.reference, dbErr)
      return Response.json(
        { ok: false, error: 'DB error after charge — contact support', ref: chargeData.data.reference },
        { status: 500, headers: corsHeaders }
      )
    }

    return Response.json({ ok: true, bet }, { headers: corsHeaders })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: corsHeaders })
  }
})
