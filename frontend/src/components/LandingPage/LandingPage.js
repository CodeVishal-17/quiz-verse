import { Link } from 'react-router-dom';
import KbcStageFx from '../KbcStageFx/KbcStageFx';
import './LandingPage.css';

const SYMBOLS = {
  triangle: '\u25B3',
  circle: '\u25CB',
  square: '\u25A1',
  sword: '\u2694',
  block: '\u25B0',
  diamond: '\u25C7',
  wave: '\u2301',
  ring: '\u25CC',
  panel: '\u25A3',
  filledTriangle: '\u25B2',
  window: '\u232C',
  dot: '\u00B7',
};

function LandingPage() {
  const systemCards = [
    {
      symbol: SYMBOLS.triangle,
      value: '3',
      label: 'Lifelines',
      detail: '50:50, Audience Poll, Switch Question.',
      tone: 'pink',
    },
    {
      symbol: SYMBOLS.circle,
      value: '1',
      label: 'Hotseat',
      detail: 'The ultimate stage of survival.',
      tone: 'mint',
    },
    {
      symbol: SYMBOLS.square,
      value: '1',
      label: 'Codepati',
      detail: 'One player rises above all to win the grand title.',
      tone: 'cream',
    },
  ];

  const featureCards = [
    {
      icon: SYMBOLS.sword,
      title: 'Monthly Campus Battles',
      text: 'Compete against the brightest minds from every school in intense monthly showdowns built around speed, accuracy, and survival under pressure.',
      className: 'card-battles',
    },
    {
      icon: SYMBOLS.block,
      title: 'Live Rankings',
      text: 'Track score movement as the arena updates in real time. Every correct answer, streak, and response window changes the broadcast board.',
      className: 'card-rankings',
    },
    {
      icon: SYMBOLS.diamond,
      title: 'Final Round Access',
      text: 'Only the strongest contenders secure access to the final survival stage where the title is decided.',
      className: 'card-access',
    },
    {
      icon: SYMBOLS.wave,
      title: 'Fastest Finger First',
      text: 'Lightning rounds reward sharp recall and clean timing before the main survival ladder opens.',
      className: 'card-finger',
    },
    {
      icon: SYMBOLS.ring,
      title: 'Live Match Updates',
      text: 'Arena panels surface active rounds, score pulses, and qualification movement as the battle unfolds.',
      className: 'card-updates',
    },
    {
      icon: SYMBOLS.panel,
      title: 'Qualification Status',
      text: 'Know exactly when your run crosses from contender to finalist with visible zone progress.',
      className: 'card-status',
    },
    {
      icon: SYMBOLS.filledTriangle,
      title: 'Top Schools',
      text: 'Campus-wide school boards spotlight the strongest departments across every monthly event.',
      className: 'card-schools',
    },
    {
      icon: SYMBOLS.square,
      title: 'Branch Rankings',
      text: 'Branch-specific leaderboards keep rivalries sharp and make every cohort visible in the system.',
      className: 'card-branches',
    },
    {
      icon: SYMBOLS.window,
      title: 'Final Access Window',
      text: 'A limited entry window opens for qualified players before the final arena locks.',
      className: 'card-window',
    },
  ];

  const schoolLine = (school, year) => `${school} ${SYMBOLS.dot} ${year}`;

  return (
    <main className="landing-page kbc-broadcast">
      <div className="landing-background">
        <KbcStageFx />
        <div className="bg-shape shape-pink" />
        <div className="bg-shape shape-mint" />
      </div>

      <section className="landing-hero-section">
        <div className="kbc-hero-frame" aria-hidden="true" />
        <div className="landing-container">
          <div className="landing-content">
            <div className="content-badge">
              <span className="badge-pulse" />
              ROUND ACCESS NOW OPEN
            </div>

            <h1 className="landing-title kbc-title-shimmer">QuizVerse</h1>

            <div className="landing-description">
              <p className="desc-highlight">Monthly campus challenge.</p>
              <p className="desc-main">
                The ultimate campus quiz arena — inspired by Kaun Banega Codepati. Compete live, climb the ladder, claim the title.
              </p>
            </div>

            <div className="landing-actions">
              <Link to="/login" className="btn-action btn-enter">
                <span className="btn-icon">{SYMBOLS.triangle}</span>
                ENTER SYSTEM
              </Link>
            </div>

            <div className="landing-mantra" aria-label="Compete. Qualify. Conquer.">
              <span className="mantra-line mantra-compete" data-text="Compete.">Compete.</span>
              <span className="mantra-line mantra-qualify" data-text="Qualify.">Qualify.</span>
              <span className="mantra-line mantra-conquer" data-text="Conquer.">Conquer.</span>
              <div className="mantra-scan">
                <span>{SYMBOLS.triangle}</span>
                <span>{SYMBOLS.circle}</span>
                <span>{SYMBOLS.square}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-flashcards-section">
        <div className="flashcards-container">
          <div className="flashcards-header">
            <h2>SYSTEM PARAMETERS</h2>
            <p>Understand the rules of the arena.</p>
          </div>

          <div className="system-cards-grid">
            {systemCards.map((card) => (
              <button className={`flashcard flip-card-container system-card system-${card.tone}`} key={card.label}>
                <span className="system-card-orbit">{card.symbol}</span>
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="front-symbols">
                      <span>{card.symbol}</span>
                    </div>
                    <div className="front-value">{card.value}</div>
                    <div className="front-label">{card.label}</div>
                  </div>
                  <div className="flip-card-back">
                    <div className="back-symbol">{card.symbol}</div>
                    <h3>{card.value} {card.label}</h3>
                    <p>{card.detail}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flashcards-grid">
            {featureCards.map((card) => (
              <article className={`flashcard normal-card ${card.className}`} key={card.title}>
                <div className="card-topline">
                  <div className="card-icon">{card.icon}</div>
                  <span>LIVE MODULE</span>
                </div>
                <h3>{card.title}</h3>
                <div className="card-copy">
                  <p>{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
