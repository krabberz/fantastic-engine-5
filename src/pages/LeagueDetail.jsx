import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import styles from './LeagueDetail.module.css'

export default function LeagueDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()

  const [league, setLeague] = useState(null)
  const [picks, setPicks] = useState([])
  const [entries, setEntries] = useState([])
  const [myEntry, setMyEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  const [predictions, setPredictions] = useState({})
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: lp }, { data: le }] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', id).single(),
        supabase.from('league_picks').select('pick_id, picks(*)').eq('league_id', id),
        supabase.from('league_entries').select('*, profiles(display_name, full_name)').eq('league_id', id).order('rank', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      ])
      setLeague(l)
      setPicks((lp ?? []).map(lp => lp.picks).filter(Boolean))
      setEntries(le ?? [])
      if (user) {
        const mine = (le ?? []).find(e => e.user_id === user.id)
        setMyEntry(mine ?? null)
      }
      setLoading(false)
    }
    load()
  }, [id, user])

  function predict(pickId, outcome) {
    setPredictions(p => ({ ...p, [pickId]: outcome }))
  }

  async function joinLeague(e) {
    e.preventDefault()
    if (!user) return
    if (!profile?.jcb_card_number) {
      setJoinMsg({ type: 'error', text: 'No payment method linked. Add a card in Dashboard first.' })
      return
    }
    const allPredicted = picks.length > 0 && picks.every(p => predictions[p.id])
    if (!allPredicted) {
      setJoinMsg({ type: 'error', text: 'Make a prediction for every pick before joining.' })
      return
    }

    setJoining(true)
    setJoinMsg(null)

    try {
      const ref = `LEAGUE-${id.slice(0, 8)}-${user.id.slice(0, 8)}-${Date.now()}`
      const { data: chargeData, error: invokeErr } = await supabase.functions.invoke('charge-card', {
        body: {
          amount: Number(league.entry_fee),
          description: `Jollar Picks — ${league.name} league entry`,
          reference: ref,
          metadata: { league_id: id, user_id: user.id },
        },
      })

      if (invokeErr || !chargeData?.ok) {
        setJoinMsg({ type: 'error', text: chargeData?.error?.message ?? invokeErr?.message ?? 'Card charge failed.' })
        setJoining(false)
        return
      }

      const { error: dbErr } = await supabase.from('league_entries').insert({
        league_id: id,
        user_id: user.id,
        predictions,
        jcb_transaction_ref: chargeData.data?.reference ?? chargeData?.reference ?? ref,
      })

      if (dbErr) {
        setJoinMsg({ type: 'error', text: `Charged but entry failed: ${dbErr.message} — ref: ${chargeData.data?.reference ?? ref}` })
      } else {
        setJoinMsg({ type: 'success', text: `Joined! Ɉ${Math.round(Number(league.entry_fee))} charged.` })
        const { data: le } = await supabase
          .from('league_entries')
          .select('*, profiles(display_name, full_name)')
          .eq('league_id', id)
          .order('rank', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
        setEntries(le ?? [])
        setMyEntry((le ?? []).find(e => e.user_id === user.id) ?? null)
        if (league) setLeague(prev => ({ ...prev, entry_count: (prev.entry_count ?? 0) + 1 }))
      }
    } catch (err) {
      setJoinMsg({ type: 'error', text: err.message ?? 'Failed to reach JCB API.' })
    }
    setJoining(false)
  }

  if (loading) return <><Nav /><div style={{ padding: 120, textAlign: 'center', color: 'var(--grey)', fontFamily: 'Barlow Condensed' }}>Loading...</div><Footer /></>
  if (!league) return <><Nav /><div style={{ padding: 120, textAlign: 'center', color: 'var(--grey)', fontFamily: 'Barlow Condensed' }}>League not found.</div><Footer /></>

  const prizePool = Math.round((Number(league.entry_fee) - Number(league.rake)) * Number(league.entry_count))
  const splitKey = league.payout_split ?? '40/30/30'
  const splitRatios = splitKey === '33/33/33' ? [1/3, 1/3, 1/3] : splitKey.split('/').map(p => Number(p) / 100)
  const splitLabels = splitKey === '33/33/33' ? splitRatios.map(() => '33%') : splitKey.split('/').map(p => `${p}%`)
  const ordinals = ['1st', '2nd', '3rd', '4th']
  const isOpen = league.status === 'open'
  const canJoin = isOpen && !!user && !myEntry

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank
    if (a.rank != null) return -1
    if (b.rank != null) return 1
    return new Date(a.created_at) - new Date(b.created_at)
  })

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <div className="section-label">League</div>
        <h1 className={styles.heroTitle}>{league.name}</h1>
        {league.description && <p className={styles.heroCopy}>{league.description}</p>}
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatVal}>Ɉ{Number(league.entry_fee).toFixed(0)}</div>
            <div className={styles.heroStatLabel}>Entry Fee</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatVal}>Ɉ{Number(league.rake).toFixed(0)}</div>
            <div className={styles.heroStatLabel}>Rake</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatVal}>{league.entry_count}</div>
            <div className={styles.heroStatLabel}>Entries</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatVal}>Ɉ{prizePool.toFixed(0)}</div>
            <div className={styles.heroStatLabel}>Prize Pool</div>
          </div>
        </div>
        <div className={styles.splitRow}>
          {splitRatios.map((ratio, i) => (
            <span key={i} className={styles.splitItem}>
              <span className="gold">{splitLabels[i]}</span> {ordinals[i]} — Ɉ{Math.round(prizePool * ratio)}
            </span>
          ))}
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.layout}>

          {/* Left: picks + join form */}
          <div className={styles.left}>
            <div className="section-label" style={{ marginBottom: 16 }}>Picks in This League</div>
            {picks.length === 0 ? (
              <p className={styles.empty}>No picks assigned yet.</p>
            ) : (
              <form onSubmit={joinLeague}>
                <div className={styles.pickList}>
                  {picks.map(pick => {
                    const gameTime = new Date(pick.game_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    const [t1, t2] = (pick.teams || '').split(/\s+vs\.?\s+/i).map(t => t.trim())
                    const TIE_SPORTS = ['Soccer', 'EPL', 'MLS', 'Bundesliga', 'NCAAF']
                    const hasTie = TIE_SPORTS.includes(pick.sport)
                    const outcomes = [
                      { value: 'team1', label: pick.team1 || t1 || 'Team 1', odds: pick.team1_odds },
                      { value: 'team2', label: pick.team2 || t2 || 'Team 2', odds: pick.team2_odds },
                      ...(hasTie ? [{ value: 'tie', label: 'Draw', odds: null }] : []),
                    ]
                    const correctVal = pick.result === 'win' ? 'team1' : pick.result === 'loss' ? 'team2' : pick.result === 'push' ? 'tie' : null
                    const chosen = myEntry ? myEntry.predictions[pick.id] : predictions[pick.id]

                    return (
                      <div key={pick.id} className={styles.pickRow}>
                        <div className={styles.pickInfo}>
                          <div className={styles.pickSport}>{pick.sport}</div>
                          <div className={styles.pickMatchup}>{pick.matchup}</div>
                          <div className={styles.pickSub}>{pick.teams} · {gameTime}</div>
                        </div>
                        <div className={styles.pickOutcomes}>
                          {outcomes.map(({ value, label, odds }) => {
                            const isChosen = chosen === value
                            const isCorrect = correctVal === value
                            return (
                              <button
                                key={value}
                                type="button"
                                disabled={!canJoin}
                                onClick={() => canJoin && predict(pick.id, value)}
                                className={`${styles.outcomeBtn}
                                  ${isChosen && !myEntry ? styles.outcomePicked : ''}
                                  ${myEntry && isChosen && isCorrect ? styles.outcomeCorrect : ''}
                                  ${myEntry && isChosen && !isCorrect && correctVal ? styles.outcomeWrong : ''}
                                  ${myEntry && isCorrect && !isChosen ? styles.outcomeResult : ''}
                                `}
                              >
                                <span>{label}</span>
                                {odds && <span className={styles.oddsChip}>{odds}</span>}
                              </button>
                            )
                          })}
                        </div>
                        {pick.spread && <div className={styles.pickSpread}>O/U {pick.spread}</div>}
                      </div>
                    )
                  })}
                </div>

                {canJoin && (
                  <div className={styles.joinBox}>
                    {!profile?.jcb_card_number ? (
                      <p className={styles.noCard}>
                        No payment method linked. <Link to="/dashboard" style={{ color: 'var(--gold)' }}>Add a card →</Link>
                      </p>
                    ) : (
                      <>
                        <div className={styles.joinSummary}>
                          <span>Card: •••• {profile.jcb_card_number.slice(-4)}</span>
                          <span>Entry: <strong className="gold">Ɉ{Math.round(Number(league.entry_fee))}</strong></span>
                        </div>
                        {joinMsg && <p className={joinMsg.type === 'error' ? styles.joinError : styles.joinSuccess}>{joinMsg.text}</p>}
                        {picks.length > 0 && !picks.every(p => predictions[p.id]) && (
                          <p className={styles.joinHint}>Pick a winner for every game above to continue.</p>
                        )}
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={joining || !picks.every(p => predictions[p.id])}
                          style={{ width: '100%' }}
                        >
                          {joining ? 'Joining...' : `Join League — Ɉ${Math.round(Number(league.entry_fee))}`}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {myEntry && joinMsg?.type === 'success' && (
                  <p className={styles.joinSuccess}>{joinMsg.text}</p>
                )}

                {!user && isOpen && (
                  <div className={styles.joinBox}>
                    <Link to="/login?tab=signup" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                      Sign up to join this league
                    </Link>
                  </div>
                )}

                {myEntry && (
                  <div className={styles.enteredBadge}>
                    ✓ You're in — {myEntry.score != null ? `Score: ${myEntry.score}/${picks.length}` : 'Awaiting results'}
                    {myEntry.rank && ` · Rank #${myEntry.rank}`}
                    {myEntry.payout ? ` · Ɉ${Math.round(Number(myEntry.payout))} won` : ''}
                  </div>
                )}

                {!isOpen && !myEntry && (
                  <p className={styles.closedMsg}>This league is {league.status}. Entries are closed.</p>
                )}
              </form>
            )}
          </div>

          {/* Right: standings */}
          <div className={styles.right}>
            <div className="section-label" style={{ marginBottom: 16 }}>Standings</div>
            {sortedEntries.length === 0 ? (
              <p className={styles.empty}>No entries yet. Be the first!</p>
            ) : (
              <div className={styles.standings}>
                {sortedEntries.map((entry, idx) => {
                  const name = entry.profiles?.display_name || entry.profiles?.full_name || `Player ${idx + 1}`
                  const rank = entry.rank ?? idx + 1
                  const isMe = user && entry.user_id === user.id
                  return (
                    <div key={entry.id} className={`${styles.standingRow} ${isMe ? styles.standingMe : ''}`}>
                      <div className={`${styles.rankNum} ${rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : ''}`}>
                        {rank}
                      </div>
                      <div className={styles.standingInfo}>
                        <div className={styles.standingName}>{name}{isMe ? ' (you)' : ''}</div>
                        {entry.score != null && (
                          <div className={styles.standingScore}>{entry.score}/{picks.length} correct</div>
                        )}
                      </div>
                      {entry.payout ? (
                        <div className={styles.standingPayout}>Ɉ{Math.round(Number(entry.payout))}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </section>
      <Footer />
    </>
  )
}
