import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Dashboard.module.css'

async function safeJson(res) {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) throw new Error(`Unexpected response (${res.status})`)
  return res.json()
}

export default function Dashboard() {
  const { user, profile, account, loading, refreshProfile } = useAuth()
  const [bets, setBets] = useState([])
  const [betsLoading, setBetsLoading] = useState(true)

  // Payment methods state
  const [editingCard, setEditingCard] = useState(false)
  const [cardInput, setCardInput] = useState('')
  const [cardValidating, setCardValidating] = useState(false)
  const [cardInfo, setCardInfo] = useState(null)
  const [cardSaving, setCardSaving] = useState(false)
  const [cardError, setCardError] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_bets')
      .select('*, picks(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setBets(data ?? [])
        setBetsLoading(false)
      })
  }, [user])

  function startEditCard() {
    setCardInput('')
    setCardInfo(null)
    setCardError(null)
    setEditingCard(true)
  }

  async function validateCard() {
    if (cardInput.length < 16) return
    setCardError(null)
    setCardInfo(null)
    setCardValidating(true)
    try {
      const validateRes = await fetch(`${import.meta.env.VITE_JCB_URL}/api/v1/cards/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_JCB_KEY}` },
        body: JSON.stringify({ card_number: cardInput }),
      })
      const validateData = await safeJson(validateRes)
      if (!validateData?.ok || !validateData.data?.valid) {
        setCardError(validateData?.data?.reason ?? validateData?.message ?? 'Card not found or invalid.')
        setCardValidating(false)
        return
      }

      // Card is valid — set info immediately so save button enables
      const info = { ...validateData.data, card_number: cardInput }
      setCardInfo(info)

      // Enrich with account details if account_number is present
      const accountNumber = validateData.data.account_number
      if (accountNumber) {
        try {
          const accRes = await fetch(`${import.meta.env.VITE_JCB_URL}/api/v1/accounts/${accountNumber}`, {
            headers: { 'Authorization': `Bearer ${import.meta.env.VITE_JCB_KEY}` },
          })
          const accData = await safeJson(accRes)
          if (accData?.ok) setCardInfo({ ...info, ...accData.data })
        } catch {}
      }
    } catch (err) {
      setCardError(err.message ?? 'Failed to reach JCB API.')
    }
    setCardValidating(false)
  }

  async function saveCard() {
    if (!cardInfo) return
    setCardSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        jcb_card_number: cardInput,
        jcb_account_number: cardInfo.account_number ?? null,
      })
      .eq('id', user.id)
    setCardSaving(false)
    if (error) { setCardError(error.message); return }
    setEditingCard(false)
    await refreshProfile()
  }

  async function removeCard() {
    if (!confirm('Remove your linked card?')) return
    await supabase.from('profiles').update({ jcb_card_number: null, jcb_account_number: null }).eq('id', user.id)
    setEditingCard(false)
    await refreshProfile()
  }

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const wins = bets.filter(b => b.result === 'win').length
  const losses = bets.filter(b => b.result === 'loss').length
  const pending = bets.filter(b => !b.result).length
  const winRate = bets.length > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0

  const maskedCard = profile?.jcb_card_number
    ? `•••• •••• •••• ${profile.jcb_card_number.slice(-4)}`
    : null

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className="section-label">Your Account</div>
          <h1 className={styles.heroTitle}>
            Welcome, <span className="gold">{profile?.display_name || profile?.full_name || 'Jollarian'}</span>
          </h1>
        </div>
      </header>

      <section className={styles.section}>
        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{account ? `Ɉ${Math.round(Number(account.balance))}` : '—'}</div>
            <div className={styles.statLabel}>Account Balance</div>
            {account && <div className={styles.statSub}>{account.account_number}</div>}
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{winRate}%</div>
            <div className={styles.statLabel}>Win Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{wins}</div>
            <div className={styles.statLabel}>Wins</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{losses}</div>
            <div className={styles.statLabel}>Losses</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{pending}</div>
            <div className={styles.statLabel}>Pending</div>
          </div>
        </div>

        {/* Payment methods */}
        <div className={styles.paymentSection}>
          <div className={styles.paymentHeader}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Wallet</div>
              <h2 className={styles.paymentTitle}>Payment <span className="gold">Methods</span></h2>
            </div>
            {!editingCard && (
              <button className={styles.addCardBtn} onClick={startEditCard}>
                {maskedCard ? 'Change Card' : '+ Add Card'}
              </button>
            )}
          </div>

          {!editingCard ? (
            <div className={styles.cardDisplay}>
              {maskedCard ? (
                <>
                  <div className={styles.cardChip} />
                  <div className={styles.cardNumber}>{maskedCard}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDefault}>DEFAULT</span>
                    <button className={styles.removeCardBtn} onClick={removeCard}>Remove</button>
                  </div>
                </>
              ) : (
                <p className={styles.noCardMsg}>No payment method linked. Add a JCB card to place bets.</p>
              )}
            </div>
          ) : (
            <div className={styles.cardEditPanel}>
              <div className={styles.cardEditRow}>
                <input
                  type="text"
                  placeholder="16-digit JCB card number"
                  value={cardInput}
                  onChange={e => { setCardInput(e.target.value.replace(/\D/g, '').slice(0, 16)); setCardInfo(null); setCardError(null) }}
                  className={styles.cardInput}
                  maxLength={16}
                  autoFocus
                />
                <button
                  className={styles.verifyBtn}
                  onClick={validateCard}
                  disabled={cardValidating || cardInput.length < 16}
                >
                  {cardValidating ? '...' : 'Verify'}
                </button>
              </div>
              {cardInfo && (
                <p className={styles.cardSuccess}>
                  ✓ Card verified
                  {cardInfo.owner_name ? ` — ${cardInfo.owner_name}` : ''}
                  {cardInfo.account_number ? ` (${cardInfo.account_number})` : ''}
                  {cardInfo.balance != null ? ` · Ɉ${Math.round(Number(cardInfo.balance))}` : ''}
                </p>
              )}
              {cardError && <p className={styles.cardErr}>{cardError}</p>}
              <div className={styles.cardEditActions}>
                <button className={styles.cancelEditBtn} onClick={() => setEditingCard(false)}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={saveCard}
                  disabled={!cardInfo || cardSaving}
                >
                  {cardSaving ? 'Saving...' : 'Save as Default'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bet history */}
        <div className={styles.historyHeader}>
          <div className="section-label" style={{ marginBottom: 0 }}>History</div>
          <h2 className={styles.historyTitle}>Your <span className="gold">Bets</span></h2>
        </div>

        {betsLoading ? (
          <div className={styles.empty}>Loading your bets...</div>
        ) : bets.length === 0 ? (
          <div className={styles.empty}>
            No bets yet. <a href="/picks" style={{ color: 'var(--gold)' }}>See this week's picks →</a>
          </div>
        ) : (
          <div className={styles.betList}>
            {bets.map(bet => (
              <BetRow key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </>
  )
}

function BetRow({ bet }) {
  const pick = bet.picks
  const gameTime = pick ? new Date(pick.game_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

  return (
    <div className={styles.betRow}>
      <div className={styles.betLeft}>
        <div className={styles.betSport}>{pick?.sport ?? '—'}</div>
        <div className={styles.betMatchup}>{pick?.matchup ?? 'Unknown Pick'}</div>
        <div className={styles.betDate}>{gameTime}</div>
      </div>
      <div className={styles.betRight}>
        <div className={styles.betAmount}>Ɉ{Math.round(Number(bet.amount))}</div>
        {bet.payout && <div className={styles.betPayout}>+Ɉ{Math.round(Number(bet.payout))}</div>}
        <div className={`${styles.betResult} ${
          bet.result === 'win' ? styles.win :
          bet.result === 'loss' ? styles.loss :
          styles.pending
        }`}>
          {bet.result ? bet.result.toUpperCase() : 'PENDING'}
        </div>
      </div>
    </div>
  )
}
