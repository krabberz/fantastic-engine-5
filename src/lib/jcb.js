// JCB API calls go through Supabase Edge Functions so the API key stays server-side.
// Direct JCB calls from the browser are not allowed per JCB API security policy.

const FUNCTIONS_URL = `${import.meta.env.VITE_IPICK_URL}/functions/v1`

async function callFunction(name, body) {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_IPICK_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_IPICK_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// Place a bet — validates card, charges via JCB, records in user_bets
export async function placeBet({ pickId, cardNumber, amount, userId }) {
  return callFunction('place-bet', {
    pick_id: pickId,
    card_number: cardNumber,
    amount,
    user_id: userId,
  })
}

// Payout winnings for a pick (admin only, called server-side)
export async function payoutWin({ pickId, multiplier = 2 }) {
  return callFunction('payout-win', { pick_id: pickId, multiplier })
}
