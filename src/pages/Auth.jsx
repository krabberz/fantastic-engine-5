import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Auth.module.css'

export default function Auth() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Sign Up <span className="gold">&amp;</span> Log In
        </h1>
      </header>

      <section className={styles.section}>
        <div className={styles.grid}>
          {/* Sign up */}
          <div className="reveal">
            <div className="section-label">No Account?</div>
            <h2 className={styles.formTitle}>Sign <span className="gold">Up</span></h2>
            <p className={styles.formText}>
              To use Jollar Picks you need a Jollarian Federation account with the National Bank of Jollaria.
              If you don't have one yet,{' '}
              <a
                href="https://forms.gle/dnWuR5BHzLUS8qCSA"
                target="_blank"
                rel="noreferrer"
                className={styles.link}
              >
                apply here
              </a>.
            </p>
            <p className={styles.formText} style={{ marginTop: '16px' }}>
              Once your account is active, return here to log in with your Jollarian Federation credentials.
            </p>
          </div>

          {/* Login */}
          <div className={styles.loginBox}>
            <div className="section-label">Have an Account?</div>
            <h2 className={styles.formTitle}>Log <span className="gold">In</span></h2>
            <form className={styles.form} onSubmit={handleLogin}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
