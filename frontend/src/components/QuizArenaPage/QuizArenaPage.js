import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  verifyQuizAccess,
  getQuizLiveState,
  submitFFFAnswer,
  getHotseatQuestion,
  submitHotseatAnswer,
  triggerHotseatLifeline,
  hotseatWalkAway,
  startQuizAttempt,
  getNextQuestion,
  submitQuizAnswer
} from '../../api/quizzes';
import { getAuthSession } from '../../api/auth';
import './QuizArenaPage.css';

const SYMBOLS = {
  triangle: '\u25B3',
  circle: '\u25CB',
  square: '\u25A1',
  diamond: '\u25C7',
  star: '\u2605',
};

const PRIZE_MONEY_LADDER = [
  { level: 15, amount: "₹10,000,000", value: 10000000, checkpoint: true },
  { level: 14, amount: "₹5,000,000", value: 5000000, checkpoint: false },
  { level: 13, amount: "₹2,500,000", value: 2500000, checkpoint: false },
  { level: 12, amount: "₹1,250,000", value: 1250000, checkpoint: false },
  { level: 11, amount: "₹640,000", value: 640000, checkpoint: false },
  { level: 10, amount: "₹320,000", value: 320000, checkpoint: true },
  { level: 9,  amount: "₹160,000", value: 160000, checkpoint: false },
  { level: 8,  amount: "₹80,000", value: 80000, checkpoint: false },
  { level: 7,  amount: "₹40,000", value: 40000, checkpoint: false },
  { level: 6,  amount: "₹20,000", value: 20000, checkpoint: false },
  { level: 5,  amount: "₹10,000", value: 10000, checkpoint: true },
  { level: 4,  amount: "₹5,000", value: 5000, checkpoint: false },
  { level: 3,  amount: "₹3,000", value: 3000, checkpoint: false },
  { level: 2,  amount: "₹2,000", value: 2000, checkpoint: false },
  { level: 1,  amount: "₹1,000", value: 1000, checkpoint: false }
];

function QuizArenaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getAuthSession();
  const [theme] = useState(() => localStorage.getItem('quizverse-theme') || 'dark');
  const isLight = theme === 'light';

  // Verification Credentials State
  const [playerId, setPlayerId] = useState(() => localStorage.getItem(`quiz-${id}-player-id`) || '');
  const [eventPassword, setEventPassword] = useState(() => localStorage.getItem(`quiz-${id}-event-password`) || '');
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');


  // Fullscreen and Trivia states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prelimFeedback, setPrelimFeedback] = useState(null);

  // Main Live Stage States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveState, setLiveState] = useState(null);

  // Entry stage machine: 'role_selection', 'credentials', 'instructions', 'active'
  const [entryStage, setEntryStage] = useState('role_selection');
  const [userSelectedRole, setUserSelectedRole] = useState(null);
  const [isEntered, setIsEntered] = useState(false);

  // Preliminary Round (regular) States
  const [prelimQuestion, setPrelimQuestion] = useState(null);
  const [prelimTotal, setPrelimTotal] = useState(0);
  const [prelimIndex, setPrelimIndex] = useState(0);
  const [prelimSelected, setPrelimSelected] = useState(null);
  const [prelimTimeLeft, setPrelimTimeLeft] = useState(90);
  const [prelimSubmitting, setPrelimSubmitting] = useState(false);
  const prelimTimerRef = useRef(null);

  // FFF States
  const [fffTimeLeft, setFffTimeLeft] = useState(20);
  const [fffSelectedChoice, setFffSelectedChoice] = useState(null);
  const [fffAnswered, setFffAnswered] = useState(false);
  const [fffTimeTaken, setFffTimeTaken] = useState(null);
  const fffTimerRef = useRef(null);
  const fffStartTimeRef = useRef(null);

  // Hotseat States
  const [hotseatQuestion, setHotseatQuestion] = useState(null);
  const [hotseatIndex, setHotseatIndex] = useState(0);
  const [hotseatTotal, setHotseatTotal] = useState(15);
  const [hotseatScore, setHotseatScore] = useState(0);
  const [hotseatCompleted, setHotseatCompleted] = useState(false);
  const [hotseatStatus, setHotseatStatus] = useState('');
  const [submittingHotseat, setSubmittingHotseat] = useState(false);
  const [selectedHotseatChoice, setSelectedHotseatChoice] = useState(null);

  // Lifelines Frontend State
  const [eliminatedChoiceIds, setEliminatedChoiceIds] = useState([]);
  const [pollVotes, setPollVotes] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchCategories, setSwitchCategories] = useState(["Science", "Bollywood", "History", "Sports", "General"]);

  // Polling intervals reference
  const pollingRef = useRef(null);

  // Check live state on mount and register fullscreen listener
  useEffect(() => {
    const initFetch = async () => {
      try {
        const data = await getQuizLiveState(id, session?.token);
        setLiveState(data);
      } catch (err) {
        console.error("Initial live state fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initFetch();

    const handleFsChange = () => {
      const fs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(fs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(prelimTimerRef.current);
      clearInterval(fffTimerRef.current);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Poll live state once verified
  useEffect(() => {
    if (isVerified) {
      fetchLiveState();
      pollingRef.current = setInterval(fetchLiveState, 2000);
    }
    return () => clearInterval(pollingRef.current);
  }, [isVerified]);

  // Sync state transitions & FFF timers
  useEffect(() => {
    if (!liveState) return;

    const isFffStage = liveState.current_stage.startsWith('fff_batch_');
    if (isFffStage && liveState.is_in_active_batch && !liveState.fff_answered && !fffAnswered) {
      if (!fffTimerRef.current) {
        setFffTimeLeft(20);
        fffStartTimeRef.current = performance.now();
        fffTimerRef.current = setInterval(() => {
          setFffTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(fffTimerRef.current);
              fffTimerRef.current = null;
              // Auto submit blank on timeout
              handleFFFSubmit(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (fffTimerRef.current) {
        clearInterval(fffTimerRef.current);
        fffTimerRef.current = null;
      }
    }

    // Load active hotseat question if hotseat round is active
    const isHotseatStage = liveState.current_stage.startsWith('hotseat_batch_');
    if (isHotseatStage) {
      loadHotseatQuestion();
    }
  }, [liveState]);

  const handleSelectParticipant = async () => {
    if (playerId && eventPassword) {
      try {
        setVerifying(true);
        setVerificationError('');
        await verifyQuizAccess(id, playerId, eventPassword, session?.token);
        setIsVerified(true);
        setUserSelectedRole('participant');
        setEntryStage('instructions');
      } catch (err) {
        // Clear stored credentials and ask to input again
        setPlayerId('');
        setEventPassword('');
        localStorage.removeItem(`quiz-${id}-player-id`);
        localStorage.removeItem(`quiz-${id}-event-password`);
        setUserSelectedRole('participant');
        setEntryStage('credentials');
      } finally {
        setVerifying(false);
      }
    } else {
      setUserSelectedRole('participant');
      setEntryStage('credentials');
    }
  };

  const handleSelectSpectator = () => {
    setUserSelectedRole('spectator');
    setIsVerified(true);
    setEntryStage('active');
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
      setIsFullscreen(true);
    }
  };

  const handleVerifyAccessSubmit = async (e) => {
    e.preventDefault();
    if (!playerId || !eventPassword) {
      setVerificationError('Please enter both Player ID and Event Password');
      return;
    }
    try {
      setVerifying(true);
      setVerificationError('');
      await verifyQuizAccess(id, playerId, eventPassword, session?.token);
      localStorage.setItem(`quiz-${id}-player-id`, playerId);
      localStorage.setItem(`quiz-${id}-event-password`, eventPassword);
      setIsVerified(true);
      setEntryStage('instructions');
    } catch (err) {
      setVerificationError(err.message || 'Access Verification Failed. Check credentials.');
    } finally {
      setVerifying(false);
    }
  };

  const fetchLiveState = async () => {
    try {
      const data = await getQuizLiveState(id, session?.token);
      setLiveState(data);
      if (data.current_stage === 'regular' && !prelimQuestion && !loading && userSelectedRole !== 'spectator') {
        // Init prelim round if current stage is regular
        initializePrelim();
      }
    } catch (err) {
      setError(err.message || 'Error communicating with Live Arena.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PRELIMINARY ROUND HANDLERS (regular)
  // ==========================================
  const initializePrelim = async () => {
    try {
      setLoading(true);
      await startQuizAttempt(id, session?.token);
      await loadPrelimQuestion();
    } catch (err) {
      // In case attempt already started or completed
      await loadPrelimQuestion();
    } finally {
      setLoading(false);
    }
  };

  const loadPrelimQuestion = async () => {
    try {
      const data = await getNextQuestion(id, session?.token);
      if (data.completed) {
        setPrelimQuestion(null);
        return;
      }
      setPrelimQuestion(data.question);
      setPrelimTotal(data.total_questions);
      setPrelimIndex(data.current_index);
      setPrelimSelected(null);
      setPrelimTimeLeft(90);
      startPrelimTimer();
    } catch (err) {
      setError('Failed to load next preliminary question.');
    }
  };

  const startPrelimTimer = () => {
    clearInterval(prelimTimerRef.current);
    prelimTimerRef.current = setInterval(() => {
      setPrelimTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(prelimTimerRef.current);
          handlePrelimTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePrelimTimeUp = () => {
    submitPrelimAnswer(null, 90);
  };

  const submitPrelimAnswer = async (choiceId, timeTaken = null) => {
    try {
      setPrelimSubmitting(true);
      clearInterval(prelimTimerRef.current);
      const actualTime = timeTaken !== null ? timeTaken : 90 - prelimTimeLeft;
      const res = await submitQuizAnswer(id, choiceId, actualTime, session?.token);
      setPrelimFeedback(res);
    } catch (err) {
      setError('Failed to submit preliminary answer.');
    } finally {
      setPrelimSubmitting(false);
    }
  };

  const handleProceedFromTrivia = async () => {
    const wasCompleted = prelimFeedback?.completed;
    setPrelimFeedback(null);
    if (wasCompleted) {
      setPrelimQuestion(null);
    } else {
      await loadPrelimQuestion();
    }
  };

  // ==========================================
  // FASTEST FINGER FIRST ROUND HANDLERS
  // ==========================================
  const handleFFFSubmit = async (choiceId) => {
    if (fffAnswered) return;
    try {
      clearInterval(fffTimerRef.current);
      fffTimerRef.current = null;
      
      const endTime = performance.now();
      const elapsed = ((endTime - fffStartTimeRef.current) / 1000).toFixed(3);
      const seconds = Math.min(20.0, parseFloat(elapsed));

      setFffSelectedChoice(choiceId);
      setFffAnswered(true);
      setFffTimeTaken(seconds);

      await submitFFFAnswer(id, choiceId, seconds, session?.token);
    } catch (err) {
      console.error("Error submitting FFF answer: ", err);
    }
  };

  // ==========================================
  // HOTSEAT ROUND HANDLERS
  // ==========================================
  const loadHotseatQuestion = async () => {
    try {
      const data = await getHotseatQuestion(id, session?.token);
      if (data.completed) {
        setHotseatCompleted(true);
        setHotseatStatus(data.status);
        setHotseatScore(data.score);
        setHotseatQuestion(null);
      } else {
        setHotseatCompleted(false);
        // Clear choice selection and 50:50 fades ONLY when switching to a NEW question
        if (!hotseatQuestion || hotseatQuestion.id !== data.question.id) {
          setHotseatQuestion(data.question);
          setSelectedHotseatChoice(null);
          setEliminatedChoiceIds([]);
          setPollVotes(null);
        }
        setHotseatTotal(data.total_questions);
        setHotseatIndex(data.current_index);
        setHotseatScore(data.score);
      }
    } catch (err) {
      // Hotseat question might return 404/400 if not ready or completed
      console.log("Hotseat question details not loaded yet or active.");
    }
  };

  const handleHotseatChoiceClick = (choiceId) => {
    if (liveState?.student_role !== 'hotseat_player' || submittingHotseat) return;
    if (eliminatedChoiceIds.includes(choiceId)) return; // 50:50 locked out
    setSelectedHotseatChoice(choiceId);
  };

  const handleConfirmHotseatAnswer = async () => {
    if (!selectedHotseatChoice || submittingHotseat) return;
    try {
      setSubmittingHotseat(true);
      const res = await submitHotseatAnswer(id, selectedHotseatChoice, session?.token);
      
      // Re-load to fetch points updates, checkpoint updates, or completion states
      await loadHotseatQuestion();
    } catch (err) {
      setError(err.message || 'Failed to submit hotseat answer.');
    } finally {
      setSubmittingHotseat(false);
    }
  };

  const handleWalkAway = async () => {
    if (submittingHotseat) return;
    const confirm = window.confirm("Are you sure you want to WALK AWAY and lock in your current points? This ends your hotseat run.");
    if (!confirm) return;

    try {
      setSubmittingHotseat(true);
      await hotseatWalkAway(id, session?.token);
      await loadHotseatQuestion();
    } catch (err) {
      setError('Error while processing walk away.');
    } finally {
      setSubmittingHotseat(false);
    }
  };

  // KBC Lifelines Activations
  const handleUse5050 = async () => {
    if (liveState?.hotseat_attempt?.lifeline_5050_used) return;
    try {
      const res = await triggerHotseatLifeline(id, '5050', '', session?.token);
      setEliminatedChoiceIds(res.eliminated_choice_ids);
      // Update local attempt status
      setLiveState(prev => ({
        ...prev,
        hotseat_attempt: { ...prev.hotseat_attempt, lifeline_5050_used: true }
      }));
    } catch (err) {
      alert(err.message || "Failed to trigger 50:50");
    }
  };

  const handleUseAudiencePoll = async () => {
    if (liveState?.hotseat_attempt?.lifeline_poll_used) return;
    try {
      const res = await triggerHotseatLifeline(id, 'poll', '', session?.token);
      setPollVotes(res.votes);
      setShowPollModal(true);
      // Update local attempt status
      setLiveState(prev => ({
        ...prev,
        hotseat_attempt: { ...prev.hotseat_attempt, lifeline_poll_used: true }
      }));
    } catch (err) {
      alert(err.message || "Failed to trigger Audience Poll");
    }
  };

  const handleUseSwitchQuestion = () => {
    if (liveState?.hotseat_attempt?.lifeline_switch_used) return;
    setShowSwitchModal(true);
  };

  const submitSwitchQuestionCategory = async (category) => {
    try {
      setShowSwitchModal(false);
      const res = await triggerHotseatLifeline(id, 'switch', category, session?.token);
      
      // Animate replacement question card
      setHotseatQuestion(res.question);
      setSelectedHotseatChoice(null);
      setEliminatedChoiceIds([]);
      setPollVotes(null);
      
      // Update local attempt status
      setLiveState(prev => ({
        ...prev,
        hotseat_attempt: { ...prev.hotseat_attempt, lifeline_switch_used: true }
      }));
    } catch (err) {
      alert(err.message || "Failed to switch question");
    }
  };

  // ==========================================
  // VIEW RENDERS
  // ==========================================

  const handleExitArena = () => {
    const confirm = window.confirm("Are you sure you want to EXIT the Live Arena? You will lose active connection and miss the current round.");
    if (confirm) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      navigate('/dashboard');
    }
  };

  const renderTopbar = (title, badgeText = null, isTimer = false, timeLeftValue = 0) => {
    const timerWarning = timeLeftValue <= 10;
    const liveCount = liveState?.live_participants || 0;
    const totalQCount = liveState?.overall_total_questions || liveState?.total_questions || prelimTotal || 0;

    return (
      <header className="arena-topbar">
        <div className="arena-brand">
          <span>{SYMBOLS.triangle}</span> {title}
        </div>
        
        {badgeText && <div className="event-badge">{badgeText}</div>}
        
        <div className="arena-header-stats">
          <div className="stat-badge glow-cyan">
            <span className="stat-icon">👥</span>
            <span className="stat-label">LIVE:</span>
            <strong className="stat-value">{liveCount}</strong>
          </div>
          
          {totalQCount > 0 && (
            <div className="stat-badge glow-pink">
              <span className="stat-icon">❓</span>
              <span className="stat-label">QUESTIONS:</span>
              <strong className="stat-value">{totalQCount}</strong>
            </div>
          )}
        </div>

        {isTimer && (
          <div className={`arena-timer ${timerWarning ? 'timer-warning' : ''}`}>
            <strong>00:{timeLeftValue < 10 ? `0${timeLeftValue}` : timeLeftValue}</strong>
          </div>
        )}

        <button className="btn-exit" onClick={handleExitArena}>
          🏃 EXIT ARENA
        </button>
      </header>
    );
  };

  // Loading indicator
  if (loading) {
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-center">
          <div className="arena-loader">
            <span className="arena-spin-symbol">{SYMBOLS.triangle}</span>
            <h2 className="futuristic-text">Synchronizing Event Stream...</h2>
          </div>
        </div>
      </main>
    );
  }

  // 1. Role Selection Stage
  if (entryStage === 'role_selection') {
    const isTestingQuiz = liveState?.title?.toLowerCase().includes('test');
    const quizStarted = liveState && liveState.current_stage !== 'regular' && !isTestingQuiz;

    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
          <div className="arena-grid" />
        </div>
        <div className="arena-center">
          <div className="role-selection-panel glass-card glow-blue text-center animate-fade-in" style={{maxWidth: '800px', width: '100%'}}>
            <div className="kbc-crest">{SYMBOLS.triangle}</div>
            <h1 className="title-text golden-glow">WELCOME TO QUIZVERSE ARENA</h1>
            <p className="subtitle-text">Prepare your console for the premium live KBC experience</p>

            <div className="role-cards-container">
              {/* Participant Card */}
              <div 
                className={`role-selection-card participant-card glass-card ${quizStarted ? 'disabled' : 'clickable glow-pink'}`}
                onClick={!quizStarted ? handleSelectParticipant : undefined}
              >
                <div className="role-card-icon">⚔️</div>
                <h3>ENTER AS PARTICIPANT</h3>
                <p>Answer preliminary questions, compete for the Top 30 leaderboard, and qualify for the hotseat!</p>
                {quizStarted ? (
                  <span className="badge-warning">Participant Entry Closed (Quiz in Progress)</span>
                ) : (
                  <span className="badge-action">COMPETE NOW ➡️</span>
                )}
              </div>

              {/* Spectator Card */}
              <div 
                className="role-selection-card spectator-card glass-card clickable glow-cyan"
                onClick={handleSelectSpectator}
              >
                <div className="role-card-icon">👁️</div>
                <h3>ENTER AS SPECTATOR</h3>
                <p>Watch the FFF sequence battles, spectate hotseat contestants, and track cash ladders in real-time.</p>
                <span className="badge-action text-cyan">JOIN TO WATCH ➡️</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Credentials Stage
  if (entryStage === 'credentials') {
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
          <div className="arena-grid" />
        </div>
        <div className="arena-center">
          <form className="arena-error-panel glass-card glow-blue animate-fade-in" onSubmit={handleVerifyAccessSubmit} style={{maxWidth: '500px', width: '100%'}}>
            <div className="kbc-crest">{SYMBOLS.triangle}</div>
            <h2 className="title-text golden-glow">KBC QUIZ ARENA ENTRY</h2>
            <p className="subtitle-text">Provide your Player ID and Event Password to enter the live arena</p>
            
            {verificationError && (
              <div className="error-alert">
                <span>{verificationError}</span>
              </div>
            )}

            <div className="input-group">
              <label>Player ID (e.g. PLAYER 001)</label>
              <input 
                type="text" 
                placeholder="Enter pre-assigned Player ID" 
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value.toUpperCase())}
                disabled={verifying}
              />
            </div>

            <div className="input-group">
              <label>Event Security Password</label>
              <input 
                type="password" 
                placeholder="Enter event day password" 
                value={eventPassword}
                onChange={(e) => setEventPassword(e.target.value)}
                disabled={verifying}
              />
            </div>

            <button type="submit" className="btn-submit glow-button" disabled={verifying}>
              {verifying ? 'DECRYPTING ACCESS...' : 'VERIFY & CONTINUE'}
            </button>

            <button 
              type="button" 
              className="btn-back" 
              onClick={() => setEntryStage('role_selection')} 
              style={{marginTop: '1.5rem', background: 'transparent', border: 'none', color: 'var(--dash-muted)', cursor: 'pointer', textDecoration: 'underline'}}
            >
              ⬅️ Back to Selection
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Instruction & Fullscreen Prep Stage
  if (entryStage === 'instructions') {
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
          <div className="arena-grid" />
        </div>
        <div className="arena-center">
          <div className="instruction-panel glass-card glow-pink animate-fade-in" style={{maxWidth: '650px', width: '100%'}}>
            <h2 className="title-text golden-glow text-center">⚔️ PARTICIPANT RULES & CONSOLE SETUP</h2>
            <p className="subtitle-text text-center">To ensure event integrity and synchronized gameplay, review the guidelines below:</p>

            <div className="instructions-list">
              <div className="checklist-item">
                <span className="check-bullet">🛡️</span>
                <div>
                  <h4>Strict Security Lock</h4>
                  <p>Tab switching, minimizing, or exiting full screen is prohibited during active gameplay. Exiting full screen will suspend your console.</p>
                </div>
              </div>

              <div className="checklist-item">
                <span className="check-bullet">⚡</span>
                <div>
                  <h4>Synchronized Rounds</h4>
                  <p>All participants face identical questions at the exact same time. Choice lock-ins are final once clicked.</p>
                </div>
              </div>

              <div className="checklist-item">
                <span className="check-bullet">💡</span>
                <div>
                  <h4>Trivia Explanations</h4>
                  <p>After locking your answer, read the educational trivia while waiting for the host to push the next question.</p>
                </div>
              </div>
            </div>

            <div className={`fullscreen-status-banner ${isFullscreen ? 'secured' : 'required'}`}>
              <span className="status-indicator-dot"></span>
              <strong>{isFullscreen ? 'FULLSCREEN SECURED 🟢' : 'FULLSCREEN REQUIRED 🔴'}</strong>
              <p>{isFullscreen ? 'Your console is locked and ready for synchronized play.' : 'You must open full screen mode before starting the quiz.'}</p>
            </div>

            <div className="instruction-actions" style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem'}}>
              {!isFullscreen && (
                <button className="btn-submit glow-button" onClick={enterFullscreen}>
                  GO FULL SCREEN 🚀
                </button>
              )}
              <button 
                className="btn-submit glow-button" 
                disabled={!isFullscreen} 
                onClick={() => {
                  setEntryStage('active');
                  setIsEntered(true);
                }}
                style={{
                  background: isFullscreen ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.05)',
                  color: isFullscreen ? '#030206' : 'rgba(255,255,255,0.2)',
                  cursor: isFullscreen ? 'pointer' : 'not-allowed'
                }}
              >
                CONTINUE TO QUIZ ➡️
              </button>
              
              <button 
                type="button" 
                className="btn-back" 
                onClick={() => {
                  setEntryStage('role_selection');
                  setUserSelectedRole(null);
                  setIsVerified(false);
                }}
                style={{background: 'transparent', border: 'none', color: 'var(--dash-muted)', cursor: 'pointer', textDecoration: 'underline'}}
              >
                ⬅️ Back to Selection
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fullscreen Required Guard (Only for active participants)
  if (isVerified && userSelectedRole === 'participant' && entryStage === 'active' && isEntered && !isFullscreen) {
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'} locked-fullscreen`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
          <div className="arena-grid" />
        </div>
        <div className="arena-center">
          <div className="fullscreen-warning-card glass-card glow-red text-center animate-fade-in">
            <div className="lock-icon">⚠️</div>
            <h2 className="futuristic-text title-text">FULLSCREEN REQUIRED</h2>
            <p>To ensure event day security and KBC integrity, QuizVerse Arena must be played in full screen mode.</p>
            <p className="helper-text">Gameplay is suspended until full screen mode is restored.</p>
            <button className="btn-submit glow-button" onClick={enterFullscreen} style={{marginTop: '2rem'}}>
              RE-ENTER FULL SCREEN MODE 🚀
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Handle stage: Completed (Podium)
  if (liveState?.current_stage === 'completed') {
    const s1 = liveState.hotseat_score_1 || 0;
    const s2 = liveState.hotseat_score_2 || 0;
    const s3 = liveState.hotseat_score_3 || 0;
    const p1 = liveState.hotseat_player_1?.full_name || "Contestant 1";
    const p2 = liveState.hotseat_player_2?.full_name || "Contestant 2";
    const p3 = liveState.hotseat_player_3?.full_name || "Contestant 3";

    // Sort to determine 1st, 2nd, 3rd
    const podiumArr = [
      { name: p1, score: s1, batch: 1 },
      { name: p2, score: s2, batch: 2 },
      { name: p3, score: s3, batch: 3 }
    ].sort((a, b) => b.score - a.score);

    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
        </div>
        {renderTopbar("KBC Live Quiz Event Concluded", "CONCLUDED")}

        <div className="arena-center">
          <div className="podium-panel glass-card">
            <h1 className="podium-title golden-glow">CONGRATULATIONS CHAMPIONS!</h1>
            <p className="podium-subtitle">The battle has ended. Releasing official results.</p>

            <div className="podium-3d-container">
              {/* 2nd Place */}
              <div className="podium-col col-second">
                <div className="podium-avatar">{podiumArr[1]?.name[0]}</div>
                <div className="podium-name">{podiumArr[1]?.name}</div>
                <div className="podium-score">₹{podiumArr[1]?.score.toLocaleString()}</div>
                <div className="podium-block block-second">
                  <strong>2</strong>
                </div>
              </div>

              {/* 1st Place (Winner) */}
              <div className="podium-col col-first">
                <div className="winner-crown">👑</div>
                <div className="podium-avatar winner-glow">{podiumArr[0]?.name[0]}</div>
                <div className="podium-name">{podiumArr[0]?.name}</div>
                <div className="podium-score winner-text">₹{podiumArr[0]?.score.toLocaleString()}</div>
                <div className="podium-block block-first">
                  <strong>1</strong>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="podium-col col-third">
                <div className="podium-avatar">{podiumArr[2]?.name[0]}</div>
                <div className="podium-name">{podiumArr[2]?.name}</div>
                <div className="podium-score">₹{podiumArr[2]?.score.toLocaleString()}</div>
                <div className="podium-block block-third">
                  <strong>3</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Handle stage: batch_selection (Standby)
  if (liveState?.current_stage === 'batch_selection') {
    const b1 = liveState.batch_1_players || [];
    const b2 = liveState.batch_2_players || [];
    const b3 = liveState.batch_3_players || [];
    
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
        </div>
        {renderTopbar("Preliminary Completed", "STAGE: SELECTION")}

        <div className="arena-container">
          <div className="glass-card panel-intro text-center">
            <h2 className="golden-glow">Leaderboard Finalized!</h2>
            <p>Admin has compiled the Top 30 students based on Preliminary scores. The contestants are arranged into three batches of 10 for the FFF round!</p>
          </div>

          <div className="batches-grid">
            <div className="batch-column glass-card border-gold">
              <h3>BATCH 1 (Contestants 1-10)</h3>
              <p className="helper-text">Competes in FFF Batch 1</p>
              <ul>
                {b1.length === 0 ? <li className="empty-li">Locking players...</li> : b1.map((pId, idx) => (
                  <li key={pId} className={session?.user?.id === pId ? 'user-highlight' : ''}>
                    <span>#{idx+1} Player ID: {pId}</span>
                    {session?.user?.id === pId && <span className="you-pill">YOU</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="batch-column glass-card border-gold">
              <h3>BATCH 2 (Contestants 11-20)</h3>
              <p className="helper-text">Competes in FFF Batch 2</p>
              <ul>
                {b2.length === 0 ? <li className="empty-li">Locking players...</li> : b2.map((pId, idx) => (
                  <li key={pId} className={session?.user?.id === pId ? 'user-highlight' : ''}>
                    <span>#{idx+11} Player ID: {pId}</span>
                    {session?.user?.id === pId && <span className="you-pill">YOU</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="batch-column glass-card border-gold">
              <h3>BATCH 3 (Contestants 21-30)</h3>
              <p className="helper-text">Competes in FFF Batch 3</p>
              <ul>
                {b3.length === 0 ? <li className="empty-li">Locking players...</li> : b3.map((pId, idx) => (
                  <li key={pId} className={session?.user?.id === pId ? 'user-highlight' : ''}>
                    <span>#{idx+21} Player ID: {pId}</span>
                    {session?.user?.id === pId && <span className="you-pill">YOU</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Handle stage: Preliminary Quiz (regular)
  if (liveState?.current_stage === 'regular') {
    if (userSelectedRole === 'spectator') {
      return (
        <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-background">
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar("Spectating Preliminary Quiz", "SPECTATOR")}
          <div className="arena-center">
            <div className="arena-completed-panel glass-card text-center glow-blue" style={{maxWidth: '600px'}}>
              <div className="lock-icon">👁️</div>
              <h2 className="title-text golden-glow font-bold">SPECTATING PRELIMINARY ROUND</h2>
              <p style={{margin: '1.5rem 0', fontSize: '1.1rem'}}>Participants are currently answering synchronized preliminary questions.</p>
              <p className="helper-text">Standby. The host will compute the Top 30 leaderboard and reveal batch selections soon!</p>
            </div>
          </div>
        </main>
      );
    }

    if (!prelimQuestion) {
      return (
        <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-center">
            <div className="arena-completed-panel glass-card">
              <span className="arena-status">Preliminary Completed</span>
              <h2 className="title-text golden-glow">Preliminary Answers Locked</h2>
              <p>You have successfully submitted all your responses. Standby for the admin to compute the Top 30 leaderboard!</p>
            </div>
          </div>
        </main>
      );
    }

    const timerWarning = prelimTimeLeft <= 10;
    const progressPercent = prelimTotal > 0 ? ((prelimIndex + 1) / prelimTotal) * 100 : 0;

    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
        </div>
        {renderTopbar("Preliminary Quiz", "PRELIMINARY", !prelimFeedback, prelimTimeLeft)}

        <section className="arena-container">
          <div className="arena-progress-bar">
            <div className="arena-progress-fill" style={{width: `${progressPercent}%`}} />
          </div>

          <div className="arena-header-row">
            <span>Question {prelimIndex + 1} of {prelimTotal}</span>
            <span className="arena-marks-kicker">{prelimQuestion.marks} Marks</span>
          </div>

          {prelimFeedback ? (
            <div className="trivia-card glass-card glow-blue animate-fade-in">
              <div className="trivia-header-row">
                <span className={`trivia-grade-badge ${prelimFeedback.correct ? 'correct' : 'incorrect'}`}>
                  {prelimFeedback.correct ? 'CORRECT! 🚀' : 'INCORRECT ❌'}
                </span>
                <span className="trivia-category">Category: {prelimQuestion.category || "General"}</span>
              </div>
              
              <div className="trivia-question-summary">
                <h3>{prelimQuestion.text}</h3>
                <div className="trivia-answer-check">
                  <span className="label">Correct Answer:</span>
                  <strong className="correct-value">{prelimFeedback.correct_choice?.text || 'N/A'}</strong>
                </div>
              </div>

              {prelimFeedback.trivia ? (
                <div className="trivia-fact-box">
                  <h4>💡 DID YOU KNOW? (TRIVIA)</h4>
                  <p>{prelimFeedback.trivia}</p>
                </div>
              ) : (
                <div className="trivia-fact-box">
                  <h4>💡 ANSWER EXPLANATION</h4>
                  <p>Keep going! Great job testing your intelligence in the QuizVerse Arena.</p>
                </div>
              )}

              <div className="trivia-actions" style={{ marginTop: '2rem' }}>
                <button className="btn-submit glow-button" onClick={handleProceedFromTrivia}>
                  PROCEED TO NEXT QUESTION 🚀
                </button>
              </div>
            </div>
          ) : (
            <>
              <article className="arena-question-card glass-card">
                <h2>{prelimQuestion.text}</h2>
              </article>

              <div className="arena-choices-grid">
                {prelimQuestion.choices?.map((choice, i) => (
                  <button 
                    key={choice.id}
                    className={`arena-choice-btn ${prelimSelected === choice.id ? 'selected' : ''}`}
                    onClick={() => setPrelimSelected(choice.id)}
                    disabled={prelimSubmitting}
                  >
                    <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                    <div className="choice-text">{choice.text}</div>
                  </button>
                ))}
              </div>

              <div className="arena-actions">
                <button 
                  className="btn-submit glow-button" 
                  onClick={() => submitPrelimAnswer(prelimSelected)}
                  disabled={prelimSubmitting}
                >
                  {prelimSubmitting ? 'TRANSMITTING...' : 'CONFIRM & LOCK'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  // Handle stage: Fastest Finger First (fff_batch_1, fff_batch_2, fff_batch_3)
  const isFffStage = liveState?.current_stage.startsWith('fff_batch_');
  if (isFffStage) {
    const fffBatch = liveState.current_stage.slice(-1);
    
    // Check if the user is in the active batch
    if (!liveState.is_in_active_batch) {
      // Spectator view for FFF
      return (
        <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-background">
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar(`Spectating FFF Batch ${fffBatch}`, "SPECTATOR")}

          <div className="arena-container">
            <div className="glass-card panel-intro text-center">
              <h2 className="golden-glow">FFF Batch {fffBatch} In Progress</h2>
              <p>Active batch contestants are sorting the sequence as fast as possible. Below is the live question they are facing:</p>
            </div>

            {liveState.fff_question ? (
              <div className="spectator-fff-box">
                <article className="arena-question-card glass-card">
                  <h2>{liveState.fff_question.text}</h2>
                </article>
                <div className="arena-choices-grid">
                  {liveState.fff_question.choices.map((c, idx) => (
                    <div key={c.id} className="arena-choice-btn disabled">
                      <div className="choice-indicator">{['A','B','C','D'][idx]}</div>
                      <div className="choice-text">{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card text-center">
                <h3>Loading FFF Question details...</h3>
              </div>
            )}
          </div>
        </main>
      );
    }

    // Player view for FFF
    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
        </div>
        {renderTopbar(`FASTEST FINGER FIRST (BATCH ${fffBatch})`, "FFF CONTENDER", true, fffTimeLeft)}

        <section className="arena-container">
          {fffAnswered ? (
            <div className="arena-center">
              <div className="glass-card text-center glow-blue" style={{maxWidth: '500px', padding: '3rem'}}>
                <div className="lock-icon">🔒</div>
                <h2 className="golden-glow">ANSWER SECURED</h2>
                <p>Your arrangement choice was transmitted in <strong className="winner-text">{fffTimeTaken}s</strong>!</p>
                <p className="helper-text">Stay tuned. Admin will display the speed standings once all contestants have completed.</p>
              </div>
            </div>
          ) : liveState.fff_question ? (
            <>
              <div className="glass-card panel-intro text-center">
                <h3 className="winner-text">ACCURACY & SPEED MATTERS!</h3>
                <p>Click the option showing the correct sequence arrangement immediately to lock-in your time.</p>
              </div>

              <article className="arena-question-card glass-card glow-pink">
                <h2>{liveState.fff_question.text}</h2>
              </article>

              <div className="arena-choices-grid">
                {liveState.fff_question.choices.map((choice, i) => (
                  <button 
                    key={choice.id}
                    className="arena-choice-btn fff-btn glow-glow"
                    onClick={() => handleFFFSubmit(choice.id)}
                  >
                    <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                    <div className="choice-text">{choice.text}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="arena-center">
              <h2>Preparing FFF terminal...</h2>
            </div>
          )}
        </section>
      </main>
    );
  }

  // Handle stage: Hotseat (hotseat_batch_1, hotseat_batch_2, hotseat_batch_3)
  const isHotseatStage = liveState?.current_stage.startsWith('hotseat_batch_');
  if (isHotseatStage) {
    const activeBatch = liveState.current_stage.slice(-1);
    
    // View if player is the actual Hotseat Contestant
    if (liveState.student_role === 'hotseat_player') {
      if (hotseatCompleted) {
        return (
          <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
            <div className="arena-center">
              <div className="arena-completed-panel glass-card text-center glow-blue">
                <span className="arena-status">Hotseat Finished</span>
                <h2 className="golden-glow">Round Concluded</h2>
                <div className="arena-score-display">
                  <span className="score-kicker">Final Winnings</span>
                  <strong>₹{hotseatScore.toLocaleString()}</strong>
                </div>
                <p>Status: {hotseatStatus === 'walked_away' ? 'Walked Away Safely' : hotseatStatus === 'failed' ? 'Incorrect Answer (Checkpoint Drop)' : 'Completed'}</p>
                <p>Waiting for the admin to transition to the next event stage...</p>
              </div>
            </div>
          </main>
        );
      }

      if (!hotseatQuestion) {
        return (
          <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
            <div className="arena-center">
              <h2>Loading active Hotseat question card...</h2>
            </div>
          </main>
        );
      }

      return (
        <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-background">
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar(`HOTSEAT LIVE: ${session?.user?.full_name}`, "HOTSEAT CONTENDER")}

          <div className="hotseat-layout">
            {/* Left Console: Lifelines + Questions */}
            <div className="hotseat-console-panel">
              
              {/* KBC Lifeline Buttons */}
              <div className="lifelines-row">
                <button 
                  className={`btn-lifeline ${liveState?.hotseat_attempt?.lifeline_5050_used ? 'used' : ''}`}
                  onClick={handleUse5050}
                  disabled={liveState?.hotseat_attempt?.lifeline_5050_used}
                >
                  <div className="lifeline-ring">50:50</div>
                </button>

                <button 
                  className={`btn-lifeline ${liveState?.hotseat_attempt?.lifeline_poll_used ? 'used' : ''}`}
                  onClick={handleUseAudiencePoll}
                  disabled={liveState?.hotseat_attempt?.lifeline_poll_used}
                >
                  <div className="lifeline-ring">POLL</div>
                </button>

                <button 
                  className={`btn-lifeline ${liveState?.hotseat_attempt?.lifeline_switch_used ? 'used' : ''}`}
                  onClick={handleUseSwitchQuestion}
                  disabled={liveState?.hotseat_attempt?.lifeline_switch_used}
                >
                  <div className="lifeline-ring">SWITCH</div>
                </button>
              </div>

              {/* Question Screen */}
              <div className="active-question-section">
                <span className="question-category-tag">CATEGORY: {hotseatQuestion.category}</span>
                <article className="arena-question-card glass-card kbc-question-frame">
                  <h2>{hotseatQuestion.text}</h2>
                </article>

                <div className="kbc-choices-grid">
                  {hotseatQuestion.choices.map((choice, i) => {
                    const isEliminated = eliminatedChoiceIds.includes(choice.id);
                    return (
                      <button 
                        key={choice.id}
                        className={`arena-choice-btn kbc-choice ${selectedHotseatChoice === choice.id ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`}
                        onClick={() => handleHotseatChoiceClick(choice.id)}
                        disabled={isEliminated || submittingHotseat}
                      >
                        <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                        <div className="choice-text">{isEliminated ? "" : choice.text}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="hotseat-action-row">
                  <button className="btn-walkaway glow-red" onClick={handleWalkAway} disabled={submittingHotseat}>
                    🏃 WALK AWAY (Lock Winnings)
                  </button>

                  <button 
                    className="btn-submit glow-button" 
                    onClick={handleConfirmHotseatAnswer}
                    disabled={!selectedHotseatChoice || submittingHotseat}
                  >
                    {submittingHotseat ? 'LOCKING ANSWER...' : 'CONFIRM & LOCK CHOICE'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Prize Ladder */}
            <div className="hotseat-ladder-panel glass-card">
              <h3 className="ladder-header golden-glow">KBC SCORE LADDER</h3>
              <div className="ladder-list">
                {PRIZE_MONEY_LADDER.map((step, idx) => {
                  const isCurrent = step.level === (hotseatIndex + 1);
                  const isPassed = step.level <= hotseatIndex;
                  return (
                    <div 
                      key={step.level} 
                      className={`ladder-step ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''} ${step.checkpoint ? 'checkpoint' : ''}`}
                    >
                      <span className="step-num">{step.level}</span>
                      <span className="step-diamond">♦</span>
                      <span className="step-amount">{step.amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audience Poll Modal */}
          {showPollModal && pollVotes && (
            <div className="modal-overlay" onClick={() => setShowPollModal(false)}>
              <div className="modal-content glass-card glow-blue" onClick={(e) => e.stopPropagation()}>
                <h2 className="golden-glow">AUDIENCE POLL RESULTS</h2>
                <div className="poll-chart-container">
                  {hotseatQuestion.choices.map((choice, i) => {
                    const percentage = pollVotes[choice.id] || 0;
                    return (
                      <div key={choice.id} className="poll-bar-col">
                        <div className="poll-bar-wrapper">
                          <div className="poll-bar-fill" style={{ height: `${percentage}%` }}>
                            <span className="poll-pct">{percentage}%</span>
                          </div>
                        </div>
                        <div className="poll-bar-label">Choice {['A','B','C','D'][i]}</div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn-submit" onClick={() => setShowPollModal(false)}>Close Modal</button>
              </div>
            </div>
          )}

          {/* Switch Question category picker Modal */}
          {showSwitchModal && (
            <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
              <div className="modal-content glass-card glow-pink" onClick={(e) => e.stopPropagation()}>
                <h2 className="golden-glow">SELECT SWITCH QUESTION CATEGORY</h2>
                <p>Choose your favorite domain category to generate a replacement card:</p>
                <div className="category-picker-grid">
                  {switchCategories.map((cat) => (
                    <button 
                      key={cat} 
                      className="category-choice-btn"
                      onClick={() => submitSwitchQuestionCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button className="btn-walkaway" onClick={() => setShowSwitchModal(false)} style={{marginTop: '1.5rem'}}>Cancel</button>
              </div>
            </div>
          )}
        </main>
      );
    }

    // Spectator view for Hotseat Round (Replica)
    const activeContestantName = liveState?.hotseat_attempt?.student_name || `Batch ${activeBatch} Contestant`;
    const progressLevel = liveState?.hotseat_attempt?.current_question_index || 0;
    const currentContestantScore = liveState?.hotseat_attempt?.score || 0;

    return (
      <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <div className="arena-orb orb-pink" />
          <div className="arena-orb orb-cyan" />
        </div>
        {renderTopbar(`SPECTATING HOTSEAT ROUND (BATCH ${activeBatch})`, "SPECTATING ARENA")}

        <div className="hotseat-layout">
          {/* Left Panel: Active replica board */}
          <div className="hotseat-console-panel">
            
            {/* Lifelines Status Row */}
            <div className="lifelines-row">
              <div className={`btn-lifeline disabled ${liveState?.hotseat_attempt?.lifeline_5050_used ? 'used' : ''}`}>
                <div className="lifeline-ring">50:50</div>
              </div>
              <div className={`btn-lifeline disabled ${liveState?.hotseat_attempt?.lifeline_poll_used ? 'used' : ''}`}>
                <div className="lifeline-ring">POLL</div>
              </div>
              <div className={`btn-lifeline disabled ${liveState?.hotseat_attempt?.lifeline_switch_used ? 'used' : ''}`}>
                <div className="lifeline-ring">SWITCH</div>
              </div>
            </div>

            {/* Display Screen */}
            <div className="active-question-section">
              <div className="glass-card panel-intro text-center glow-blue">
                <h3>Contestant: <strong className="winner-text">{activeContestantName}</strong></h3>
                <p>Current Winnings: <strong className="winner-text">₹{currentContestantScore.toLocaleString()}</strong></p>
              </div>

              {liveState.hotseat_attempt?.status !== 'playing' ? (
                <div className="glass-card text-center" style={{padding: '3rem'}}>
                  <h2 className="golden-glow">HOTSEAT COMPLETED</h2>
                  <p>Contestant run has concluded. Final winnings: <strong>₹{currentContestantScore.toLocaleString()}</strong></p>
                  <p className="helper-text">Waiting for organizer to select next batch or conclude event.</p>
                </div>
              ) : hotseatQuestion ? (
                <>
                  <span className="question-category-tag">CATEGORY: {hotseatQuestion.category}</span>
                  <article className="arena-question-card glass-card kbc-question-frame">
                    <h2>{hotseatQuestion.text}</h2>
                  </article>

                  <div className="kbc-choices-grid">
                    {hotseatQuestion.choices.map((choice, i) => (
                      <div 
                        key={choice.id}
                        className="arena-choice-btn kbc-choice disabled"
                      >
                        <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                        <div className="choice-text">{choice.text}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="glass-card text-center" style={{padding: '3rem'}}>
                  <h3>Loading active hotseat question replicas...</h3>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: replica ladder */}
          <div className="hotseat-ladder-panel glass-card">
            <h3 className="ladder-header golden-glow">KBC SCORE LADDER</h3>
            <div className="ladder-list">
              {PRIZE_MONEY_LADDER.map((step, idx) => {
                const isCurrent = step.level === (progressLevel + 1);
                const isPassed = step.level <= progressLevel;
                return (
                  <div 
                    key={step.level} 
                    className={`ladder-step ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''} ${step.checkpoint ? 'checkpoint' : ''}`}
                  >
                    <span className="step-num">{step.level}</span>
                    <span className="step-diamond">♦</span>
                    <span className="step-amount">{step.amount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fallback default
  return (
    <main className={`arena-page ${isLight ? 'theme-light' : 'theme-dark'}`}>
      <div className="arena-center">
        <h2>Live Arena Standby</h2>
        <p>Connecting with server machine...</p>
      </div>
    </main>
  );
}

export default QuizArenaPage;
