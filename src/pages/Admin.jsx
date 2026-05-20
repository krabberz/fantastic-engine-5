import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Admin.module.css'

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'NCAAF', 'NCAAB', 'Bundesliga', 'EPL', 'MLS', 'Other']

const BLANK_PICK = { sport: 'NBA', team1: '', team1_odds: '', team2: '', team2_odds: '', spread: '', game_time: '', confidence: 70, is_hot: false }

export default function Admin() {
  const { user, profile, loading } = useAuth()

  const [picks, setPicks] = useState([])
  const [picksLoading, setPicksLoading] = useState(true)
  const [tab, setTab] = useState('picks')

  const [showForm, setShowForm] = useState(false)
  const [editPick, setEditPick] = useState(null)
  const [form, setForm] = useState(BLANK_PICK)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [resultModal, setResultModal] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settleMsg, setSettleMsg] = useState(null)

  const [allBets, setAllBets] = useState([])
  const [betsLoading, setBetsLoading] = useState(false)

  // Leagues state
  const [leagues, setLeagues] = useState([])
  const [leaguesLoading, setLeaguesLoading] = useState(false)
  const LEAGUE_RAKE = 1
  const [leagueForm, setLeagueForm] = useState({ name: '', description: '', entry_fee: '10', payout_split: '40/30/30', custom_parts: ['35', '25', '25', '15'], closes_at: '' })
  const [leaguePickIds, setLeaguePickIds] = useState([])
  const [savingLeague, setSavingLeague] = useState(false)
  const [leagueError, setLeagueError] = useState(null)
  const [settlingLeague, setSettlingLeague] = useState(null)
  const [settleLeagueMsg, setSettleLeagueMsg] = useState(null)
  const [editSplit, setEditSplit] = useState(null)

  useEffect(() => {
    if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return
    loadPicks()
  }, [user, profile])

  async function loadPicks() {
    setPicksLoading(true)
    const { data } = await supabase.from('picks').select('*').order('game_time', { ascending: false })
    setPicks(data ?? [])
    setPicksLoading(false)
  }

  async function loadBets() {
    setBetsLoading(true)
    const { data } = await supabase
      .from('user_bets')
      .select('*, picks(sport, matchup)')
      .order('created_at', { ascending: false })
      .limit(100)
    setAllBets(data ?? [])
    setBetsLoading(false)
  }

  async function loadLeagues() {
    setLeaguesLoading(true)
    const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false })
    setLeagues(data ?? [])
    setLeaguesLoading(false)
  }

  async function createLeague(e) {
    e.preventDefault()
    setLeagueError(null)
    if (!leagueForm.name) { setLeagueError('Name is required.'); return }
    if (leaguePickIds.length === 0) { setLeagueError('Select at least one pick.'); return }
    const payout_split = leagueForm.payout_split === 'custom'
      ? leagueForm.custom_parts.filter(p => p && Number(p) > 0).join('/')
      : leagueForm.payout_split
    setSavingLeague(true)
    const { data: l, error } = await supabase.from('leagues').insert({
      name: leagueForm.name,
      description: leagueForm.description || null,
      entry_fee: Number(leagueForm.entry_fee),
      rake: LEAGUE_RAKE,
      payout_split,
      closes_at: leagueForm.closes_at ? new Date(leagueForm.closes_at).toISOString() : null,
    }).select().single()
    if (error || !l) { setLeagueError(error?.message ?? 'Failed to create league'); setSavingLeague(false); return }
    await supabase.from('league_picks').insert(leaguePickIds.map(pick_id => ({ league_id: l.id, pick_id })))
    setSavingLeague(false)
    setLeagueForm({ name: '', description: '', entry_fee: '10', payout_split: '40/30/30', custom_parts: ['35', '25', '25', '15'], closes_at: '' })
    setLeaguePickIds([])
    loadLeagues()
  }

  async function deleteLeague(id, name) {
    if (!confirm(`Delete league "${name}"? This cannot be undone.`)) return
    await supabase.from('league_picks').delete().eq('league_id', id)
    await supabase.from('league_entries').delete().eq('league_id', id)
    await supabase.from('leagues').delete().eq('id', id)
    loadLeagues()
  }

  async function saveLeagueSplit(id) {
    const es = editSplit
    const split = es.value === 'custom'
      ? es.parts.filter(p => p && Number(p) > 0).join('/')
      : es.value
    await supabase.from('leagues').update({ payout_split: split }).eq('id', id)
    setEditSplit(null)
    loadLeagues()
  }

  async function lockLeague(id) {
    await supabase.from('leagues').update({ status: 'locked' }).eq('id', id)
    loadLeagues()
  }

  async function settleLeague(league) {
    setSettlingLeague(league.id)
    setSettleLeagueMsg(null)
    const res = await fetch(
      `${import.meta.env.VITE_IPICK_URL}/functions/v1/settle-league`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_IPICK_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_IPICK_KEY}`,
        },
        body: JSON.stringify({ league_id: league.id }),
      }
    )
    const data = await res.json()
    setSettleLeagueMsg(data.ok
      ? `Settled! Prize pool: Ɉ${Math.round(data.prize_pool ?? 0)}`
      : `Error: ${data.error}`)
    setSettlingLeague(null)
    loadLeagues()
  }

  function openAdd() {
    setEditPick(null)
    setForm(BLANK_PICK)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(pick) {
    setEditPick(pick)
    const [t1 = '', t2 = ''] = (pick.teams || '').split(/\s+vs\.?\s+/i).map(t => t.trim())
    setForm({
      sport: pick.sport,
      team1: pick.team1 || t1,
      team1_odds: pick.team1_odds ?? '',
      team2: pick.team2 || t2,
      team2_odds: pick.team2_odds ?? '',
      spread: pick.spread ?? '',
      game_time: pick.game_time ? pick.game_time.slice(0, 16) : '',
      confidence: pick.confidence,
      is_hot: pick.is_hot ?? false,
    })
    setFormError(null)
    setShowForm(true)
  }

  function setF(field) {
    return e => setForm(f => ({ ...f, [field]: field === 'is_hot' ? e.target.checked : e.target.value }))
  }

  async function savePick(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.team1 || !form.team2 || !form.game_time) {
      setFormError('Team 1, Team 2, and game time are required.')
      return
    }
    setSaving(true)
    const teams = `${form.team1} vs ${form.team2}`
    const payload = {
      sport: form.sport,
      matchup: teams,
      teams,
      team1: form.team1,
      team1_odds: form.team1_odds || null,
      team2: form.team2,
      team2_odds: form.team2_odds || null,
      spread: form.spread || null,
      odds: form.team1_odds || null,
      game_time: new Date(form.game_time).toISOString(),
      confidence: Number(form.confidence),
      is_hot: form.is_hot,
    }

    let err
    if (editPick) {
      const { error } = await supabase.from('picks').update(payload).eq('id', editPick.id)
      err = error
    } else {
      const { error } = await supabase.from('picks').insert(payload)
      err = error
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    setShowForm(false)
    loadPicks()
  }

  async function deletePick(pick) {
    if (!confirm(`Delete "${pick.matchup}"? This cannot be undone.`)) return
    await supabase.from('picks').delete().eq('id', pick.id)
    loadPicks()
  }

  async function settleResult(result) {
    setSettling(true)
    setSettleMsg(null)
    const pick = resultModal

    if (result === 'win') {
      const res = await fetch(
        `${import.meta.env.VITE_IPICK_URL}/functions/v1/payout-win`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_IPICK_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_IPICK_KEY}`,
          },
          body: JSON.stringify({ pick_id: pick.id, multiplier: 2 }),
        }
      )
      const data = await res.json()
      setSettleMsg(data.ok
        ? `Paid out ${data.results?.filter(r => r.ok).length ?? 0} winners.`
        : `Error: ${data.error}`)
    } else {
      await supabase.from('picks').update({ result }).eq('id', pick.id)
      await supabase.from('user_bets').update({ result }).eq('pick_id', pick.id).is('result', null)
      setSettleMsg(`Pick marked as ${result}.`)
    }

    setSettling(false)
    loadPicks()
  }

  if (loading) return null
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin' && profile.role !== 'superadmin') return <Navigate to="/" replace />

  const pending = picks.filter(p => !p.result)
  const settled = picks.filter(p => p.result)

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <div className="section-label">Admin</div>
        <h1 className={styles.heroTitle}>Picks <span className="gold">Control</span></h1>
      </header>

      <section className={styles.section}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'picks' ? styles.tabActive : ''}`} onClick={() => { setTab('picks'); loadPicks() }}>Picks</button>
          <button className={`${styles.tab} ${tab === 'bets' ? styles.tabActive : ''}`} onClick={() => { setTab('bets'); if (!allBets.length) loadBets() }}>All Bets</button>
          <button className={`${styles.tab} ${tab === 'leagues' ? styles.tabActive : ''}`} onClick={() => { setTab('leagues'); if (!leagues.length) loadLeagues() }}>Leagues</button>
        </div>

        {tab === 'picks' && (
          <>
            <div className={styles.toolbar}>
              <div>
                <span className={styles.count}>{pending.length} pending</span>
                <span className={styles.count} style={{ marginLeft: 16 }}>{settled.length} settled</span>
              </div>
              <button className="btn-primary" onClick={openAdd}>+ Add Pick</button>
            </div>

            {picksLoading ? (
              <p className={styles.empty}>Loading...</p>
            ) : picks.length === 0 ? (
              <p className={styles.empty}>No picks yet. Add one above.</p>
            ) : (
              <div className={styles.pickList}>
                {picks.map(pick => (
                  <PickRow
                    key={pick.id}
                    pick={pick}
                    onEdit={() => openEdit(pick)}
                    onDelete={() => deletePick(pick)}
                    onSettle={() => { setResultModal(pick); setSettleMsg(null) }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'bets' && (
          betsLoading ? (
            <p className={styles.empty}>Loading...</p>
          ) : allBets.length === 0 ? (
            <p className={styles.empty}>No bets placed yet.</p>
          ) : (
            <div className={styles.betTable}>
              <div className={styles.betHeader}>
                <span>User</span><span>Pick</span><span>Amount</span><span>Result</span><span>Payout</span>
              </div>
              {allBets.map(bet => (
                <div key={bet.id} className={styles.betRow}>
                  <span className={styles.betUser}>{bet.user_id.slice(0, 8)}…</span>
                  <span>{bet.picks?.matchup ?? '—'}</span>
                  <span>Ɉ{Math.round(Number(bet.amount))}</span>
                  <span className={`${styles.tag} ${bet.result === 'win' ? styles.win : bet.result === 'loss' ? styles.loss : bet.result === 'push' ? styles.push : styles.pending}`}>
                    {bet.result ?? 'pending'}
                  </span>
                  <span>{bet.payout ? `Ɉ${Math.round(Number(bet.payout))}` : '—'}</span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'leagues' && (
          <>
            {/* Create league form */}
            <div className={styles.leagueCreateBox}>
              <h3 className={styles.leagueCreateTitle}>Create League</h3>
              <form onSubmit={createLeague} className={styles.leagueForm}>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Name</label>
                    <input type="text" value={leagueForm.name} onChange={e => setLeagueForm(f => ({ ...f, name: e.target.value }))} className={styles.input} placeholder="Week 12 NBA Parlay" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Description (optional)</label>
                    <input type="text" value={leagueForm.description} onChange={e => setLeagueForm(f => ({ ...f, description: e.target.value }))} className={styles.input} placeholder="Pick all 5 games correctly to win" />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Entry Fee (Ɉ)</label>
                    <input type="number" min="10" step="1" value={leagueForm.entry_fee} onChange={e => setLeagueForm(f => ({ ...f, entry_fee: e.target.value }))} className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Rake (fixed)</label>
                    <div className={styles.input} style={{ display: 'flex', alignItems: 'center', opacity: 0.6, cursor: 'default' }}>Ɉ{LEAGUE_RAKE} per entry</div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Payout Split</label>
                    <select value={leagueForm.payout_split} onChange={e => setLeagueForm(f => ({ ...f, payout_split: e.target.value }))} className={styles.input}>
                      <option value="40/30/30">40 / 30 / 30</option>
                      <option value="33/33/33">33 / 33 / 33</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {leagueForm.payout_split === 'custom' && (
                    <div className={styles.field}>
                      <label className={styles.label}>Custom % (1st / 2nd / 3rd / 4th)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {leagueForm.custom_parts.map((p, i) => (
                          <input key={i} type="number" min="0" max="100" placeholder={['1st','2nd','3rd','4th'][i]} value={p}
                            onChange={e => setLeagueForm(f => { const cp = [...f.custom_parts]; cp[i] = e.target.value; return { ...f, custom_parts: cp } })}
                            className={styles.input} style={{ width: 64 }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.field}>
                    <label className={styles.label}>Closes At</label>
                    <input type="datetime-local" value={leagueForm.closes_at} onChange={e => setLeagueForm(f => ({ ...f, closes_at: e.target.value }))} className={styles.input} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Include Picks (select pending)</label>
                  <div className={styles.pickCheckList}>
                    {picks.filter(p => !p.result).map(pick => (
                      <label key={pick.id} className={styles.pickCheck}>
                        <input
                          type="checkbox"
                          checked={leaguePickIds.includes(pick.id)}
                          onChange={e => setLeaguePickIds(ids => e.target.checked ? [...ids, pick.id] : ids.filter(i => i !== pick.id))}
                        />
                        <span>{pick.sport} — {pick.matchup}</span>
                      </label>
                    ))}
                    {picks.filter(p => !p.result).length === 0 && <span className={styles.empty}>No pending picks. Add some first.</span>}
                  </div>
                </div>
                {leagueError && <p className={styles.error}>{leagueError}</p>}
                <button type="submit" className="btn-primary" disabled={savingLeague}>
                  {savingLeague ? 'Creating...' : 'Create League'}
                </button>
              </form>
            </div>

            {/* League list */}
            {settleLeagueMsg && <p className={styles.settleMsg}>{settleLeagueMsg}</p>}
            {leaguesLoading ? (
              <p className={styles.empty}>Loading...</p>
            ) : leagues.length === 0 ? (
              <p className={styles.empty}>No leagues yet.</p>
            ) : (
              <div className={styles.leagueList}>
                {leagues.map(l => {
                  const prizePool = (Number(l.entry_fee) - Number(l.rake)) * Number(l.entry_count)
                  const isEditingSplit = editSplit?.id === l.id
                  return (
                    <div key={l.id} className={styles.leagueRow}>
                      <div className={styles.leagueInfo}>
                        <div className={styles.leagueName}>{l.name}</div>
                        <div className={styles.leagueMeta}>
                          {l.entry_count} entries · Ɉ{Math.round(prizePool)} pool · Split: {l.payout_split ?? '40/30/30'} · Fee Ɉ{l.entry_fee}
                        </div>
                        {l.status === 'locked' && (
                          isEditingSplit ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                              <select value={editSplit.value} onChange={e => setEditSplit(s => ({ ...s, value: e.target.value }))} className={styles.input} style={{ width: 'auto' }}>
                                <option value="40/30/30">40 / 30 / 30</option>
                                <option value="33/33/33">33 / 33 / 33</option>
                                <option value="custom">Custom</option>
                              </select>
                              {editSplit.value === 'custom' && editSplit.parts.map((p, i) => (
                                <input key={i} type="number" min="0" max="100" value={p} placeholder={['1st','2nd','3rd','4th'][i]}
                                  onChange={e => setEditSplit(s => { const pts = [...s.parts]; pts[i] = e.target.value; return { ...s, parts: pts } })}
                                  className={styles.input} style={{ width: 56 }} />
                              ))}
                              <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => saveLeagueSplit(l.id)}>Save</button>
                              <button className={styles.cancelBtn} style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setEditSplit(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button className={styles.cancelBtn} style={{ marginTop: 6, fontSize: 12, padding: '2px 10px' }}
                              onClick={() => setEditSplit({ id: l.id, value: l.payout_split ?? '40/30/30', parts: ['35','25','25','15'] })}>
                              Edit Split
                            </button>
                          )
                        )}
                      </div>
                      <div className={styles.leagueActions}>
                        <span className={`${styles.tag} ${l.status === 'open' ? styles.pending : l.status === 'settled' ? styles.win : styles.push}`}>
                          {l.status.toUpperCase()}
                        </span>
                        {l.status === 'open' && (
                          <button className={styles.settleBtn} onClick={() => lockLeague(l.id)}>Lock</button>
                        )}
                        {l.status === 'locked' && (
                          <button className={styles.settleBtn} disabled={settlingLeague === l.id} onClick={() => settleLeague(l)}>
                            {settlingLeague === l.id ? '...' : 'Settle'}
                          </button>
                        )}
                        <button className={styles.deleteBtn} onClick={() => deleteLeague(l.id, l.name)}>Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Add / Edit form modal */}
      {showForm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{editPick ? 'Edit Pick' : 'New Pick'}</h2>
            <form className={styles.form} onSubmit={savePick}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Sport</label>
                  <select value={form.sport} onChange={setF('sport')} className={styles.input}>
                    {SPORTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Game Time</label>
                  <input type="datetime-local" value={form.game_time} onChange={setF('game_time')} className={styles.input} required />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Team 1</label>
                  <input type="text" placeholder="San Antonio Spurs" value={form.team1} onChange={setF('team1')} className={styles.input} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Team 1 Moneyline</label>
                  <input type="text" placeholder="-205" value={form.team1_odds} onChange={setF('team1_odds')} className={styles.input} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Team 2</label>
                  <input type="text" placeholder="Minnesota Timberwolves" value={form.team2} onChange={setF('team2')} className={styles.input} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Team 2 Moneyline</label>
                  <input type="text" placeholder="+175" value={form.team2_odds} onChange={setF('team2_odds')} className={styles.input} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Over/Under</label>
                  <input type="text" placeholder="224.5" value={form.spread} onChange={setF('spread')} className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confidence — {form.confidence}%</label>
                  <input type="range" min="0" max="100" value={form.confidence} onChange={setF('confidence')} className={styles.range} />
                </div>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.is_hot} onChange={setF('is_hot')} />
                <span>🔥 Hot Pick</span>
              </label>
              {formError && <p className={styles.error}>{formError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editPick ? 'Save Changes' : 'Add Pick'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle result modal */}
      {resultModal && (() => {
        const [rt1, rt2] = (resultModal.teams || '').split(/\s+vs\.?\s+/i).map(t => t.trim())
        const t1 = resultModal.team1 || rt1 || 'Team 1'
        const t2 = resultModal.team2 || rt2 || 'Team 2'
        const TIE_SPORTS = ['Soccer', 'EPL', 'MLS', 'Bundesliga', 'NCAAF']
        const hasDraw = TIE_SPORTS.includes(resultModal.sport)
        return (
          <div className={styles.overlay} onClick={e => e.target === e.currentTarget && !settling && setResultModal(null)}>
            <div className={styles.modal}>
              <h2 className={styles.modalTitle}>Set Result</h2>
              <p className={styles.modalSub}>{resultModal.sport} · {resultModal.teams}</p>
              {settleMsg ? (
                <>
                  <p className={styles.settleMsg}>{settleMsg}</p>
                  <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setResultModal(null)}>Close</button>
                </>
              ) : (
                <div className={styles.resultBtns}>
                  <button className={`${styles.resultBtn} ${styles.winBtn}`} disabled={settling} onClick={() => settleResult('win')}>
                    {settling ? '...' : `${t1} Wins — Pay out 2×`}
                  </button>
                  <button className={`${styles.resultBtn} ${styles.lossBtn}`} disabled={settling} onClick={() => settleResult('loss')}>
                    {settling ? '...' : `${t2} Wins`}
                  </button>
                  {hasDraw ? (
                    <button className={`${styles.resultBtn} ${styles.pushBtn}`} disabled={settling} onClick={() => settleResult('push')}>
                      {settling ? '...' : 'Draw'}
                    </button>
                  ) : (
                    <button className={`${styles.resultBtn} ${styles.pushBtn}`} disabled={settling} onClick={() => settleResult('push')}>
                      {settling ? '...' : 'Push / No Contest'}
                    </button>
                  )}
                  <button className={styles.cancelBtn} disabled={settling} onClick={() => setResultModal(null)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <Footer />
    </>
  )
}

function PickRow({ pick, onEdit, onDelete, onSettle }) {
  const time = new Date(pick.game_time).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  return (
    <div className={styles.pickRow}>
      <div className={styles.pickInfo}>
        <div className={styles.pickMeta}>
          <span className={styles.sport}>{pick.sport}</span>
          {pick.is_hot && <span className={styles.hot}>🔥</span>}
          {pick.result && (
            <span className={`${styles.tag} ${pick.result === 'win' ? styles.win : pick.result === 'loss' ? styles.loss : styles.push}`}>
              {pick.result.toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.pickMatchup}>{pick.matchup}</div>
        <div className={styles.pickSub}>{pick.teams} · {time} · {pick.confidence}% confidence</div>
      </div>
      <div className={styles.pickActions}>
        {!pick.result && (
          <button className={styles.settleBtn} onClick={onSettle}>Set Result</button>
        )}
        <button className={styles.editBtn} onClick={onEdit}>Edit</button>
        <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}
