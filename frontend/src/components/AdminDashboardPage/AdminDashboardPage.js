import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthSession, getSchools, getProgramsBySchool, getBranchesByProgram } from '../../api/auth';
import { getAdminQuizzes, updateAdminQuiz, createAdminQuiz, getAdminStats } from '../../api/quizzes';
import './AdminDashboardPage.css';

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
  users: '\u2689', // Placeholder user symbol
  quizzes: '\u229E', // Placeholder quiz symbol
};

function AdminDashboardPage() {
  const [theme, setTheme] = useState(() => localStorage.getItem('quizverse-theme') || 'dark');
  const [coreOffset, setCoreOffset] = useState({ x: 0, y: 0 });
  const [quizzes, setQuizzes] = useState([]);
  const [adminStats, setAdminStats] = useState({
    total_students: 0,
    total_quizzes: 0,
    active_quizzes: 0,
    total_registrations: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', rules_instructions: '', 
    event_date: '', event_time: '',
    registration_open_date: '', registration_open_time: '', 
    registration_close_date: '', registration_close_time: '', 
    max_participants: '100',
    registration_fee: '0', visible_to_students: false, is_registration_open: false,
    require_eligibility: false,
    eligibility_school: '',
    eligibility_programs: [],
    eligibility_branches: []
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);

  const session = getAuthSession();
  const isLight = theme === 'light';
  const admin = {
    name: session?.student?.full_name || 'Administrator',
    role: 'System Overseer',
  };

  const navigation = [
    { label: 'Overview', symbol: SYMBOLS.square },
    { label: 'Manage Quizzes', symbol: SYMBOLS.quizzes },
    { label: 'Manage Students', symbol: SYMBOLS.users },
    { label: 'System Settings', symbol: SYMBOLS.gear },
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (session?.token) {
        const [qData, sData] = await Promise.all([
          getAdminQuizzes(session.token),
          getAdminStats(session.token)
        ]);
        setQuizzes(qData);
        setAdminStats(sData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    getSchools().then(data => setSchools(Array.isArray(data) ? data : [])).catch(() => setSchools([]));
  }, []);

  useEffect(() => {
    if (!formData.eligibility_school) {
      setPrograms([]);
      setBranches([]);
      return;
    }
    getProgramsBySchool(formData.eligibility_school)
      .then(data => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]));
  }, [formData.eligibility_school]);

  useEffect(() => {
    if (!formData.eligibility_programs || formData.eligibility_programs.length === 0) {
      setBranches([]);
      return;
    }
    Promise.all(formData.eligibility_programs.map(pid => getBranchesByProgram(pid)))
      .then(results => {
        const allBranches = results.flat();
        setBranches(allBranches);
      })
      .catch(() => setBranches([]));
  }, [formData.eligibility_programs]);

  const toggleQuizSetting = async (quizId, field, currentValue) => {
    try {
      await updateAdminQuiz(quizId, { [field]: !currentValue }, session?.token);
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to update quiz setting');
    }
  };

  const submitQuiz = async (isDraft) => {
    try {
      setSubmitLoading(true);
      const payload = { ...formData };
      
      if (isDraft) {
        payload.visible_to_students = false;
        payload.is_registration_open = false;
      }

      if (payload.event_date && payload.event_time) {
        payload.event_date = `${payload.event_date}T${payload.event_time}:00`;
      } else {
        delete payload.event_date;
      }
      delete payload.event_time;

      if (payload.registration_open_date && payload.registration_open_time) {
        payload.registration_open_date = `${payload.registration_open_date}T${payload.registration_open_time}:00`;
      } else {
        delete payload.registration_open_date;
      }
      delete payload.registration_open_time;

      if (payload.registration_close_date && payload.registration_close_time) {
        payload.registration_close_date = `${payload.registration_close_date}T${payload.registration_close_time}:00`;
      } else {
        delete payload.registration_close_date;
      }
      delete payload.registration_close_time;
      
      payload.max_participants = payload.max_participants ? parseInt(payload.max_participants) : null;
      payload.registration_fee = payload.registration_fee ? parseFloat(payload.registration_fee) : 0.00;
      
      if (!payload.require_eligibility) {
        payload.eligibility_school = null;
        payload.eligibility_programs = [];
        payload.eligibility_branches = [];
      }
      delete payload.require_eligibility;

      // Remove optional empty fields to bypass strict backend format validations
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      
      console.log('Sending payload:', payload);

      await createAdminQuiz(payload, session?.token);
      await fetchDashboardData();
      alert(isDraft ? 'Draft saved successfully!' : 'Quiz created successfully!');
      
      setFormData({
        title: '', description: '', rules_instructions: '', 
        event_date: '', event_time: '',
        registration_open_date: '', registration_open_time: '', 
        registration_close_date: '', registration_close_time: '', 
        max_participants: '100',
        registration_fee: '0', visible_to_students: false, is_registration_open: false,
        require_eligibility: false,
        eligibility_school: '',
        eligibility_programs: [],
        eligibility_branches: []
      });
      setShowModal(false);
    } catch (err) {
      console.error('Quiz Creation Error:', err, err.data);
      const errorData = err.data;
      if (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0 && !errorData.detail) {
        const messages = Object.entries(errorData).map(([key, val]) => {
          const stringVal = Array.isArray(val) ? val.join(' ') : (typeof val === 'object' ? JSON.stringify(val) : val);
          return `${key}: ${stringVal}`;
        });
        alert(`Validation Error:\n${messages.join('\n')}`);
      } else {
        alert(err.data?.detail || err.message || 'Failed to create quiz');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateQuiz = (e) => {
    e.preventDefault();
    submitQuiz(false);
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    submitQuiz(true);
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
      className={`admin-dashboard-page ${isLight ? 'theme-light' : 'theme-dark'}`}
      style={{ '--core-x': `${coreOffset.x}px`, '--core-y': `${coreOffset.y}px` }}
      onPointerMove={handlePointerMove}
    >
      <div className="admin-dashboard-background" aria-hidden="true">
        <div className="admin-orb admin-orb-primary" />
        <div className="admin-orb admin-orb-secondary" />
        <div className="admin-grid" />
        <div className="admin-particles" />
      </div>

      <aside className="admin-sidebar" aria-label="Dashboard navigation">
        <Link className="admin-brand" to="/">
          <span>{SYMBOLS.triangle}</span>
          QuizVerse Admin
        </Link>

        <nav className="admin-sidebar-nav">
          {navigation.map((item) => (
            <button 
              className={`admin-sidebar-item ${activeTab === item.label ? 'active' : ''}`} 
              key={item.label} 
              type="button"
              onClick={() => setActiveTab(item.label)}
            >
              <span className="admin-sidebar-icon">{item.symbol}</span>
              <span className="admin-sidebar-label">{item.label}</span>
              <span className="admin-sidebar-hover-symbol">{item.symbol}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-note">
          <span>{SYMBOLS.circle}</span>
          <p>Admin privileges active</p>
        </div>
      </aside>

      <section className="admin-shell">
        <header className="admin-topbar">
          <div>
            <p className="admin-welcome-kicker">Welcome back, {admin.name}</p>
            <h1>{admin.role} {SYMBOLS.dot} Main Facility</h1>
          </div>

          <div className="admin-topbar-actions" aria-label="Dashboard utilities">
            <button
              className="admin-theme-toggle"
              type="button"
              title="Dark or light mode"
              aria-pressed={isLight}
              onClick={toggleTheme}
            >
              <span>{isLight ? SYMBOLS.sun : SYMBOLS.moon}</span>
            </button>
            <button type="button" title="Alerts">{SYMBOLS.bell}</button>
            <button type="button" title="Settings">{SYMBOLS.gear}</button>
            <Link to="/login" title="Logout">{SYMBOLS.exit}</Link>
          </div>
        </header>

        {activeTab === 'Overview' && (
          <>
            <section className="admin-metrics-grid">
              <article className="admin-metric-card tilt-card metric-mint">
                <div className="metric-header">
                  <span>{SYMBOLS.users}</span>
                  <h2>Total Students</h2>
                </div>
                <div className="metric-value">{adminStats.total_students}</div>
                <div className="metric-footer">Active Accounts</div>
              </article>

              <article className="admin-metric-card tilt-card metric-pink">
                <div className="metric-header">
                  <span>{SYMBOLS.quizzes}</span>
                  <h2>Total Quizzes</h2>
                </div>
                <div className="metric-value">{adminStats.total_quizzes}</div>
                <div className="metric-footer">{adminStats.active_quizzes} Published</div>
              </article>

              <article className="admin-metric-card tilt-card metric-cyan">
                <div className="metric-header">
                  <span>{SYMBOLS.bell}</span>
                  <h2>System Status</h2>
                </div>
                <div className="metric-value">Online</div>
                <div className="metric-footer">All nodes nominal</div>
              </article>

              <article className="admin-metric-card tilt-card metric-yellow">
                <div className="metric-header">
                  <span>{SYMBOLS.diamond}</span>
                  <h2>Registrations</h2>
                </div>
                <div className="metric-value">{adminStats.total_registrations}</div>
                <div className="metric-footer">Across all quizzes</div>
              </article>
            </section>

            <section className="admin-overview-hero tilt-card" style={{marginTop: '2rem'}}>
              <div className="overview-copy" style={{width: '100%'}}>
                <span className="overview-status">Overview</span>
                <h2>Main Facility</h2>
                <p>Welcome to the command center. Navigate to Manage Quizzes to orchestrate events.</p>
              </div>
            </section>
          </>
        )}

        {activeTab === 'Manage Quizzes' && (
          <section className="admin-overview-hero tilt-card">
            <div className="overview-copy" style={{width: '100%'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div>
                  <span className="overview-status">Quiz Management</span>
                  <h2 style={{margin: 0}}>Active Facilities</h2>
                </div>
                <button 
                  className="dash-chip-btn" 
                  onClick={() => setShowModal(true)}
                  style={{background: 'rgb(var(--dash-mint-rgb))', color: 'black', border: 'none', fontWeight: 'bold', padding: '0.8rem 1.5rem', fontSize: '1rem', cursor: 'pointer'}}
                >
                  + CREATE NEW QUIZ
                </button>
              </div>
              
              <div style={{display: 'flex', gap: '2rem', flexDirection: 'column'}}>
                
                {/* List Section */}
                <div>
                  {loading ? (
                    <p>Loading quizzes...</p>
                  ) : quizzes.length === 0 ? (
                    <p>No quizzes created yet.</p>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                      {quizzes.map(quiz => (
                        <div key={quiz.id} style={{padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                            <h3 style={{margin: '0 0 0.5rem 0', color: 'white'}}>{quiz.title} {quiz.is_archived && '(ARCHIVED)'}</h3>
                            <div style={{display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)'}}>
                              <span>Status: {quiz.status.replace('_', ' ').toUpperCase()}</span>
                              <span>Registered: {quiz.registered_count}</span>
                              {quiz.event_date && <span>Date: {new Date(quiz.event_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '300px'}}>
                            <button 
                              className="dash-chip-btn" 
                              onClick={() => toggleQuizSetting(quiz.id, 'visible_to_students', quiz.visible_to_students)}
                              style={{borderColor: quiz.visible_to_students ? 'rgb(var(--dash-mint-rgb))' : 'rgba(255,255,255,0.2)'}}
                            >
                              {quiz.visible_to_students ? 'Published' : 'Hidden'}
                            </button>
                            <button 
                              className="dash-chip-btn" 
                              onClick={() => toggleQuizSetting(quiz.id, 'is_registration_open', quiz.is_registration_open)}
                              style={{borderColor: quiz.is_registration_open ? 'rgb(var(--dash-cyan-rgb))' : 'rgba(255,255,255,0.2)'}}
                            >
                              {quiz.is_registration_open ? 'Reg Open' : 'Reg Closed'}
                            </button>
                            <button 
                              className="dash-chip-btn" 
                              onClick={() => toggleQuizSetting(quiz.id, 'is_archived', quiz.is_archived)}
                            >
                              {quiz.is_archived ? 'Unarchive' : 'Archive'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </section>
        )}
      </section>

      {/* Root-Level Fullscreen Modal Overlay */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <button className="admin-modal-close" onClick={() => setShowModal(false)} type="button">&times;</button>
            <h3 style={{marginTop: 0, marginBottom: '1.5rem', color: 'white', fontSize: '1.5rem'}}>Create New Quiz</h3>
            <form onSubmit={handleCreateQuiz} style={{display: 'grid', gap: '1.2rem', gridTemplateColumns: '1fr 1fr'}}>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', minHeight: '80px', borderRadius: '4px'}} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Rules & Instructions</label>
                <textarea value={formData.rules_instructions} onChange={e => setFormData({...formData, rules_instructions: e.target.value})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', minHeight: '80px', borderRadius: '4px'}} />
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Event Date & Time</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                  <input type="time" value={formData.event_time} onChange={e => setFormData({...formData, event_time: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                </div>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Max Participants</label>
                <input type="number" min="0" value={formData.max_participants} onChange={e => setFormData({...formData, max_participants: e.target.value})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Registration Open Time</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" value={formData.registration_open_date} onChange={e => setFormData({...formData, registration_open_date: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                  <input type="time" value={formData.registration_open_time} onChange={e => setFormData({...formData, registration_open_time: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                </div>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Registration Fee (₹)</label>
                <input type="number" step="0.01" min="0" value={formData.registration_fee} onChange={e => setFormData({...formData, registration_fee: e.target.value})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Registration Close Time (Optional)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" value={formData.registration_close_date} onChange={e => setFormData({...formData, registration_close_date: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                  <input type="time" value={formData.registration_close_time} onChange={e => setFormData({...formData, registration_close_time: e.target.value})} style={{width: '50%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center', gridColumn: '1 / -1', marginTop: '0.5rem', flexWrap: 'wrap'}}>
                <label style={{color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formData.visible_to_students} onChange={e => setFormData({...formData, visible_to_students: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Visible to Students
                </label>
                <label style={{color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={formData.is_registration_open} onChange={e => setFormData({...formData, is_registration_open: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Registration Open
                </label>
                <label style={{color: 'rgb(var(--dash-pink-rgb), 0.9)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginLeft: 'auto'}}>
                  <input type="checkbox" checked={formData.require_eligibility} onChange={e => setFormData({...formData, require_eligibility: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Require Eligibility Criteria
                </label>
              </div>

              {/* Eligibility Filters */}
              {formData.require_eligibility && (
                <div style={{gridColumn: '1 / -1', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                  <h4 style={{marginTop: 0, marginBottom: '1rem', color: 'white'}}>Eligibility Filters</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>School</label>
                      <select value={formData.eligibility_school} onChange={e => setFormData({...formData, eligibility_school: e.target.value, eligibility_programs: [], eligibility_branches: []})} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px'}}>
                        <option value="">Any School</option>
                        {schools.map(school => <option key={school.id} value={school.id}>{school.school_code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Programmes (Multiple)</label>
                      <select multiple value={formData.eligibility_programs} onChange={e => setFormData({...formData, eligibility_programs: Array.from(e.target.selectedOptions, option => option.value)})} disabled={!formData.eligibility_school} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', minHeight: '80px'}}>
                        {programs.map(program => <option key={program.id} value={program.id}>{program.program_code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>Branches (Multiple)</label>
                      <select multiple value={formData.eligibility_branches} onChange={e => setFormData({...formData, eligibility_branches: Array.from(e.target.selectedOptions, option => option.value)})} disabled={formData.eligibility_programs.length === 0} style={{width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', minHeight: '80px'}}>
                        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}
                      </select>
                    </div>
                  </div>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)'}}>Hold Ctrl (Windows) or Command (Mac) to select multiple options.</p>
                </div>
              )}
              
              <div style={{gridColumn: '1 / -1', marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem'}}>
                <button type="button" onClick={() => setShowModal(false)} style={{background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.8rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', borderRadius: '4px'}}>
                  CANCEL
                </button>
                <button type="button" onClick={handleSaveDraft} disabled={submitLoading} style={{background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.8rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', borderRadius: '4px'}}>
                  SAVE AS DRAFT
                </button>
                <button className="dash-chip-btn" type="submit" disabled={submitLoading} style={{background: 'rgb(var(--dash-mint-rgb))', color: 'black', border: 'none', fontWeight: 'bold', padding: '0.8rem 2rem', fontSize: '1rem', cursor: 'pointer', borderRadius: '4px'}}>
                  {submitLoading ? 'SAVING...' : 'CREATE QUIZ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminDashboardPage;
