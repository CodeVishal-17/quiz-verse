import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

const SYMBOLS = {
  triangle: '\u25B3',
  circle: '\u25CB',
  square: '\u25A1',
  diamond: '\u25C7',
  dot: '\u00B7',
  gear: '\u2699',
  bell: '\u25CC',
  moon: '\u25D0',
  sun: '\u2609',
  exit: '\u21B3',
  check: '\u2713',
  upload: '\u2191',
};

function DashboardPage() {
  const [theme, setTheme] = useState(() => localStorage.getItem('quizverse-theme') || 'dark');
  const [profileImage, setProfileImage] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [coreOffset, setCoreOffset] = useState({ x: 0, y: 0 });

  const isLight = theme === 'light';
  const student = {
    name: 'Lyn',
    school: 'SOET',
    branch: 'AIML',
    year: '2nd Year',
    status: 'Competition Ready',
    lastBadge: 'QUALIFIER',
  };

  const navigation = [
    { label: 'Dashboard', symbol: SYMBOLS.square, active: true },
    { label: 'Registered Quizzes', symbol: SYMBOLS.triangle },
    { label: 'Upcoming Quizzes / Notices', symbol: SYMBOLS.diamond },
    { label: 'Payments & History', symbol: SYMBOLS.circle },
  ];

  const registeredQuizzes = [
    {
      title: 'AI Battle Week',
      meta: 'Inter-School Qualifiers',
      status: 'Registered',
      payment: 'Payment Confirmed',
      round: 'Briefing unlocks tomorrow',
      date: 'May 18, 2026 - 6:00 PM',
      description: 'A school-wide quiz sprint focused on AI fundamentals, applied reasoning, and fast recall.',
      structure: 'Qualifier > Survival Round > Final Access Window',
      instructions: 'Keep your student email active. Briefing materials unlock before the qualifier window opens.',
      qualification: 'Top qualifying scores move into the Survival Round.',
      tone: 'mint',
    },
    {
      title: 'Code Recall Sprint',
      meta: 'Department Trial',
      status: 'Briefing Soon',
      payment: 'No fee required',
      round: 'Qualifier round scheduled',
      date: 'May 24, 2026 - 4:30 PM',
      description: 'A department-level recall challenge built around syntax, logic traces, and output prediction.',
      structure: 'Fastest Finger First > Department Qualifier',
      instructions: 'Review language basics and arrive five minutes before the entry window opens.',
      qualification: 'FFF qualified students receive direct qualifier access.',
      tone: 'pink',
    },
    {
      title: 'Logic Ladder',
      meta: 'Previous Event',
      status: 'Entry Locked',
      payment: 'Receipt archived',
      round: 'Reached Round 3',
      date: 'May 02, 2026 - Archived',
      description: 'A completed reasoning ladder event covering puzzles, patterns, and elimination rounds.',
      structure: 'Qualifier > Round 1 > Round 2 > Round 3',
      instructions: 'Archived event. Results and receipt remain available for review.',
      qualification: 'Round 3 reached. Finalist access was missed by one segment.',
      tone: 'cream',
    },
  ];

  const briefings = [
    { label: 'AI Battle Week', value: 'Briefing unlocks tomorrow' },
    { label: 'Payment Desk', value: 'Receipt synced' },
    { label: 'Notice Board', value: '2 competition updates' },
  ];

  const linePoints = '0,52 34,44 68,48 102,28 136,34 170,18 204,24 238,12';

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProfileImage(URL.createObjectURL(file));
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('quizverse-theme', theme);
  }, [theme]);

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 28;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 28;

    setCoreOffset({ x, y });
  };

  return (
    <main
      className={`dashboard-page ${isLight ? 'theme-light' : 'theme-dark'}`}
      style={{ '--core-x': `${coreOffset.x}px`, '--core-y': `${coreOffset.y}px` }}
      onPointerMove={handlePointerMove}
    >
      <div className="dashboard-background" aria-hidden="true">
        <div className="ambient-core">
          <div className="ambient-core-ring ambient-ring-one" />
          <div className="ambient-core-ring ambient-ring-two" />
          <div className="ambient-core-ring ambient-ring-three" />
          <span>{SYMBOLS.triangle}</span>
          <i className="ambient-core-particle ambient-particle-one">{SYMBOLS.square}</i>
          <i className="ambient-core-particle ambient-particle-two">{SYMBOLS.circle}</i>
          <i className="ambient-core-particle ambient-particle-three">{SYMBOLS.diamond}</i>
        </div>
        <div className="dashboard-orb orb-pink" />
        <div className="dashboard-orb orb-mint" />
        <div className="dashboard-orb orb-cyan" />
        <div className="dashboard-grid" />
        <div className="dashboard-particles" />
        <span className="dash-env-symbol dash-symbol-triangle">{SYMBOLS.triangle}</span>
        <span className="dash-env-symbol dash-symbol-circle">{SYMBOLS.circle}</span>
        <span className="dash-env-symbol dash-symbol-square">{SYMBOLS.square}</span>
        <span className="dash-env-symbol dash-symbol-diamond">{SYMBOLS.diamond}</span>
        <div className="dash-field field-one" />
        <div className="dash-field field-two" />
      </div>

      <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
        <Link className="dashboard-brand" to="/">
          <span>{SYMBOLS.triangle}</span>
          QuizVerse
        </Link>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button className={`sidebar-item ${item.active ? 'active' : ''}`} key={item.label} type="button">
              <span className="sidebar-icon">{item.symbol}</span>
              <span className="sidebar-label">{item.label}</span>
              <span className="sidebar-hover-symbol">{item.symbol}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>{SYMBOLS.circle}</span>
          <p>Workspace mode active</p>
        </div>
      </aside>

      <section className="dashboard-shell">
        <header className="dashboard-topbar">
          <div>
            <p className="welcome-kicker">Welcome back, {student.name}</p>
            <h1>{student.school} {SYMBOLS.dot} {student.branch} {SYMBOLS.dot} {student.year}</h1>
          </div>

          <div className="topbar-actions" aria-label="Dashboard utilities">
            <button
              className="theme-toggle"
              type="button"
              title="Dark or light mode"
              aria-pressed={isLight}
              onClick={toggleTheme}
            >
              <span>{isLight ? SYMBOLS.sun : SYMBOLS.moon}</span>
            </button>
            <button type="button" title="Notifications">{SYMBOLS.bell}</button>
            <button type="button" title="Settings">{SYMBOLS.gear}</button>
            <Link to="/login" title="Logout">{SYMBOLS.exit}</Link>
          </div>
        </header>

        <section className="dashboard-intro-grid">
          <article className="profile-module tilt-card">
            <div className="profile-photo-wrap">
              <div className="profile-orbit" />
              <div className="profile-photo">
                {profileImage ? (
                  <img src={profileImage} alt={`${student.name} profile preview`} />
                ) : (
                  <span>{student.name.slice(0, 1)}</span>
                )}
              </div>
              <label className="profile-upload">
                <input accept="image/*" type="file" onChange={handleImageUpload} />
                <span>{SYMBOLS.upload}</span>
              </label>
            </div>

            <div className="profile-copy">
              <span className="module-kicker">Student Identity</span>
              <h2>{student.name} Sharma</h2>
              <p>{student.school} {SYMBOLS.dot} {student.branch} {SYMBOLS.dot} {student.year}</p>
              <div className="profile-status-row">
                <span>{student.status}</span>
              </div>
            </div>

            <div className="last-badge-card" aria-label="Last badge earned">
              <span>Last Badge Earned</span>
              <strong>{student.lastBadge}</strong>
            </div>
          </article>

          <article className="event-hero tilt-card">
            <div className="event-copy">
              <span className="event-status">Registration Opens Tomorrow</span>
              <h2>AI Battle Week</h2>
              <p>Inter-School Qualifiers are preparing your next competition window.</p>
              <div className="hero-chips">
                <span>Briefing Mode</span>
                <span>Payment Clear</span>
                <span>Seat Queue Ready</span>
              </div>
            </div>

            <div className="event-visual-stack" aria-hidden="true">
              <span>{SYMBOLS.triangle}</span>
              <span>{SYMBOLS.circle}</span>
              <span>{SYMBOLS.square}</span>
            </div>
          </article>
        </section>

        <section className="visual-grid">
          <article className="insight-panel qualification-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.circle}</span>
              <h2>Qualification Rate</h2>
            </div>
            <div className="radial-widget" style={{ '--progress': 82 }}>
              <div>
                <strong>82%</strong>
                <span>Ready</span>
              </div>
            </div>
          </article>

          <article className="insight-panel accuracy-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.diamond}</span>
              <h2>Quiz Accuracy</h2>
            </div>
            <svg className="line-graph" viewBox="0 0 238 70" role="img" aria-label="Quiz accuracy trend">
              <path className="graph-fill" d={`${linePoints} 238,70 0,70 Z`} />
              <polyline points={linePoints} />
            </svg>
            <div className="graph-meta">
              <strong>86%</strong>
              <span>Average accuracy</span>
            </div>
          </article>

          <article className="insight-panel rounds-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.square}</span>
              <h2>Rounds Cleared</h2>
            </div>
            <div className="segment-tracker" aria-label="Rounds cleared tracker">
              <span className="cleared">Q</span>
              <span className="cleared">R1</span>
              <span className="cleared">R2</span>
              <span className="active">R3</span>
              <span>Final</span>
            </div>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="registered-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.triangle}</span>
              <h2>Registered Quizzes</h2>
            </div>

            <div className="registered-list">
              {registeredQuizzes.map((quiz) => (
                <button
                  className={`registered-card registered-${quiz.tone}`}
                  key={quiz.title}
                  type="button"
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <div>
                    <h3>{quiz.title}</h3>
                    <p>{quiz.meta}</p>
                  </div>
                  <div className="registered-status">
                    <span>{SYMBOLS.check} {quiz.status}</span>
                    <small>{quiz.payment}</small>
                    <em>{quiz.round}</em>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="briefings-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.diamond}</span>
              <h2>Match Briefings</h2>
            </div>
            <div className="briefing-stack">
              {briefings.map((briefing) => (
                <div key={briefing.label}>
                  <span>{briefing.label}</span>
                  <strong>{briefing.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>

      <aside className={`quiz-detail-drawer ${selectedQuiz ? 'open' : ''}`} aria-hidden={!selectedQuiz}>
        {selectedQuiz && (
          <>
            <button className="drawer-close" type="button" onClick={() => setSelectedQuiz(null)}>x</button>
            <span className="module-kicker">Quiz Detail</span>
            <h2>{selectedQuiz.title}</h2>
            <p>{selectedQuiz.description}</p>

            <div className="drawer-detail-grid">
              <div>
                <span>Event</span>
                <strong>{selectedQuiz.meta}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedQuiz.status}</strong>
              </div>
              <div>
                <span>Date / Time</span>
                <strong>{selectedQuiz.date}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{selectedQuiz.payment}</strong>
              </div>
            </div>

            <div className="drawer-section">
              <span>Round Structure</span>
              <p>{selectedQuiz.structure}</p>
            </div>
            <div className="drawer-section">
              <span>Instructions</span>
              <p>{selectedQuiz.instructions}</p>
            </div>
            <div className="drawer-section">
              <span>Qualification Details</span>
              <p>{selectedQuiz.qualification}</p>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}

export default DashboardPage;
