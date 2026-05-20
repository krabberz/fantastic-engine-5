import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ ok: false, error: { message: 'Unauthorized' } }, { status: 401, headers: cors })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await db.auth.getUser(token)
    if (userErr || !user) {
      return Response.json({ ok: false, error: { message: 'Unauthorized' } }, { status: 401, headers: cors })
    }

    // Card number comes from the server — never from the client
    const { data: profile } = await db
      .from('profiles')
      .select('jcb_card_number')
      .eq('id', user.id)
      .single()

    if (!profile?.jcb_card_number) {
      return Response.json({ ok: false, error: { message: 'No payment method linked.' } }, { status: 400, headers: cors })
    }

    const { amount, description, reference, metadata } = await req.json()

    if (!amount || Number(amount) < 4) {
      return Response.json({ ok: false, error: { message: 'Minimum amount is Ɉ4.' } }, { status: 400, headers: cors })
    }

    const chargeRes = await fetch(`${JCB_URL}/api/v1/cards/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
      body: JSON.stringify({
        card_number: profile.jcb_card_number,
        amount: Number(amount),
        transaction_type: 'charge',
        description,
        reference,
        metadata,
      }),
    })

    const chargeData = await chargeRes.json()
    return Response.json(chargeData, { headers: cors })
  } catch (err) {
    return Response.json({ ok: false, error: { message: String(err) } }, { status: 500, headers: cors })
  }
})
