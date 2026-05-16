import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user, profile, account, loading } = useAuth()
  const [bets, setBets] = useState([])
  const [betsLoading, setBetsLoading] = useState(true)

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

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const wins = bets.filter(b => b.result === 'win').length
  const losses = bets.filter(b => b.result === 'loss').length
  const pending = bets.filter(b => !b.result).length
  const winRate = bets.length > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0

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
            <div className={styles.statVal}>{account ? `Ɉ${Number(account.balance).toFixed(2)}` : '—'}</div>
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
        <div className={styles.betAmount}>Ɉ{Number(bet.amount).toFixed(2)}</div>
        {bet.payout && <div className={styles.betPayout}>+Ɉ{Number(bet.payout).toFixed(2)}</div>}
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
