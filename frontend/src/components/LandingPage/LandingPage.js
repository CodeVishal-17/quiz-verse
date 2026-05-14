import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-background" aria-hidden="true">
        <span className="particle particle-a" />
        <span className="particle particle-b" />
        <span className="particle particle-c" />
        <span className="floating-card floating-card-one">VS</span>
        <span className="floating-card floating-card-two">?</span>
        <span className="floating-icon floating-icon-bolt">Q</span>
        <span className="floating-icon floating-icon-star">★</span>
      </div>

      <nav className="landing-nav">
        <div className="brand-wrap">
          <div className="brand-logo" aria-hidden="true">ITM</div>
          <div>
            <p className="brand-name">QuizVerse</p>
            <p className="brand-subtitle">ITM University Gwalior</p>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#events">Events</a>
          <a href="#leaderboard">Leaderboard</a>
        </div>

        <div className="nav-actions">
          <Link className="nav-button nav-login" to="/login">
            Login
          </Link>
          <Link className="nav-button nav-register" to="/register">
            Register
          </Link>
        </div>
      </nav>

      <section className="hero-section" id="home">
        <div className="hero-copy">
          <span className="hero-tag">Campus Quiz Arena</span>
          <h1>QuizVerse</h1>
          <p className="hero-headline">Enter The Ultimate Campus Quiz Arena</p>
          <p className="hero-description">
            Monthly campus quiz battles with multi-round competitions, branch-wise qualifiers,
            championship format, and the fiercest student engagement across ITM University.
          </p>

          <div className="hero-cta">
            <Link className="hero-button hero-register" to="/register">
              Register Now
            </Link>
            <Link className="hero-button hero-login" to="/login">
              Login
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-frame">
            <div className="hero-glow" />
            <div className="hero-card hero-card-main">
              <span className="card-label">Next Battle</span>
              <strong>Inter-branch Speed Quiz</strong>
              <p>Qualifiers in 4 branches. Only one champion stands tall.</p>
            </div>
            <div className="hero-card hero-card-side">Monthly Prize Pool</div>
            <div className="hero-card hero-card-small">Fastest Finger</div>
          </div>
        </div>
      </section>

      <section className="highlights-section" id="leaderboard">
        <div className="section-intro">
          <span className="section-tag">Competition Highlights</span>
          <h2>What makes QuizVerse the arena to win</h2>
        </div>

        <div className="highlight-grid">
          <article className="highlight-card">
            <p>3 Rounds</p>
            <strong>Qualify, Battle, Conquer</strong>
          </article>
          <article className="highlight-card">
            <p>Branch Qualifiers</p>
            <strong>School-based matchups</strong>
          </article>
          <article className="highlight-card">
            <p>Fastest Finger First</p>
            <strong>Lightning speed rounds</strong>
          </article>
          <article className="highlight-card">
            <p>Champion Title</p>
            <strong>Only one winner survives</strong>
          </article>
          <article className="highlight-card">
            <p>Monthly Prize Pool</p>
            <strong>Rewards for top performers</strong>
          </article>
        </div>
      </section>

      <section className="event-section" id="events">
        <div className="section-intro">
          <span className="section-tag">Upcoming Event</span>
          <h2>Next quiz season is charging up</h2>
        </div>

        <div className="event-panel">
          <div className="event-info">
            <p className="event-title">ITM QuizVerse Arena Showdown</p>
            <div className="event-metrics">
              <div>
                <span>Registration opens</span>
                <strong>20 May</strong>
              </div>
              <div>
                <span>Quiz date</span>
                <strong>28 May</strong>
              </div>
              <div>
                <span>Prize pool</span>
                <strong>₹35,000</strong>
              </div>
            </div>
          </div>

          <div className="event-countdown">
            <p className="countdown-label">Countdown to battle</p>
            <div className="countdown-grid">
              <div>
                <span>05</span>
                <small>Days</small>
              </div>
              <div>
                <span>12</span>
                <small>Hours</small>
              </div>
              <div>
                <span>38</span>
                <small>Minutes</small>
              </div>
              <div>
                <span>21</span>
                <small>Seconds</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="section-intro">
          <span className="section-tag">About QuizVerse</span>
          <h2>Interactive, competitive, and built for ITM students</h2>
        </div>

        <div className="about-grid">
          <div className="about-card">
            <h3>Open to all branches</h3>
            <p>Students from different schools and streams compete on a level playing field.</p>
          </div>
          <div className="about-card">
            <h3>Multi-stage elimination</h3>
            <p>From qualifiers to finals, every round raises the stakes for top contenders.</p>
          </div>
          <div className="about-card">
            <h3>Immersive quiz format</h3>
            <p>Engaging rounds, real-time scoring, and dynamic quiz challenges make every match intense.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <p className="footer-brand">QuizVerse</p>
          <p>ITM University Gwalior</p>
        </div>
        <div className="footer-social">
          <span>Socials</span>
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
        <p className="footer-copy">© 2026 QuizVerse. Built for ITM University Gwalior.</p>
      </footer>
    </main>
  );
}

export default LandingPage;
