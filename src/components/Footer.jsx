import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <>
      <footer className={styles.footer}>
        <div>
          <div className={styles.logo}>Jollar Picks</div>
          <p className={styles.desc}>Premium sports predictions by Jollarians for Jollarians. Trusted by citizens across Jollaria.</p>
        </div>
        <div>
          <div className={styles.colTitle}>Picks</div>
          <ul className={styles.links}>
            <li><Link to="/leagues">This Week's Leagues</Link></li>
            <li><Link to="/picks">See All Sports</Link></li>
          </ul>
        </div>
        <div>
          <div className={styles.colTitle}>Company</div>
          <ul className={styles.links}>
            <li><Link to="/about">Our Background</Link></li>
            <li><Link to="/about">How We Do It</Link></li>
          </ul>
        </div>
        <div>
          <div className={styles.colTitle}>Account</div>
          <ul className={styles.links}>
            <li><Link to="/login">Sign Up</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="#">FAQ &amp; Support</Link></li>
          </ul>
        </div>
      </footer>
      <div className={styles.bottom}>
        <span>© 2026 Jollar Picks. All rights reserved.</span>
        <span>Jollars are not directly nor indirectly exchangeable for any real macronational currency. Legal age and up only.</span>
      </div>
    </>
  )
}
