import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Picks.module.css'

const SPORTS = ['All', 'Pro Basketball', 'Pro Football', 'Pro Baseball', 'Pro Hockey', 'Pro Soccer', 'College Football', 'College Basketball']

export default function Picks() {
  const { user } = useAuth()
  const [picks, setPicks] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

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

  const pending = picks.filter(p => !p.result)
  const completed = picks.filter(p => p.result)

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>This Week's <span className="gold">Picks</span></h1>
      </header>

      <section className={styles.section}>
        {/* Sport filter */}
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
              <PickCard key={pick.id} pick={pick} user={user} />
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

      <Footer />
    </>
  )
}

function PickCard({ pick, completed }) {
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
          <div className={styles.oddsTag}>{pick.odds ?? 'N/A'}</div>
        )}
      </div>
    </div>
  )
}
