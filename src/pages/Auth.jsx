import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './Auth.module.css'

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth()
  const IPICK_URL = import.meta.env.VITE_IPICK_URL
  const IPICK_KEY = import.meta.env.VITE_IPICK_KEY
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  function switchTab(t) { setSearchParams(t === 'login' ? {} : { tab: t }) }

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState(null)
  const [forgotError, setForgotError] = useState(null)
  const [forgotLoading, setForgotLoading] = useState(false)

  // Signup state
  const [form, setForm] = useState({ fullName: '', displayName: '', email: '', password: '', confirm: '', jcbCard: '' })
  const [cardInfo, setCardInfo] = useState(null)
  const [cardError, setCardError] = useState(null)
  const [cardChecking, setCardChecking] = useState(false)
  const [signupError, setSignupError] = useState(null)
  const [signupLoading, setSignupLoading] = useState(false)

  function setField(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    setLoginLoading(false)
    if (error) setLoginError(error.message)
    else navigate('/dashboard')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotError(null)
    setForgotMsg(null)
    setForgotLoading(true)
    const { error } = await resetPassword(forgotEmail, `${window.location.origin}/reset-password`)
    setForgotLoading(false)
    if (error) setForgotError(error.message)
    else setForgotMsg('Reset link sent — check your email.')
  }

  async function validateCard() {
    if (!form.jcbCard || form.jcbCard.length < 16) return
    setCardError(null)
    setCardInfo(null)
    setCardChecking(true)
    const res = await fetch(`${IPICK_URL}/functions/v1/validate-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': IPICK_KEY, 'Authorization': `Bearer ${IPICK_KEY}` },
      body: JSON.stringify({ card_number: form.jcbCard }),
    })
    const data = await res.json()
    setCardChecking(false)
    if (data.ok && data.account) setCardInfo(data.account)
    else setCardError(data.error ?? 'Card not found or invalid.')
  }

  async function handleSignup(e) {
    e.preventDefault()
    setSignupError(null)
    if (form.password !== form.confirm) { setSignupError('Passwords do not match.'); return }
    if (form.password.length < 8) { setSignupError('Password must be at least 8 characters.'); return }
    setSignupLoading(true)
    const { error } = await signUp(form.email, form.password, {
      fullName: form.fullName,
      displayName: form.displayName || form.fullName,
      jcbCardNumber: form.jcbCard || null,
      jcbAccountNumber: cardInfo?.account_number ?? null,
    })
    setSignupLoading(false)
    if (error) setSignupError(error.message)
    else navigate('/dashboard')
  }

  const heroLabel = tab === 'signup' ? <>Create <span className="gold">Account</span></> : <>Log <span className="gold">In</span></>

  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{heroLabel}</h1>
      </header>

      <section className={styles.section}>
        <div className={styles.authCard}>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`} onClick={() => { switchTab('login'); setShowForgot(false) }}>
              Log In
            </button>
            <button className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`} onClick={() => switchTab('signup')}>
              Sign Up
            </button>
          </div>

          {/* Login panel */}
          {tab === 'login' && !showForgot && (
            <form className={styles.form} onSubmit={handleLogin}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Password</label>
                  <button type="button" className={styles.forgotLink} onClick={() => { setForgotEmail(loginEmail); setShowForgot(true) }}>
                    Forgot password?
                  </button>
                </div>
                <input type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={styles.input} required />
              </div>
              {loginError && <p className={styles.error}>{loginError}</p>}
              <button type="submit" className="btn-primary" disabled={loginLoading} style={{ width: '100%' }}>
                {loginLoading ? 'Logging in...' : 'Log In'}
              </button>
              <p className={styles.switchHint}>
                Don't have an account?{' '}
                <button type="button" className={styles.switchLink} onClick={() => switchTab('signup')}>Sign up</button>
              </p>
            </form>
          )}

          {/* Forgot password panel */}
          {tab === 'login' && showForgot && (
            <div className={styles.form}>
              <div className={styles.field}>
                <div className="section-label" style={{ marginBottom: '4px' }}>Forgot Password</div>
                <p className={styles.formText} style={{ marginBottom: '16px' }}>
                  Enter your email and we'll send a reset link.
                </p>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className={styles.input}
                  autoFocus
                />
              </div>
              {forgotError && <p className={styles.error}>{forgotError}</p>}
              {forgotMsg && <p className={styles.success}>{forgotMsg}</p>}
              {!forgotMsg && (
                <button className="btn-primary" disabled={forgotLoading || !forgotEmail} onClick={handleForgot} style={{ width: '100%' }}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              )}
              <p className={styles.switchHint}>
                <button type="button" className={styles.switchLink} onClick={() => { setShowForgot(false); setForgotMsg(null); setForgotError(null) }}>
                  ← Back to login
                </button>
              </p>
            </div>
          )}

          {/* Signup panel */}
          {tab === 'signup' && (
            <form className={styles.form} onSubmit={handleSignup}>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name</label>
                  <input type="text" placeholder="John Doe" value={form.fullName} onChange={setField('fullName')} className={styles.input} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Display Name</label>
                  <input type="text" placeholder="JohnD (optional)" value={form.displayName} onChange={setField('displayName')} className={styles.input} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={setField('email')} className={styles.input} required />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Password</label>
                  <input type="password" placeholder="Min. 8 characters" value={form.password} onChange={setField('password')} className={styles.input} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirm Password</label>
                  <input type="password" placeholder="••••••••" value={form.confirm} onChange={setField('confirm')} className={styles.input} required />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>JCB Card Number <span style={{ color: 'var(--grey)', fontWeight: 300 }}>(optional)</span></label>
                <div className={styles.cardRow}>
                  <input
                    type="text"
                    placeholder="16-digit card number"
                    value={form.jcbCard}
                    onChange={e => { setField('jcbCard')(e); setCardInfo(null); setCardError(null) }}
                    className={styles.input}
                    maxLength={16}
                  />
                  <button
                    type="button"
                    className={styles.lookupBtn}
                    onClick={validateCard}
                    disabled={cardChecking || form.jcbCard.length < 16}
                  >
                    {cardChecking ? '...' : 'Look up'}
                  </button>
                </div>
                {cardInfo && (
                  <p className={styles.success}>
                    ✓ {cardInfo.owner_name} — Ɉ{Number(cardInfo.balance).toFixed(2)} ({cardInfo.account_number})
                  </p>
                )}
                {cardError && <p className={styles.error}>{cardError}</p>}
              </div>

              {signupError && <p className={styles.error}>{signupError}</p>}
              <button type="submit" className="btn-primary" disabled={signupLoading} style={{ width: '100%' }}>
                {signupLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className={styles.switchHint}>
                Already have an account?{' '}
                <button type="button" className={styles.switchLink} onClick={() => switchTab('login')}>Log in</button>
              </p>
            </form>
          )}

        </div>
      </section>

      <Footer />
    </>
  )
}
