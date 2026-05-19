import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthSession } from '../../api/auth';
import { getPublishedQuizzes, getMyRegistrations, registerForQuiz, processMockPayment } from '../../api/quizzes';
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
  const [publishedQuizzes, setPublishedQuizzes] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isLight = theme === 'light';
  
  const session = getAuthSession();
  const studentData = session?.student || {};
  const student = {
    name: studentData.full_name || 'Student',
    school: studentData.school_name || 'School',
    branch: studentData.branch_name || 'Branch',
    year: studentData.year ? `${studentData.year} Year` : 'Year',
    status: 'Competition Ready',
    lastBadge: studentData.last_badge || 'QUALIFIER',
  };

  const navigation = [
    { label: 'Dashboard', symbol: SYMBOLS.square, active: true },
    { label: 'Registered Quizzes', symbol: SYMBOLS.triangle },
    { label: 'Upcoming Quizzes / Notices', symbol: SYMBOLS.diamond },
    { label: 'Payments & History', symbol: SYMBOLS.circle },
  ];

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = session?.token;
      if (!token) return;

      const [quizzesData, registrationsData] = await Promise.all([
        getPublishedQuizzes(token),
        getMyRegistrations(token)
      ]);

      setPublishedQuizzes(quizzesData);
      setMyRegistrations(registrationsData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Live synchronization: re-fetch published quizzes and registrations every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (quizId) => {
    try {
      setActionLoading(true);
      setError('');
      await registerForQuiz(quizId, session?.token);
      await fetchDashboardData();
      // Keep drawer open, update selected object if needed or close it
      const updatedQuiz = publishedQuizzes.find(q => q.id === quizId);
      setSelectedQuiz(updatedQuiz);
    } catch (err) {
      setError(err.data?.detail || 'Failed to register.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMockPayment = async (quizId) => {
    try {
      setActionLoading(true);
      setError('');
      await processMockPayment(quizId, session?.token);
      await fetchDashboardData();
    } catch (err) {
      setError(err.data?.detail || 'Payment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileImage(URL.createObjectURL(file));
  };

  const linePoints = '0,52 34,44 68,48 102,28 136,34 170,18 204,24 238,12';

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
              <h2>{student.name}</h2>
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
              <span className="event-status">Active Quizzes</span>
              <h2>Available Events</h2>
              <p>Select a published event to view details and register.</p>
              
              {loading ? (
                <div className="hero-chips"><span>Initializing arena scanner...</span></div>
              ) : publishedQuizzes.length === 0 ? (
                <p style={{marginTop: '1rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic'}}>
                  No competition windows are currently open.<br/>
                  Await the next arena activation.
                </p>
              ) : (
                <div className="hero-chips">
                  {publishedQuizzes.map(quiz => (
                    <button 
                      key={quiz.id} 
                      className="dash-chip-btn" 
                      onClick={() => setSelectedQuiz(quiz)}
                    >
                      {quiz.title} ({quiz.registered_count} joined)
                    </button>
                  ))}
                </div>
              )}
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
            <div style={{marginTop: 'auto', padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
              Performance analytics unlock after first completed quiz.
            </div>
          </article>

          <article className="insight-panel accuracy-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.diamond}</span>
              <h2>Quiz Accuracy</h2>
            </div>
            <div style={{marginTop: 'auto', padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
              Accuracy tracking activates once participation begins.
            </div>
          </article>

          <article className="insight-panel rounds-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.square}</span>
              <h2>Rounds Cleared</h2>
            </div>
            <div style={{marginTop: 'auto', padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
              No competition rounds completed yet.
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
              {loading ? (
                <p style={{color: 'var(--dash-muted)', padding: '1rem'}}>Scanning participation logs...</p>
              ) : myRegistrations.length === 0 ? (
                <p style={{color: 'var(--dash-muted)', padding: '1rem'}}>No participation records found in this sector.</p>
              ) : (
                myRegistrations.map((reg) => (
                  <button
                    className={`registered-card registered-mint`}
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedQuiz(reg.quiz_details)}
                  >
                    <div>
                      <h3>{reg.quiz_details?.title}</h3>
                      <p>{reg.player_id || 'ID Pending'}</p>
                    </div>
                    <div className="registered-status">
                      <span>{SYMBOLS.check} {reg.quiz_details?.status.replace('_', ' ')}</span>
                      <small>Payment: {reg.payment_status}</small>
                      <em>Registered: {new Date(reg.registered_at).toLocaleDateString()}</em>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="briefings-panel tilt-card">
            <div className="panel-heading">
              <span>{SYMBOLS.diamond}</span>
              <h2>Match Briefings</h2>
            </div>
            <div className="briefing-stack">
              <div key="stats1">
                <span>Total Registrations</span>
                <strong>{myRegistrations.length}</strong>
              </div>
              <div key="stats2">
                <span>Completed Payments</span>
                <strong>{myRegistrations.filter(r => r.payment_status === 'paid').length}</strong>
              </div>
            </div>
          </article>
        </section>
      </section>

      <aside className={`quiz-detail-drawer ${selectedQuiz ? 'open' : ''}`} aria-hidden={!selectedQuiz}>
        {selectedQuiz && (() => {
          const registration = myRegistrations.find(r => r.quiz === selectedQuiz.id);
          
          return (
          <>
            <button className="drawer-close" type="button" onClick={() => { setSelectedQuiz(null); setError(''); }}>x</button>
            <span className="module-kicker">Quiz Detail</span>
            <h2>{selectedQuiz.title}</h2>
            <p>{selectedQuiz.description || 'No description provided.'}</p>

            <div className="drawer-detail-grid">
              <div>
                <span>Status</span>
                <strong>{selectedQuiz.status.replace('_', ' ').toUpperCase()}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{selectedQuiz.event_date ? new Date(selectedQuiz.event_date).toLocaleDateString() : 'TBA'}</strong>
              </div>
              <div>
                <span>Fee</span>
                <strong>{parseFloat(selectedQuiz.registration_fee) === 0 ? 'No Registration Fee' : `₹${selectedQuiz.registration_fee}`}</strong>
              </div>
              <div>
                <span>Seats Left</span>
                <strong>{selectedQuiz.remaining_seats !== null ? selectedQuiz.remaining_seats : 'Unlimited'}</strong>
              </div>
            </div>

            {error && <div style={{color: 'rgb(255,100,100)', marginTop: '1rem', fontWeight: 'bold'}}>{error}</div>}

            <div className="drawer-section" style={{marginTop: '2rem'}}>
              {registration ? (
                <div style={{padding: '1rem', border: '1px solid rgba(var(--dash-mint-rgb), 0.3)', borderRadius: '8px', background: 'rgba(var(--dash-mint-rgb), 0.05)'}}>
                  <h3 style={{marginTop: 0, color: 'rgb(var(--dash-mint-rgb))'}}>Registration Status</h3>
                  <p><strong>Payment Status:</strong> {registration.payment_status.toUpperCase()}</p>
                  <p><strong>Player ID:</strong> {registration.player_id || 'Awaiting Payment'}</p>
                  
                  {registration.payment_status === 'pending' && parseFloat(selectedQuiz.registration_fee) > 0 && (
                    <button 
                      className="btn-submit" 
                      style={{marginTop: '1rem', width: '100%'}} 
                      onClick={() => handleMockPayment(selectedQuiz.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'PROCESSING...' : 'COMPLETE MOCK PAYMENT'}
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  className="btn-submit" 
                  style={{width: '100%', padding: '1rem', fontSize: '1.1rem'}}
                  onClick={() => handleRegister(selectedQuiz.id)}
                  disabled={actionLoading || !selectedQuiz.is_registration_open || selectedQuiz.remaining_seats === 0}
                >
                  {actionLoading ? 'REGISTERING...' : 
                    (!selectedQuiz.is_registration_open ? 'REGISTRATION CLOSED' : 
                    (selectedQuiz.remaining_seats === 0 ? 'QUIZ FULL' : 'REGISTER FOR QUIZ'))}
                </button>
              )}
            </div>

            <div className="drawer-section" style={{marginTop: '2rem'}}>
              <span>Instructions</span>
              <p>{selectedQuiz.rules_instructions || 'Review rules carefully.'}</p>
            </div>
          </>
          );
        })()}
      </aside>
    </main>
  );
}

export default DashboardPage;
