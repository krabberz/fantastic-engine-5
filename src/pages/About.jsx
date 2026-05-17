import Nav from '../components/Nav'
import Footer from '../components/Footer'
import styles from './About.module.css'

export default function About() {
  return (
    <>
      <Nav />
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>About <span className="gold">Jollar Picks</span></h1>
      </header>

      <section className={styles.section}>
        <div className={styles.grid}>
          <div>
            <div className="section-label">Who We Are</div>
            <h2 className={styles.subTitle}>Built For <span className="gold">Jollarians</span></h2>
            <p className={styles.text}>
              Jollar Picks is Jollaria's premier sports prediction platform, built by citizens for citizens.
              We believe sports are more fun when you have skin in the game — even if that skin is made of Jollars.
            </p>
            <p className={styles.text} style={{ marginTop: '20px' }}>
              Every week we post picks across the biggest leagues in the world. Use your Jollars to back your predictions
              and compete in your league against other Jollarians.
            </p>
          </div>
          <div>
            <div className="section-label">How It Works</div>
            <h2 className={styles.subTitle}>The <span className="gold">System</span></h2>
            <p className={styles.text}>
              Our picks come with confidence ratings and real odds. You pick your outcomes before the 6-hour cutoff,
              place your Jollars, and check back after the game for results.
            </p>
            <p className={styles.text} style={{ marginTop: '20px' }}>
              Winnings are deposited directly to your National Bank of Jollaria account. All transactions are processed
              via the Jollar Central Bank API.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.teamSection}>
        <div className="section-label">The Team</div>
        <h2 className="section-title">Behind <span className="gold">JPIX</span></h2>
        <div className={styles.teamGrid}>
          <div className={styles.teamCard}>
            <div className={styles.teamAvatar}>TS</div>
            <div className={styles.teamRole}>Founder, Chairman &amp; Commissioner</div>
            <div className={styles.teamName}>Tristan Stubbs</div>
          </div>
          <div className={styles.teamCard}>
            <div className={styles.teamAvatar}>JP</div>
            <div className={styles.teamRole}>Web Developer</div>
            <div className={styles.teamName}>JP</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
