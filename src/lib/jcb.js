const JCB_URL = import.meta.env.VITE_JCB_API_URL
const JCB_KEY = import.meta.env.VITE_JCB_API_KEY

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JCB_KEY}`,
})

export async function validateCard(cardNumber) {
  const res = await fetch(`${JCB_URL}/api/v1/cards/validate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ card_number: cardNumber }),
  })
  return res.json()
}

export async function chargeCard({ cardNumber, amount, description, metadata }) {
  const res = await fetch(`${JCB_URL}/api/v1/cards/charge`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      card_number: cardNumber,
      amount,
      description,
      metadata,
    }),
  })
  return res.json()
}

export async function getAccount(accountNumber) {
  const res = await fetch(`${JCB_URL}/api/v1/accounts/${accountNumber}`, {
    headers: headers(),
  })
  return res.json()
}

export async function getTransactions(accountNumber, limit = 20, offset = 0) {
  const res = await fetch(
    `${JCB_URL}/api/v1/transactions?account=${accountNumber}&limit=${limit}&offset=${offset}`,
    { headers: headers() }
  )
  return res.json()
}
