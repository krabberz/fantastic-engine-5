import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Auth.module.css'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', displayName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error: signUpError } = await signUp(form.email, form.password, {
      fullName: form.fullName,
      displayName: form.displayName || form.fullName,
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Create <span className="gold">Account</span>
        </h1>
      </header>

      <section className={styles.section}>
        <div className={styles.signupWrap}>

          {success ? (
            <div className={styles.successBox}>
              <div className="section-label">You're in</div>
              <h2 className={styles.formTitle}>Check Your <span className="gold">Email</span></h2>
              <p className={styles.formText}>
                We sent a confirmation link to <strong style={{ color: 'var(--gold)' }}>{form.email}</strong>.
                Click it to activate your account, then come back to log in.
              </p>
              <p className={styles.formText} style={{ marginTop: '16px' }}>
                Note: a Jollarian bank account is required to place bets. If you don't have one,{' '}
                <a href="https://forms.gle/dnWuR5BHzLUS8qCSA" target="_blank" rel="noreferrer" className={styles.link}>
                  apply at the National Bank of Jollaria
                </a>.
              </p>
              <Link to="/login">
                <button className="btn-primary" style={{ marginTop: '32px' }}>Go to Login</button>
              </Link>
            </div>
          ) : (
            <div className={styles.signupBox}>
              <div className="section-label">New to Jollar Picks?</div>
              <h2 className={styles.formTitle}>Sign <span className="gold">Up</span></h2>

              <form className={styles.form} onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={set('fullName')}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Display Name</label>
                    <input
                      type="text"
                      placeholder="JohnD (optional)"
                      value={form.displayName}
                      onChange={set('displayName')}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set('email')}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Password</label>
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={set('password')}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={set('confirm')}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <p className={styles.formText} style={{ fontSize: '13px', marginTop: '4px' }}>
                  Already have an account?{' '}
                  <Link to="/login" className={styles.link}>Log in</Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
