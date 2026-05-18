import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import styles from './Leagues.module.css'

export default function Leagues() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLeagues(data ?? [])
        setLoading(false)
      })
  }, [])

  const open = leagues.filter(l => l.status === 'open')
  const locked = leagues.filter(l => l.status === 'locked')
  const settled = leagues.filter(l => l.status === 'settled')

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <div className="section-label">Competition</div>
        <h1 className={styles.heroTitle}>Pick'em <span className="gold">Leagues</span></h1>
        <p className={styles.heroCopy}>
          Predict outcomes, enter the pot, and compete for the top spot.
          Winners split the prize — <span className="gold">50 / 30 / 20</span>.
        </p>
      </header>

      <section className={styles.section}>
        {loading ? (
          <div className={styles.empty}>Loading leagues...</div>
        ) : leagues.length === 0 ? (
          <div className={styles.empty}>No leagues yet. Check back soon.</div>
        ) : (
          <>
            {open.length > 0 && (
              <>
                <div className="section-label" style={{ marginBottom: 24 }}>Open — Enter Now</div>
                <div className={styles.grid}>
                  {open.map(l => <LeagueCard key={l.id} league={l} />)}
                </div>
              </>
            )}
            {locked.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 48, marginBottom: 24 }}>In Progress</div>
                <div className={styles.grid}>
                  {locked.map(l => <LeagueCard key={l.id} league={l} />)}
                </div>
              </>
            )}
            {settled.length > 0 && (
              <>
                <div className={styles.divider} />
                <div className="section-label" style={{ marginBottom: 24 }}>Results</div>
                <div className={styles.grid}>
                  {settled.map(l => <LeagueCard key={l.id} league={l} />)}
                </div>
              </>
            )}
          </>
        )}
      </section>
      <Footer />
    </>
  )
}

function LeagueCard({ league }) {
  const prizePool = (Number(league.entry_fee) - Number(league.rake)) * Number(league.entry_count)
  const closes = league.closes_at ? new Date(league.closes_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null

  return (
    <Link to={`/leagues/${league.id}`} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.badge} ${league.status === 'open' ? styles.badgeOpen : league.status === 'settled' ? styles.badgeSettled : styles.badgeLocked}`}>
          {league.status.toUpperCase()}
        </span>
        {closes && league.status === 'open' && <span className={styles.closes}>Closes {closes}</span>}
      </div>
      <div className={styles.cardName}>{league.name}</div>
      {league.description && <div className={styles.cardDesc}>{league.description}</div>}
      <div className={styles.cardStats}>
        <div className={styles.stat}>
          <div className={styles.statVal}>Ɉ{Number(league.entry_fee).toFixed(0)}</div>
          <div className={styles.statLabel}>Entry</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{league.entry_count}</div>
          <div className={styles.statLabel}>Entries</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>Ɉ{prizePool.toFixed(0)}</div>
          <div className={styles.statLabel}>Prize Pool</div>
        </div>
      </div>
    </Link>
  )
}
