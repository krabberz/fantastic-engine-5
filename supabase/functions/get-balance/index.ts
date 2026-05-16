import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!
const IPICK_URL = Deno.env.get('SUPABASE_URL')!
const IPICK_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { user_id } = await req.json()
    if (!user_id) return Response.json({ ok: false, error: 'Missing user_id' }, { status: 400, headers: cors })

    const db = createClient(IPICK_URL, IPICK_SECRET)
    const { data: profile } = await db
      .from('profiles')
      .select('jcb_account_number, jcb_card_number')
      .eq('id', user_id)
      .single()

    const accountNumber = profile?.jcb_account_number
    if (!accountNumber) {
      return Response.json({ ok: false, error: 'No JCB account linked' }, { headers: cors })
    }

    const res = await fetch(`${JCB_URL}/api/v1/accounts/${accountNumber}`, {
      headers: { 'Authorization': `Bearer ${JCB_KEY}` },
    })
    const data = await res.json()

    if (!data.ok) return Response.json({ ok: false, error: data.error ?? 'Account not found' }, { headers: cors })

    return Response.json({ ok: true, account: data.data }, { headers: cors })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: cors })
  }
})
