import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Nav.module.css'

export default function Nav() {
  const { user, profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        Jollar<span className={styles.logoSlash}> /</span> Picks
      </Link>
      <ul className={styles.links}>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/picks">Picks</Link></li>
        <li><Link to="/leagues">Leagues</Link></li>
        {user && <li><Link to="/dashboard">Dashboard</Link></li>}
        {isAdmin && <li><Link to="/admin">Admin</Link></li>}
      </ul>
      {user ? (
        <button className={styles.cta} onClick={handleSignOut}>Sign Out</button>
      ) : (
        <Link to="/login"><button className={styles.cta}>Join Now</button></Link>
      )}
    </nav>
  )
}
