import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabaseIpick } from '../lib/supabase'
import { useState } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Home.module.css'

const TICKER_ITEMS = [
  'NFL Weekly', 'MLB Daily', 'NCAAF Saturdays', 'EPL Weekly', 'MLS Weekly',
  'PLL Weekly', 'Your Favorite Teams', 'Win up to 100x your bet',
  'Every Sport, All Playoffs Long', 'Accurate Email Updates',
  'Extremely Competitive Leagues', 'Government-Backed Predictions',
]

const SPORTS = [
  { emoji: '🏀', name: 'Basketball' },
  { emoji: '🏈', name: 'Football' },
  { emoji: '⚾', name: 'Baseball' },
  { emoji: '🏒', name: 'Hockey' },
  { emoji: '⚽', name: 'Soccer' },
]

const TESTIMONIALS = [
  {
    initials: 'MS',
    name: 'Marcus S',
    title: 'lawyer',
    text: "Been with Jollar Picks for 6 months. They make predictions fun and exciting. The football picks alone funded my Jamazon shopping spree.",
  },
  {
    initials: 'SH',
    name: 'Sonicc H',
    title: 'chronically online',
    text: "The odds they give with each pick actually teach you what's happening. This isn't just some fun game, it keeps you up to date with the big leagues.",
  },
  {
    initials: 'PB',
    name: 'Yung Plinki Board',
    title: 'rapper',
    text: "I went 10-0 on my picks last week, bought myself more time in the studio, yaknowatimsayin? Look at my grills dude. Like look at em. Genuinely like stare at em. These are real ice.",
  },
]

export default function Home() {
  const [picks, setPicks] = useState([])
  const revealRefs = useRef([])

  useEffect(() => {
    supabaseIpick
      .from('picks')
      .select('*')
      .eq('result', null)
      .order('game_time', { ascending: true })
      .limit(3)
      .then(({ data }) => { if (data?.length) setPicks(data) })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 80)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    revealRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const addReveal = el => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el) }

  const displayPicks = picks.length ? picks : [
    { sport: 'NBA', matchup: 'Spurs -205', teams: 'San Antonio vs Minnesota', game_time: '2026-05-15T21:30:00Z', confidence: 64, is_hot: true },
    { sport: 'MLB', matchup: 'Braves -181', teams: 'CHC vs ATL', game_time: '2026-05-14T23:15:00Z', confidence: 67, is_hot: false },
    { sport: 'Bundesliga', matchup: 'Heidenheim -110', teams: 'HDH vs M05', game_time: '2026-05-16T13:30:00Z', confidence: 53, is_hot: false },
  ]

  return (
    <>
      <Nav />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGridLines} />
        <div className={styles.heroLeft}>
          <div className={styles.heroBadge}>Live Picks Available</div>
          <h1 className={styles.heroTitle}>
            ONLY<br />WITH<br /><span className="gold">JPIX</span>
          </h1>
          <p className={styles.heroSub}>
            Sports predictions in Jollaria like never before. Every week, you can put up Jollars to see if you make the best picks.
          </p>
          <div className={styles.heroActions}>
            <Link to="/picks"><button className="btn-primary">See This Week's Games</button></Link>
          </div>
          <div className={styles.heroStats}>
            <div>
              <div className={styles.statNum}>0%</div>
              <div className={styles.statLabel}>Win Rate</div>
            </div>
            <div>
              <div className={styles.statNum}>3+</div>
              <div className={styles.statLabel}>Picks Available Daily</div>
            </div>
            <div>
              <div className={styles.statNum}>0</div>
              <div className={styles.statLabel}>All-Time Games</div>
            </div>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.picksPanel}>
            <div className={styles.picksPanelHeader}>
              <span className={styles.picksPanelTitle}>This Week's Picks</span>
              <span className={styles.liveDot}>Live</span>
            </div>
            {displayPicks.map((pick, i) => (
              <PickItem key={i} pick={pick} />
            ))}
            <Link to="/picks">
              <div className={styles.picksPanelFooter}>View All Picks This Week →</div>
            </Link>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className={styles.tickerItem}>{item}</div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className={styles.how}>
        <div className="section-label">The Process</div>
        <h2 className="section-title">HOW <span className="gold">JOLLAR PICKS</span> WORKS</h2>
        <div className={styles.howGrid}>
          {[
            { num: '01', title: 'The Games', text: 'Every week, all the games of your favorite sports are added, with odds, just for you.' },
            { num: '02', title: 'The Picks', text: 'Pick your outcomes until 6 hours before to compete in your league and receive email updates about all of your picks.' },
            { num: '03', title: 'The Results', text: 'Check in on your picks and your league.' },
          ].map((card, i) => (
            <div key={i} className={styles.howCard} ref={addReveal}>
              <div className={styles.howNum}>{card.num}</div>
              <div className={styles.howCardTitle}>{card.title}</div>
              <p className={styles.howCardText}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SPORTS */}
      <section className={styles.sportsSection}>
        <div className="section-label">Coverage</div>
        <h2 className="section-title">EVERY <span className="gold">SPORT</span><br />EVERY WEEK</h2>
        <div className={styles.sportsGrid}>
          {SPORTS.map((sport, i) => (
            <Link to="/picks" key={i}>
              <div className={styles.sportCard} ref={addReveal}>
                <div className={styles.sportEmoji}>{sport.emoji}</div>
                <div className={styles.sportName}>{sport.name}</div>
                <div className={styles.sportCount}>0 picks today</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={styles.testimonials}>
        <div className="section-label">Reviews</div>
        <h2 className="section-title">MEMBERS<br /><span className="gold">WINNING</span> DAILY</h2>
        <div className={styles.testGrid}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={styles.testCard} ref={addReveal}>
              <div className={styles.testStars}>★★★★★</div>
              <p className={styles.testText}>{t.text}</p>
              <div className={styles.testAuthor}>
                <div className={styles.testAvatar}>{t.initials}</div>
                <div>
                  <div className={styles.testName}>{t.name},<br /><i>{t.title}</i></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className={`${styles.ctaBanner} reveal`} ref={addReveal}>
        <div className="section-label" style={{ justifyContent: 'center' }}>Unlimited Participation</div>
        <h2 className="section-title">STOP <span className="gold">GUESSING</span>.<br />START WINNING.</h2>
        <p className={styles.ctaSub}>Join members and cash in on premium picks.<br />A trusted name and picks that hit.</p>
        <Link to="/login"><button className="btn-primary" style={{ fontSize: '15px', padding: '18px 56px' }}>Make Your Picks Today</button></Link>
      </div>

      <Footer />
    </>
  )
}

function PickItem({ pick }) {
  const gameTime = new Date(pick.game_time)
  const timeStr = gameTime.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className={styles.pickItem}>
      <div>
        <div className={styles.pickSport}>{pick.sport}</div>
        <div className={styles.pickMatchup}>{pick.matchup}</div>
        <div className={styles.pickDetail}>{pick.teams}</div>
        <div className={styles.pickDetail}>{timeStr}</div>
        {pick.is_hot && <div className={styles.winTag}>🔥 Hot Pick</div>}
      </div>
      <div className={styles.pickConfidence}>
        <div className={styles.confidenceVal}>{pick.confidence}%</div>
        <div className={styles.confidenceBar}>
          <div className={styles.confidenceFill} style={{ width: `${pick.confidence}%` }} />
        </div>
      </div>
    </div>
  )
}
