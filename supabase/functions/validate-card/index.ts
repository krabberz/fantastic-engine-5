const JCB_URL = Deno.env.get('JCB_API_URL')!
const JCB_KEY = Deno.env.get('JCB_API_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { card_number } = await req.json()
    if (!card_number) return Response.json({ ok: false, error: 'Missing card_number' }, { status: 400, headers: cors })

    const validateRes = await fetch(`${JCB_URL}/api/v1/cards/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JCB_KEY}` },
      body: JSON.stringify({ card_number }),
    })
    const validateData = await validateRes.json()

    if (!validateData.ok || !validateData.data?.valid) {
      return Response.json({ ok: false, error: validateData.data?.reason ?? 'Card invalid' }, { headers: cors })
    }

    // Card is valid — fetch the linked account for balance info
    const accountNumber = validateData.data.account_number
    if (!accountNumber) {
      return Response.json({ ok: true, account: null }, { headers: cors })
    }

    const accountRes = await fetch(`${JCB_URL}/api/v1/accounts/${accountNumber}`, {
      headers: { 'Authorization': `Bearer ${JCB_KEY}` },
    })
    const accountData = await accountRes.json()

    return Response.json(
      { ok: true, account: accountData.ok ? accountData.data : null },
      { headers: cors }
    )
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: cors })
  }
})
