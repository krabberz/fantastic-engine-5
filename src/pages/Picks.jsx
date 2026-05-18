import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Picks.module.css'

const SPORTS = ['All', 'Pro Basketball', 'Pro Football', 'Pro Baseball', 'Pro Hockey', 'Pro Soccer', 'College Football', 'College Basketball']

export default function Picks() {
  const { user, profile } = useAuth()
  const [picks, setPicks] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  const [betPick, setBetPick] = useState(null)
  const [betAmount, setBetAmount] = useState('')
  const [betting, setBetting] = useState(false)
  const [betMsg, setBetMsg] = useState(null)

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('picks')
        .select('*')
        .order('game_time', { ascending: true })

      if (filter !== 'All') query = query.eq('sport', filter)

      const { data } = await query
      setPicks(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  function openBet(pick) {
    setBetPick(pick)
    setBetAmount('')
    setBetMsg(null)
  }

  async function placeBet(e) {
    e.preventDefault()
    if (!profile?.jcb_card_number) return
    const amount = parseFloat(betAmount)
    if (!amount || amount <= 0) return
    setBetting(true)
    setBetMsg(null)
    const res = await fetch(
      `${import.meta.env.VITE_IPICK_URL}/functions/v1/place-bet`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_IPICK_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_IPICK_KEY}`,
        },
        body: JSON.stringify({
          pick_id: betPick.id,
          card_number: profile.jcb_card_number,
          amount,
          user_id: user.id,
        }),
      }
    )
    const data = await res.json()
    setBetting(false)
    if (data.ok) {
      setBetMsg({ type: 'success', text: `Bet placed! Ɉ${amount.toFixed(2)} charged.` })
    } else {
      setBetMsg({ type: 'error', text: data.error ?? 'Failed to place bet.' })
    }
  }

  const pending = picks.filter(p => !p.result)
  const completed = picks.filter(p => p.result)

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>This Week's <span className="gold">Picks</span></h1>
      </header>

      <section className={styles.section}>
        <div className={styles.filters}>
          {SPORTS.map(sport => (
            <button
              key={sport}
              className={`${styles.filterBtn} ${filter === sport ? styles.filterActive : ''}`}
              onClick={() => setFilter(sport)}
            >
              {sport}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.empty}>Loading picks...</div>
        ) : pending.length === 0 ? (
          <div className={styles.empty}>No picks available yet. Check back soon.</div>
        ) : (
          <div className={styles.picksGrid}>
            {pending.map(pick => (
              <PickCard key={pick.id} pick={pick} user={user} onBet={() => openBet(pick)} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <>
            <div className={styles.divider}>
              <span className="section-label" style={{ marginBottom: 0 }}>Results</span>
            </div>
            <div className={styles.picksGrid}>
              {completed.map(pick => (
                <PickCard key={pick.id} pick={pick} user={user} completed />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Bet modal */}
      {betPick && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && !betting && setBetPick(null)}>
          <div className={styles.modal}>
            <div className={styles.modalSport}>{betPick.sport}</div>
            <h2 className={styles.modalTitle}>{betPick.matchup}</h2>
            <p className={styles.modalSub}>{betPick.teams}</p>

            {!profile?.jcb_card_number ? (
              <>
                <p className={styles.noCard}>No payment method linked to your account.</p>
                <Link to="/dashboard" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
                  Add Card in Dashboard
                </Link>
                <button className={styles.cancelBtn} style={{ marginTop: 12 }} onClick={() => setBetPick(null)}>Cancel</button>
              </>
            ) : betMsg?.type === 'success' ? (
              <>
                <p className={styles.betSuccess}>{betMsg.text}</p>
                <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setBetPick(null)}>Done</button>
              </>
            ) : (
              <form onSubmit={placeBet} className={styles.betForm}>
                <div className={styles.cardHint}>
                  Card: •••• {profile.jcb_card_number.slice(-4)}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Amount (Ɉ)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="25.00"
                    value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                    className={styles.input}
                    autoFocus
                    required
                  />
                </div>
                {betMsg?.type === 'error' && <p className={styles.betError}>{betMsg.text}</p>}
                <div className={styles.betActions}>
                  <button type="button" className={styles.cancelBtn} disabled={betting} onClick={() => setBetPick(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={betting || !betAmount}>
                    {betting ? 'Placing...' : 'Place Bet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}

function PickCard({ pick, user, completed, onBet }) {
  const gameTime = new Date(pick.game_time)
  const timeStr = gameTime.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })

  return (
    <div className={`${styles.pickCard} ${completed ? styles.pickCardCompleted : ''}`}>
      <div className={styles.pickTop}>
        <div className={styles.pickSport}>{pick.sport}</div>
        {pick.is_hot && <div className={styles.hotTag}>🔥 Hot Pick</div>}
        {pick.result && (
          <div className={`${styles.resultTag} ${pick.result === 'win' ? styles.win : pick.result === 'loss' ? styles.loss : styles.push}`}>
            {pick.result.toUpperCase()}
          </div>
        )}
      </div>
      <div className={styles.pickMatchup}>{pick.matchup}</div>
      <div className={styles.pickTeams}>{pick.teams}</div>
      <div className={styles.pickTime}>{timeStr}</div>
      <div className={styles.pickBottom}>
        <div>
          <div className={styles.confidenceLabel}>Confidence</div>
          <div className={styles.confidenceVal}>{pick.confidence}%</div>
          <div className={styles.confidenceBar}>
            <div className={styles.confidenceFill} style={{ width: `${pick.confidence}%` }} />
          </div>
        </div>
        {!completed && (
          <div className={styles.pickBottomRight}>
            <div className={styles.oddsTag}>{pick.odds ?? 'N/A'}</div>
            {user && (
              <button className={styles.betBtn} onClick={onBet}>Place Bet</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
