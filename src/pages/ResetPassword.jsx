import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Auth.module.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Supabase redirects here with the session in the URL hash.
    // onAuthStateChange fires with event PASSWORD_RECOVERY once the hash is parsed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) setError(updateError.message)
    else setSuccess(true)
  }

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Reset <span className="gold">Password</span></h1>
      </header>

      <section className={styles.section}>
        <div className={styles.authCard}>
          {success ? (
            <div className={styles.successBox}>
              <div className="section-label">Done</div>
              <h2 className={styles.formTitle}>Password <span className="gold">Updated</span></h2>
              <p className={styles.formText}>Your password has been changed. You can now log in with your new password.</p>
              <button className="btn-primary" style={{ marginTop: '28px' }} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          ) : !ready ? (
            <div className={styles.form}>
              <p className={styles.formText}>Verifying your reset link...</p>
              <p className={styles.formText} style={{ marginTop: '8px', fontSize: '13px', opacity: 0.6 }}>
                If nothing happens, the link may have expired.{' '}
                <button type="button" className={styles.switchLink} onClick={() => navigate('/login')}>Request a new one</button>.
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className="section-label">Set New Password</div>
              <div className={styles.field}>
                <label className={styles.label}>New Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
