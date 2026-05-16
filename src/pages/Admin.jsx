import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Admin.module.css'

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'NCAAF', 'NCAAB', 'Bundesliga', 'EPL', 'MLS', 'Other']

const BLANK_PICK = { sport: 'NBA', matchup: '', teams: '', odds: '', game_time: '', confidence: 70, is_hot: false }

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

  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return
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

  function openAdd() {
    setEditPick(null)
    setForm(BLANK_PICK)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(pick) {
    setEditPick(pick)
    setForm({
      sport: pick.sport,
      matchup: pick.matchup,
      teams: pick.teams,
      odds: pick.odds ?? '',
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
    if (!form.matchup || !form.teams || !form.game_time) {
      setFormError('Matchup, teams, and game time are required.')
      return
    }
    setSaving(true)
    const payload = {
      sport: form.sport,
      matchup: form.matchup,
      teams: form.teams,
      odds: form.odds || null,
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
  if (profile.role !== 'admin') return <Navigate to="/" replace />

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
          <button className={`${styles.tab} ${tab === 'picks' ? styles.tabActive : ''}`} onClick={() => setTab('picks')}>Picks</button>
          <button className={`${styles.tab} ${tab === 'bets' ? styles.tabActive : ''}`} onClick={() => { setTab('bets'); if (!allBets.length) loadBets() }}>All Bets</button>
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
                  <span>Ɉ{Number(bet.amount).toFixed(2)}</span>
                  <span className={`${styles.tag} ${bet.result === 'win' ? styles.win : bet.result === 'loss' ? styles.loss : bet.result === 'push' ? styles.push : styles.pending}`}>
                    {bet.result ?? 'pending'}
                  </span>
                  <span>{bet.payout ? `Ɉ${Number(bet.payout).toFixed(2)}` : '—'}</span>
                </div>
              ))}
            </div>
          )
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
                  <label className={styles.label}>Odds</label>
                  <input type="text" placeholder="-205" value={form.odds} onChange={setF('odds')} className={styles.input} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Matchup</label>
                <input type="text" placeholder="Spurs -205" value={form.matchup} onChange={setF('matchup')} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Teams</label>
                <input type="text" placeholder="San Antonio vs Minnesota" value={form.teams} onChange={setF('teams')} className={styles.input} required />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Game Time</label>
                  <input type="datetime-local" value={form.game_time} onChange={setF('game_time')} className={styles.input} required />
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
      {resultModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && !settling && setResultModal(null)}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Set Result</h2>
            <p className={styles.modalSub}>{resultModal.matchup} — {resultModal.teams}</p>
            {settleMsg ? (
              <>
                <p className={styles.settleMsg}>{settleMsg}</p>
                <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setResultModal(null)}>Close</button>
              </>
            ) : (
              <div className={styles.resultBtns}>
                <button className={`${styles.resultBtn} ${styles.winBtn}`} disabled={settling} onClick={() => settleResult('win')}>
                  {settling ? '...' : 'WIN — Pay out 2×'}
                </button>
                <button className={`${styles.resultBtn} ${styles.lossBtn}`} disabled={settling} onClick={() => settleResult('loss')}>
                  {settling ? '...' : 'LOSS'}
                </button>
                <button className={`${styles.resultBtn} ${styles.pushBtn}`} disabled={settling} onClick={() => settleResult('push')}>
                  {settling ? '...' : 'PUSH'}
                </button>
                <button className={styles.cancelBtn} disabled={settling} onClick={() => setResultModal(null)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

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
