import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  submitQuizAnswer,
  hotseatPreselect,
  getMyRegistration,
  hostLockAnswer,
  getHostHotseatQuestion,
  requestHotseatLifeline,
  acknowledgeHotseatLifeline,
  approveHotseatLifeline,
  rejectHotseatLifeline,
  hostShowOptions,
  hostPauseTimer,
  hostResumeTimer,
  hostNextQuestion,
  hostTriggerIntro,
  hostCompleteIntro
} from '../../api/quizzes';
import { getAuthSession } from '../../api/auth';
import KbcStageFx from '../KbcStageFx/KbcStageFx';
import HotseatIntro from './HotseatIntro';
import './QuizArenaPage.css';

const SYMBOLS = {
  triangle: '\u25B3',
  circle: '\u25CB',
  square: '\u25A1',
  diamond: '\u25C7',
  star: '\u2605',
};

const SCORE_LADDER = [
  { level: 15, score: 150, checkpoint: true },
  { level: 14, score: 140, checkpoint: false },
  { level: 13, score: 130, checkpoint: false },
  { level: 12, score: 120, checkpoint: false },
  { level: 11, score: 110, checkpoint: false },
  { level: 10, score: 100, checkpoint: true },
  { level: 9,  score: 90, checkpoint: false },
  { level: 8,  score: 80, checkpoint: false },
  { level: 7,  score: 70, checkpoint: false },
  { level: 6,  score: 60, checkpoint: false },
  { level: 5,  score: 50, checkpoint: true },
  { level: 4,  score: 40, checkpoint: false },
  { level: 3,  score: 30, checkpoint: false },
  { level: 2,  score: 20, checkpoint: false },
  { level: 1,  score: 10, checkpoint: false }
];

function QuizArenaInner({ showBeautifulPopup }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const [theme] = useState(() => localStorage.getItem('quizverse-theme') || 'dark');
  const isLight = theme === 'light';

  // Verification Credentials State
  const [playerId, setPlayerId] = useState(() => localStorage.getItem(`quiz-${id}-player-id`) || '');
  const [eventPassword, setEventPassword] = useState(() => localStorage.getItem(`quiz-${id}-event-password`) || '');
  const [isVerified, setIsVerified] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'host') return true;
    return sessionStorage.getItem(`quiz-${id}-verified`) === 'true';
  });
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');


  // Fullscreen and Trivia states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prelimFeedback, setPrelimFeedback] = useState(null);
  
  const [showHotseatIntro, setShowHotseatIntro] = useState(false);
  const [poweringOn, setPoweringOn] = useState(false);
  const [hasSeenHotseatIntro, setHasSeenHotseatIntro] = useState(false);

  // Main Live Stage States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveState, setLiveState] = useState(null);

  const liveStateRef = useRef(liveState);
  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  // Entry stage machine: 'role_selection', 'credentials', 'instructions', 'active'
  const [userSelectedRole, setUserSelectedRole] = useState(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'host') return 'host';
    return sessionStorage.getItem(`quiz-${id}-role`) || null;
  });

  const [entryStage, setEntryStage] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'host') return 'active';
    const savedRole = sessionStorage.getItem(`quiz-${id}-role`);
    const savedEntered = sessionStorage.getItem(`quiz-${id}-entered`) === 'true';
    if (savedRole && savedEntered) return 'active';
    if (savedRole) return 'instructions';
    return 'role_selection';
  });

  const [isEntered, setIsEntered] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'host') return true;
    return sessionStorage.getItem(`quiz-${id}-entered`) === 'true';
  });

  // Save entry state to sessionStorage for smooth refresh
  useEffect(() => {
    if (userSelectedRole) {
      sessionStorage.setItem(`quiz-${id}-role`, userSelectedRole);
    } else {
      sessionStorage.removeItem(`quiz-${id}-role`);
    }
    sessionStorage.setItem(`quiz-${id}-stage`, entryStage || 'role_selection');
    sessionStorage.setItem(`quiz-${id}-verified`, isVerified ? 'true' : 'false');
    sessionStorage.setItem(`quiz-${id}-entered`, isEntered ? 'true' : 'false');
  }, [id, userSelectedRole, entryStage, isVerified, isEntered]);

  // Preliminary Round (regular) States
  const [prelimQuestion, setPrelimQuestion] = useState(null);
  const [prelimTotal, setPrelimTotal] = useState(0);
  const [prelimIndex, setPrelimIndex] = useState(0);
  const [prelimSelected, setPrelimSelected] = useState(null);
  const [prelimTimeLeft, setPrelimTimeLeft] = useState(90);
  const [prelimSubmitting, setPrelimSubmitting] = useState(false);
  const [prelimInitialized, setPrelimInitialized] = useState(false);
  const prelimTimerRef = useRef(null);

  // FFF States
  const [fffTimeLeft, setFffTimeLeft] = useState(20);
  const [fffSelectedChoice, setFffSelectedChoice] = useState(null);
  const [fffSelectedSequence, setFffSelectedSequence] = useState([]);
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
  const [pollAnimating, setPollAnimating] = useState(false);
  const [pollAnimVotes, setPollAnimVotes] = useState({});
  const pollAnimRef = useRef(null);
  const hotseatTimerRef = useRef(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchCategories, setSwitchCategories] = useState(["Science", "Bollywood", "History", "Sports", "General"]);
  const [hostHotseatData, setHostHotseatData] = useState(null);
  const [lockingHotseat, setLockingHotseat] = useState(false);
  const [hotseatTimeLeft, setHotseatTimeLeft] = useState(null);
  const [revealedChoicesCount, setRevealedChoicesCount] = useState(0);
  const [approvingLifeline, setApprovingLifeline] = useState(false);
  const [rejectingLifeline, setRejectingLifeline] = useState(false);

  const handleHotseatTimeout = async () => {
    if (submittingHotseat) return;
    try {
      setSubmittingHotseat(true);
      const res = await submitHotseatAnswer(id, null, session?.token);
      setHotseatCompleted(true);
      setHotseatStatus('failed');
      setHotseatScore(res.checkpoint_points || 0);
      showBeautifulPopup("TIME OUT!", `Time ran out! You have been dropped to ${res.checkpoint_points || 0} points.`, 'error');
    } catch (err) {
      console.error("Timeout submit failed:", err);
    } finally {
      setSubmittingHotseat(false);
    }
  };

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

  // Fetch actual registration details on mount to prevent stale localStorage player-id bugs
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const token = session?.token;
        if (!token) return;
        const reg = await getMyRegistration(id, token);
        if (reg.registered) {
          // If the player ID is different from what we had in localStorage, correct it!
          const storedPlayerId = localStorage.getItem(`quiz-${id}-player-id`);
          if (storedPlayerId !== reg.player_id) {
            setPlayerId(reg.player_id);
            localStorage.setItem(`quiz-${id}-player-id`, reg.player_id);
          }
        }
      } catch (err) {
        console.error("Failed to check current registration details:", err);
      }
    };
    checkRegistration();
  }, [id, session?.token]);

  // Handle auto-role selection from query parameters (for host)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'host' && session?.user?.role === 'admin') {
      setUserSelectedRole('host');
      setIsVerified(true);
      setEntryStage('active');
      setIsEntered(true);
    }
  }, [location.search, session]);

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

    // Initialize preliminary round if stage is regular
    if (liveState.current_stage === 'regular' && !prelimInitialized && !loading && userSelectedRole !== 'spectator') {
      initializePrelim();
    }

    const isHotseatStage = liveState.current_stage.startsWith('hotseat_batch_');
    if (isHotseatStage) {
      if (liveState.hotseat_attempt?.show_intro) {
        setShowHotseatIntro(true);
      } else {
        setShowHotseatIntro(false);
      }
    } else {
      setShowHotseatIntro(false);
    }

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
    if (isHotseatStage) {
      if (userSelectedRole === 'host') {
        loadHostHotseatQuestion();
      } else {
        loadHotseatQuestion();
      }
    }
  }, [liveState, prelimQuestion, prelimInitialized, loading, userSelectedRole, fffAnswered]);

  // Hotseat countdown timer interval manager
  useEffect(() => {
    if (hotseatTimeLeft === null) {
      if (hotseatTimerRef.current) {
        clearInterval(hotseatTimerRef.current);
        hotseatTimerRef.current = null;
      }
      return;
    }

    if (hotseatTimeLeft <= 0) {
      if (hotseatTimerRef.current) {
        clearInterval(hotseatTimerRef.current);
        hotseatTimerRef.current = null;
      }
      handleHotseatTimeout();
      return;
    }

    if (!hotseatTimerRef.current) {
      hotseatTimerRef.current = setInterval(() => {
        // Only tick down if:
        // 1. Choices are revealed by Host
        // 2. Timer is not manually paused by Host
        // 3. No pending lifeline request in progress
        const attempt = liveStateRef.current?.hotseat_attempt;
        const optionsVisible = attempt?.options_visible;
        const timerPaused = attempt?.timer_is_paused;
        const lifelinePending = attempt?.lifeline_request_status === 'requested';

        if (optionsVisible && !timerPaused && !lifelinePending) {
          setHotseatTimeLeft((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(hotseatTimerRef.current);
              hotseatTimerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (hotseatTimeLeft <= 0 && hotseatTimerRef.current) {
        clearInterval(hotseatTimerRef.current);
        hotseatTimerRef.current = null;
      }
    };
  }, [hotseatTimeLeft]);

  // Handle staggered sequential option reveals (A, B, C, D) in KBC style
  useEffect(() => {
    const attempt = liveState?.hotseat_attempt;
    if (attempt?.options_visible) {
      if (revealedChoicesCount === 4) return;
      
      setRevealedChoicesCount(1); // First choice immediately
      
      const t2 = setTimeout(() => setRevealedChoicesCount(2), 700);
      const t3 = setTimeout(() => setRevealedChoicesCount(3), 1400);
      const t4 = setTimeout(() => setRevealedChoicesCount(4), 2100);
      
      return () => {
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      setRevealedChoicesCount(0);
    }
  }, [liveState?.hotseat_attempt?.options_visible, liveState?.hotseat_attempt?.current_question_index]);

  // Handle stateful lifeline request status updates
  useEffect(() => {
    if (!liveState || liveState.student_role !== 'hotseat_player') return;
    
    const attempt = liveState.hotseat_attempt;
    if (!attempt) return;
    
    const requestStatus = attempt.lifeline_request_status;
    const pendingType = attempt.pending_lifeline_type;
    
    if (requestStatus === 'approved') {
      const applyApprovedLifeline = async () => {
        try {
          const approvedData = attempt.approved_lifeline_data || {};
          if (pendingType === '5050' && approvedData.eliminated_choice_ids) {
            setEliminatedChoiceIds(approvedData.eliminated_choice_ids);
            showBeautifulPopup("50:50 Lifeline Approved!", "Two incorrect choices have been eliminated.", "success");
          } else if (pendingType === 'poll' && approvedData.votes) {
            const finalVotes = approvedData.votes;
            setPollVotes(finalVotes);
            setShowPollModal(true);
            setPollAnimating(true);
            
            const choiceIds = hotseatQuestion ? hotseatQuestion.choices.map(c => c.id) : Object.keys(finalVotes);
            let tick = 0;
            const totalTicks = 35;
            if (pollAnimRef.current) clearInterval(pollAnimRef.current);
            pollAnimRef.current = setInterval(() => {
              tick++;
              if (tick >= totalTicks) {
                clearInterval(pollAnimRef.current);
                pollAnimRef.current = null;
                setPollAnimVotes(finalVotes);
                setPollAnimating(false);
                return;
              }
              const raws = choiceIds.map(() => Math.random());
              const sum = raws.reduce((a, b) => a + b, 0);
              const blend = Math.pow(tick / totalTicks, 3);
              const fakeVotes = {};
              let assigned = 0;
              choiceIds.forEach((cid, idx) => {
                const randomPct = Math.round((raws[idx] / sum) * 100);
                const realPct = finalVotes[cid] || 0;
                const blended = Math.round(randomPct * (1 - blend) + realPct * blend);
                fakeVotes[cid] = idx === choiceIds.length - 1 ? Math.max(0, 100 - assigned) : blended;
                assigned += fakeVotes[cid];
              });
              setPollAnimVotes(fakeVotes);
            }, 200);
          } else if (pendingType === 'switch') {
            await loadHotseatQuestion();
            setSelectedHotseatChoice(null);
            setEliminatedChoiceIds([]);
            setPollVotes(null);
            showBeautifulPopup("Switch Question Approved!", "Your active card has been replaced with a new category card.", "success");
          }
          
          await acknowledgeHotseatLifeline(id, session?.token);
        } catch (err) {
          console.error("Failed to apply approved lifeline: ", err);
        }
      };
      
      applyApprovedLifeline();
    } else if (requestStatus === 'rejected') {
      const applyRejectedLifeline = async () => {
        try {
          showBeautifulPopup("Lifeline Request Denied", `The host has rejected your request to use the ${pendingType === '5050' ? '50:50' : pendingType === 'poll' ? 'Audience Poll' : 'Switch Question'} lifeline.`, "error");
          await acknowledgeHotseatLifeline(id, session?.token);
        } catch (err) {
          console.error("Failed to acknowledge rejected lifeline: ", err);
        }
      };
      
      applyRejectedLifeline();
    }
  }, [liveState, hotseatQuestion]);

  const handleSelectParticipant = async () => {
    if (playerId) {
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

  const handleSelectHost = () => {
    setUserSelectedRole('host');
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
    if (!playerId) {
      setVerificationError('Please enter your Player ID');
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
    } catch (err) {
      setError(err.message || 'Error communicating with Live Arena.');
    }
  };

  // ==========================================
  // PRELIMINARY ROUND HANDLERS (regular)
  // ==========================================
  const initializePrelim = async () => {
    try {
      setLoading(true);
      setPrelimInitialized(true);
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
      setPrelimTotal(data.question.total_questions);
      setPrelimIndex(data.question.current_index);
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
      
      // Bypass the trivia screen entirely in round 1 (preliminary round).
      // Immediately load the next question or set prelimQuestion to null to indicate completion.
      if (res.completed) {
        setPrelimQuestion(null);
      } else {
        await loadPrelimQuestion();
      }
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
  const handleFFFChoiceClick = (choiceId) => {
    if (fffAnswered) return;
    if (fffSelectedSequence.includes(choiceId)) {
      // Remove if clicked again
      setFffSelectedSequence(fffSelectedSequence.filter(id => id !== choiceId));
    } else {
      // Add to sequence
      setFffSelectedSequence([...fffSelectedSequence, choiceId]);
    }
  };

  const handleResetFFFSequence = () => {
    if (fffAnswered) return;
    setFffSelectedSequence([]);
  };

  const handleFFFSubmit = async () => {
    if (fffAnswered) return;
    try {
      clearInterval(fffTimerRef.current);
      fffTimerRef.current = null;
      
      const endTime = performance.now();
      const elapsed = ((endTime - fffStartTimeRef.current) / 1000).toFixed(3);
      const seconds = Math.min(20.0, parseFloat(elapsed));

      const firstChoiceId = fffSelectedSequence[0] || null;
      setFffSelectedChoice(firstChoiceId);
      setFffAnswered(true);
      setFffTimeTaken(seconds);

      await submitFFFAnswer(id, firstChoiceId, seconds, session?.token, fffSelectedSequence);
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
          setSelectedHotseatChoice(data.preselected_choice_id);
          setEliminatedChoiceIds([]);
          setPollVotes(null);

          // Configure timer limit for Hotseat Q1-15:
          // Q1 - Q5 (indices 0 - 4): 60 seconds
          // Q6 - Q10 (indices 5 - 9): 120 seconds
          // Q11 - Q15 (indices 10 - 14): Infinite (null)
          const qIndex = data.current_index;
          let limit = null;
          if (qIndex < 5) {
            limit = 60;
          } else if (qIndex < 10) {
            limit = 120;
          }
          setHotseatTimeLeft(limit);
        } else {
          if (!submittingHotseat) {
            setSelectedHotseatChoice(data.preselected_choice_id);
          }
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

  const loadHostHotseatQuestion = async () => {
    try {
      const data = await getHostHotseatQuestion(id, session?.token);
      setHostHotseatData(data);
      if (data.active && data.question) {
        setHotseatTotal(data.total_questions);
        setHotseatIndex(data.current_index);
        setHotseatScore(data.score);
      }
    } catch (err) {
      console.log("Host Hotseat question not loaded yet or active:", err);
    }
  };

  const handleHostLockAnswer = async () => {
    if (lockingHotseat) return;
    try {
      setLockingHotseat(true);
      const res = await hostLockAnswer(id, session?.token);
      showBeautifulPopup("Answer Locked", res.message || "Contestant answer has been locked successfully.", "success");
      await loadHostHotseatQuestion();
    } catch (err) {
      showBeautifulPopup("Error Locking Answer", err.message || 'Failed to lock hotseat answer.', "error");
    } finally {
      setLockingHotseat(false);
    }
  };

  const handleHostShowOptions = async () => {
    try {
      const res = await hostShowOptions(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Options Revealed", "Choices are now appearing sequentially on the contestant's screen and their timer has started!", "success");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to reveal options.", "error");
    }
  };

  const handleHostPauseTimer = async () => {
    try {
      const res = await hostPauseTimer(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Timer Paused", "The contestant's countdown timer has been frozen.", "warning");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to pause timer.", "error");
    }
  };

  const handleHostResumeTimer = async () => {
    try {
      const res = await hostResumeTimer(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Timer Resumed", "The contestant's countdown timer has resumed ticking.", "success");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to resume timer.", "error");
    }
  };

  const handleHostNextQuestion = async () => {
    try {
      const res = await hostNextQuestion(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Question Pushed", "The new question has been pushed to the contestant's screen. Choices are currently hidden.", "success");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to push question.", "error");
    }
  };

  const handleHostTriggerIntro = async () => {
    try {
      const res = await hostTriggerIntro(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Intro Started", "KBC Entrance Intro plays simultaneously on all participant & spectator screens!", "success");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to trigger intro playback.", "error");
    }
  };

  const handleHostCompleteIntro = async () => {
    try {
      const res = await hostCompleteIntro(id, session?.token);
      setHostHotseatData(res.attempt);
      showBeautifulPopup("Intro Completed", "Intro ended. Game board has been unlocked for play!", "success");
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to conclude intro playback.", "error");
    }
  };

  const handleLadderLevelClick = (levelQ) => {
    if (userSelectedRole !== 'host') return;
    const currentQ = hotseatIndex + 1;
    if (levelQ > currentQ) {
      showBeautifulPopup("Question Not Reached", `🚫 You have not reached Question ${levelQ} yet! The contestant is currently playing Question ${currentQ}.`, "info");
    } else if (levelQ < currentQ) {
      showBeautifulPopup("Question Completed", `ℹ️ Question ${levelQ} has already been completed.`, "info");
    } else {
      showBeautifulPopup("Question In Progress", `✨ Contestant is currently playing Question ${levelQ} for ${SCORE_LADDER.find(l => l.level === levelQ)?.score} pts!`, "success");
    }
  };

  const handleApproveLifeline = async () => {
    if (approvingLifeline) return;
    try {
      setApprovingLifeline(true);
      await approveHotseatLifeline(id, session?.token);
      showBeautifulPopup("Approved", "Lifeline request has been approved.", "success");
      await loadHostHotseatQuestion();
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to approve lifeline.", "error");
    } finally {
      setApprovingLifeline(false);
    }
  };

  const handleRejectLifeline = async () => {
    if (rejectingLifeline) return;
    try {
      setRejectingLifeline(true);
      await rejectHotseatLifeline(id, session?.token);
      showBeautifulPopup("Rejected", "Lifeline request has been rejected.", "info");
      await loadHostHotseatQuestion();
    } catch (err) {
      showBeautifulPopup("Error", err.message || "Failed to reject lifeline.", "error");
    } finally {
      setRejectingLifeline(false);
    }
  };

  const handleHotseatChoiceClick = async (choiceId) => {
    if (liveState?.student_role !== 'hotseat_player' || submittingHotseat) return;
    if (eliminatedChoiceIds.includes(choiceId)) return; // 50:50 locked out
    const newChoiceId = selectedHotseatChoice === choiceId ? null : choiceId;
    setSelectedHotseatChoice(newChoiceId);
    try {
      await hotseatPreselect(id, newChoiceId, session?.token);
    } catch (err) {
      console.error("Failed to preselect choice:", err);
    }
  };

  const handleWalkAway = () => {
    showBeautifulPopup(
      "Confirm Walk Away",
      "Are you sure you want to WALK AWAY and lock in your current points? This ends your hotseat run.",
      "info",
      async () => {
        if (submittingHotseat) return;
        try {
          setSubmittingHotseat(true);
          const res = await hotseatWalkAway(id, session?.token);
          setHotseatCompleted(true);
          setHotseatStatus('walked_away');
          setHotseatScore(res.final_points || 0);
          showBeautifulPopup("SAFE WALK AWAY!", `You successfully walked away with ${res.final_points || 0} points!`, "success");
        } catch (err) {
          showBeautifulPopup("Error", "Error while processing walk away.", "error");
        } finally {
          setSubmittingHotseat(false);
        }
      },
      () => {},
      "Yes, Walk Away",
      "No, Keep Playing"
    );
  };

  // KBC Lifelines Activations
  const handleUse5050 = async () => {
    if (liveState?.hotseat_attempt?.lifeline_5050_used) return;
    try {
      await requestHotseatLifeline(id, '5050', '', session?.token);
      showBeautifulPopup("Lifeline Requested", "Your request for 50:50 Lifeline has been sent to the host.", "info");
    } catch (err) {
      showBeautifulPopup("Request Failed", err.message || "Failed to request 50:50 lifeline", "error");
    }
  };

  const handleUseAudiencePoll = async () => {
    if (liveState?.hotseat_attempt?.lifeline_poll_used) return;
    try {
      await requestHotseatLifeline(id, 'poll', '', session?.token);
      showBeautifulPopup("Lifeline Requested", "Your request for Audience Poll has been sent to the host.", "info");
    } catch (err) {
      showBeautifulPopup("Request Failed", err.message || "Failed to request Audience Poll", "error");
    }
  };

  const handleUseSwitchQuestion = () => {
    if (liveState?.hotseat_attempt?.lifeline_switch_used) return;
    setShowSwitchModal(true);
  };

  const submitSwitchQuestionCategory = async (category) => {
    try {
      setShowSwitchModal(false);
      await requestHotseatLifeline(id, 'switch', category, session?.token);
      showBeautifulPopup("Lifeline Requested", `Your request for Switch Question (${category}) has been sent to the host.`, "info");
    } catch (err) {
      showBeautifulPopup("Request Failed", err.message || "Failed to request Switch Question", "error");
    }
  };

  // ==========================================
  // VIEW RENDERS
  // ==========================================

  const handleExitArena = () => {
    showBeautifulPopup(
      "Exit Live Arena?",
      "Are you sure you want to EXIT the Live Arena? You will lose active connection and miss the current round.",
      "info",
      () => {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        navigate('/dashboard');
      },
      () => {},
      "Yes, Exit",
      "No, Stay"
    );
  };

  const renderTopbar = (title, badgeText = null, isTimer = false, timeLeftValue = 0, score = null) => {
    const timerWarning = timeLeftValue <= 10;
    const liveCount = liveState?.live_participants || 0;
    
    // For the regular (preliminary) round, display the total regular questions (liveState.total_questions).
    // Otherwise fallback to overall_total_questions or other metrics.
    const isRegular = liveState?.current_stage === 'regular';
    const totalQCount = isRegular
      ? (liveState?.total_questions || prelimTotal || 0)
      : (liveState?.overall_total_questions || liveState?.total_questions || prelimTotal || 0);

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

          {score !== null && (
            <div className="stat-badge glow-gold blinking-border animate-pulse" style={{
              border: '2px solid #ffd700',
              background: 'rgba(255, 215, 0, 0.08)',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px'
            }}>
              <span className="stat-icon">🏆</span>
              <span className="stat-label" style={{ color: '#ffd700', fontWeight: 'bold' }}>POINTS:</span>
              <strong className="stat-value" style={{ color: '#ffd700', fontWeight: '900' }}>{score} pts</strong>
            </div>
          )}
        </div>

        {isTimer && (
          <div className={`arena-timer ${timerWarning ? 'timer-warning' : ''}`}>
            <strong>00:{timeLeftValue < 10 ? `0${timeLeftValue}` : timeLeftValue}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {!isFullscreen && (
            <button 
              className="btn-fullscreen-toggle" 
              onClick={enterFullscreen} 
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                color: '#000',
                border: 'none',
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '900',
                fontSize: '0.85rem',
                boxShadow: '0 2px 10px rgba(255, 215, 0, 0.25)',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}
            >
              📺 GO FULLSCREEN
            </button>
          )}
          <button className="btn-exit" onClick={handleExitArena}>
            🏃 EXIT ARENA
          </button>
        </div>
      </header>
    );
  };

  // Loading indicator
  if (loading) {
    return (
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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

              {/* Host Card (Admins Only) */}
              {session?.user?.role === 'admin' && (
                <div 
                  className="role-selection-card host-card glass-card clickable glow-gold"
                  onClick={handleSelectHost}
                  style={{ border: '2px solid #ffd700', background: 'rgba(255, 215, 0, 0.03)' }}
                >
                  <div className="role-card-icon">🎙️</div>
                  <h3 style={{ color: '#ffd700' }}>ENTER AS HOST</h3>
                  <p>Command the Hotseat event, lock preselected contestant options, reveal correct answers, and read KBC trivia!</p>
                  <span className="badge-action text-gold" style={{ color: '#ffd700' }}>ENTER CONSOLE ➡️</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Credentials Stage
  if (entryStage === 'credentials') {
    return (
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
              <label>Event Security Password (If Applicable)</label>
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} locked-fullscreen`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
                <div className="podium-score">{podiumArr[1]?.score} pts</div>
                <div className="podium-block block-second">
                  <strong>2</strong>
                </div>
              </div>

              {/* 1st Place (Winner) */}
              <div className="podium-col col-first">
                <div className="winner-crown">👑</div>
                <div className="podium-avatar winner-glow">{podiumArr[0]?.name[0]}</div>
                <div className="podium-name">{podiumArr[0]?.name}</div>
                <div className="podium-score winner-text">{podiumArr[0]?.score} pts</div>
                <div className="podium-block block-first">
                  <strong>1</strong>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="podium-col col-third">
                <div className="podium-avatar">{podiumArr[2]?.name[0]}</div>
                <div className="podium-name">{podiumArr[2]?.name}</div>
                <div className="podium-score">{podiumArr[2]?.score} pts</div>
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
    if (userSelectedRole === 'spectator' || userSelectedRole === 'host') {
      const isHost = userSelectedRole === 'host';
      return (
        <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-background">
            <KbcStageFx intensity="lite" />
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar(isHost ? "Hosting Preliminary Quiz" : "Spectating Preliminary Quiz", isHost ? "HOST" : "SPECTATOR")}
          <div className="arena-center">
            <div className="arena-completed-panel glass-card text-center glow-blue" style={{maxWidth: '600px'}}>
              <div className="lock-icon">👁️</div>
              <h2 className="title-text golden-glow font-bold">{isHost ? "HOSTING PRELIMINARY ROUND" : "SPECTATING PRELIMINARY ROUND"}</h2>
              <p style={{margin: '1.5rem 0', fontSize: '1.1rem'}}>Participants are currently answering synchronized preliminary questions.</p>
              <p className="helper-text">{isHost ? "Manage the arena from your Live KBC Controller." : "Standby. The host will compute the Top 30 leaderboard and reveal batch selections soon!"}</p>
            </div>
          </div>
        </main>
      );
    }

    if (!prelimQuestion) {
      return (
        <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
          </div>

          {prelimFeedback ? (
            <div className="trivia-card glass-card glow-blue animate-fade-in">
              <div className="trivia-header-row">
                <span className={`trivia-grade-badge ${prelimFeedback.correct ? 'correct' : 'incorrect'}`}>
                  {prelimFeedback.correct ? 'CORRECT! 🚀' : 'INCORRECT ❌'}
                </span>
                <span className="trivia-category">Category: {prelimFeedback.questionCategory}</span>
              </div>
              
              <div className="trivia-question-summary">
                <h3>{prelimFeedback.questionText}</h3>
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
        <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
          <div className="arena-background">
            <KbcStageFx intensity="lite" />
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
                      <div className="choice-indicator">{['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'][idx] || idx + 1}</div>
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
                <p>Your arrangement sequence was transmitted in <strong className="winner-text">{fffTimeTaken}s</strong>!</p>
                <p className="helper-text">Stay tuned. Admin will display the speed standings once all contestants have completed.</p>
              </div>
            </div>
          ) : liveState.fff_question ? (
            <>
              <div className="glass-card panel-intro text-center">
                <h3 className="winner-text">ACCURACY & SPEED MATTERS!</h3>
                <p>Click the options in the correct sequence order from 1 to {liveState.fff_question.choices.length}. Click again to remove.</p>
              </div>

              <article className="arena-question-card glass-card glow-pink">
                <h2>{liveState.fff_question.text}</h2>
              </article>

              <div className="arena-choices-grid">
                {liveState.fff_question.choices.map((choice, i) => {
                  const seqIndex = fffSelectedSequence.indexOf(choice.id);
                  const isSelected = seqIndex !== -1;
                  return (
                    <button 
                      key={choice.id}
                      className={`arena-choice-btn fff-btn glow-glow ${isSelected ? 'fff-selected-kbc' : ''}`}
                      onClick={() => handleFFFChoiceClick(choice.id)}
                    >
                      <div className="choice-indicator">
                        {isSelected ? (
                          <span className="fff-order-badge">{seqIndex + 1}</span>
                        ) : (
                          ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'][i] || i + 1
                        )}
                      </div>
                      <div className="choice-text">{choice.text}</div>
                    </button>
                  );
                })}
              </div>

              <div className="fff-controls-row" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
                <button
                  type="button"
                  className="prelim-reset-btn"
                  onClick={handleResetFFFSequence}
                  disabled={fffSelectedSequence.length === 0}
                  style={{
                    background: 'rgba(255, 100, 100, 0.12)',
                    borderColor: 'rgba(255, 100, 100, 0.4)',
                    color: 'rgb(255, 150, 150)',
                    padding: '0.8rem 2rem',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontWeight: '900',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  RESET ARRANGEMENT
                </button>
                
                <button
                  type="button"
                  className="enter-arena-btn-card"
                  onClick={handleFFFSubmit}
                  disabled={fffSelectedSequence.length !== liveState.fff_question.choices.length}
                  style={{
                    padding: '0.8rem 3rem',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontWeight: '900',
                    letterSpacing: '0.1em',
                    cursor: fffSelectedSequence.length === liveState.fff_question.choices.length ? 'pointer' : 'not-allowed',
                    opacity: fffSelectedSequence.length === liveState.fff_question.choices.length ? 1 : 0.45
                  }}
                >
                  LOCK IN ARRANGEMENT &rarr;
                </button>
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
    const introContestantName = hostHotseatData?.contestant_name || liveState?.hotseat_attempt?.player_name;
    const introComponent = showHotseatIntro ? (
      <HotseatIntro 
        onTransitionStart={() => {
          setPoweringOn(true);
          setTimeout(() => setPoweringOn(false), 4000);
        }}
        onComplete={() => setShowHotseatIntro(false)} 
        contestantName={introContestantName} 
      />
    ) : null;

    const activeBatch = liveState.current_stage.slice(-1);
    
    // View if user is hosting in Amitabh Bachchan Mode
    if (userSelectedRole === 'host') {
      const activeContestantName = hostHotseatData?.contestant_name || `Contestant`;
      const currentContestantScore = hostHotseatData?.score || 0;
      const progressLevel = hostHotseatData?.current_index || 0;

      const correctChoice = hostHotseatData?.question?.choices?.find(c => c.is_correct);
      const correctChoiceIndicator = correctChoice ? ['A','B','C','D'][hostHotseatData.question.choices.indexOf(correctChoice)] : '';

      return (
        <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} ${poweringOn ? 'arena-power-on' : ''}`}>
          {introComponent}
          <div className="arena-background">
            <KbcStageFx intensity="lite" />
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar(`🎙️ LIVE HOTSEAT SHOW: HOST MODE`, "HOST CONSOLE", false, 0, currentContestantScore)}

          <div className="hotseat-layout">
            {/* Left Panel: Active replica board with host controls */}
            <div className="hotseat-console-panel">
              {/* Display Screen */}
              <div className="active-question-section">
                
                {/* Lifeline Request Notification Card */}
                {hostHotseatData?.lifeline_request_status === 'requested' && (
                  <div className="lifeline-request-alert glass-card glow-gold blinking-border animate-pulse" style={{
                    padding: '1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 215, 0, 0.06)',
                    border: '2px solid #ffd700',
                    marginBottom: '1.25rem',
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.25)'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffd700', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: '900' }}>
                      🛎️ LIFELINE REQUEST PENDING
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff', lineHeight: '1.4' }}>
                      Contestant <strong style={{ color: '#ffd700' }}>{activeContestantName}</strong> wants to activate the <strong style={{ color: '#ffd700', textTransform: 'uppercase', textShadow: '0 0 5px rgba(255,215,0,0.5)' }}>{hostHotseatData.pending_lifeline_type === '5050' ? '50:50' : hostHotseatData.pending_lifeline_type === 'poll' ? 'Audience Poll' : `Switch Question (${hostHotseatData.pending_lifeline_switch_category})`}</strong> lifeline.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                      <button 
                        onClick={handleApproveLifeline} 
                        disabled={approvingLifeline}
                        style={{
                          background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                          color: '#fff',
                          fontWeight: '900',
                          padding: '0.5rem 2.2rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 3px 10px rgba(76, 175, 80, 0.3)',
                          letterSpacing: '0.05em',
                          fontSize: '0.9rem'
                        }}
                      >
                        {approvingLifeline ? 'APPROVING...' : '✅ APPROVE'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="glass-card panel-intro text-center glow-gold" style={{ border: '1px solid #ffd700', background: 'rgba(255, 215, 0, 0.02)' }}>
                  <h3>Contestant: <strong className="winner-text">{activeContestantName}</strong></h3>
                  <p>Current Score: <strong className="winner-text">{currentContestantScore} pts</strong></p>
                </div>

                {hostHotseatData?.active && hostHotseatData?.question ? (
                  <>
                    <span className="question-category-tag">CATEGORY: {hostHotseatData.question.category || 'General'}</span>
                    <article className="arena-question-card glass-card kbc-question-frame" style={{ border: '2px solid rgba(255, 215, 0, 0.25)', background: 'rgba(255, 215, 0, 0.01)' }}>
                      <h2>{hostHotseatData.question.text}</h2>
                    </article>

                    <div className="kbc-choices-grid">
                      {hostHotseatData.question.choices.map((choice, i) => {
                        const isPreselected = hostHotseatData.preselected_choice_id === choice.id;

                        return (
                          <div 
                            key={choice.id}
                            className={`arena-choice-btn kbc-choice disabled ${isPreselected ? 'selected' : ''}`}
                            style={{
                              border: isPreselected ? '2px solid #ff9800' : '1px solid var(--admin-border)',
                              background: isPreselected ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0,0,0,0.2)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                              <div className="choice-text">{choice.text}</div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {isPreselected && (
                                <span className="blinking" style={{ background: '#ff9800', color: '#000', fontSize: '0.65rem', fontWeight: '900', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                                  PLAYER SELECTED
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cinematic Pacing Controller Panel */}
                    <div className="glass-card" style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--admin-border)',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '10px',
                      marginTop: '2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ margin: '0 0 0.2rem 0', color: '#ffd700', fontSize: '1rem', fontWeight: 'bold' }}>
                          🎬 PACING SYSTEM CONTROLS
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                          Manage choices reveal and manual countdown holds in real-time.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        {/* Play/Stop Intro Button */}
                        <button
                          onClick={hostHotseatData.show_intro ? handleHostCompleteIntro : handleHostTriggerIntro}
                          style={{
                            background: hostHotseatData.show_intro 
                              ? 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)'
                              : 'linear-gradient(135deg, #00bfff 0%, #0080ff 100%)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: '900',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: hostHotseatData.show_intro 
                              ? '0 2px 10px rgba(255, 77, 77, 0.25)' 
                              : '0 2px 10px rgba(0, 191, 255, 0.25)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem'
                          }}
                        >
                          {hostHotseatData.show_intro ? '⏹️ STOP INTRO' : '🎥 PLAY INTRO'}
                        </button>

                        {/* Next Question Push Button */}
                        {!hostHotseatData.showing_question && (
                          <button
                            onClick={handleHostNextQuestion}
                            style={{
                              background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                              color: '#fff',
                              border: 'none',
                              fontWeight: '900',
                              padding: '0.6rem 1.5rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 10px rgba(76, 175, 80, 0.25)',
                              textTransform: 'uppercase',
                              fontSize: '0.85rem'
                            }}
                          >
                            ➡️ PUSH NEXT QUESTION
                          </button>
                        )}

                        {/* Show Options Button */}
                        {hostHotseatData.showing_question && !hostHotseatData.options_visible && (
                          <button
                            onClick={handleHostShowOptions}
                            style={{
                              background: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
                              color: '#fff',
                              border: 'none',
                              fontWeight: '900',
                              padding: '0.6rem 1.5rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 10px rgba(0, 188, 212, 0.25)',
                              textTransform: 'uppercase',
                              fontSize: '0.85rem'
                            }}
                          >
                            👁️ SHOW OPTIONS
                          </button>
                        )}

                        {/* Timer Control Buttons */}
                        {hostHotseatData.showing_question && hostHotseatData.options_visible && (
                          <button
                            onClick={hostHotseatData.timer_is_paused ? handleHostResumeTimer : handleHostPauseTimer}
                            style={{
                              background: hostHotseatData.timer_is_paused 
                                ? 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)'
                                : 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
                              color: hostHotseatData.timer_is_paused ? '#000' : '#fff',
                              border: 'none',
                              fontWeight: '900',
                              padding: '0.6rem 1.5rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                              textTransform: 'uppercase',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            {hostHotseatData.timer_is_paused ? '▶️ RESUME TIMER' : '⏸️ PAUSE TIMER'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Host Lock Control */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                      {hostHotseatData.preselected_choice_id ? (
                        <button 
                          className="btn-submit glow-button" 
                          onClick={handleHostLockAnswer}
                          disabled={lockingHotseat}
                          style={{
                            background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                            color: '#000',
                            fontWeight: '900',
                            padding: '1rem 3.5rem',
                            fontSize: '1.25rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {lockingHotseat ? '🔐 LOCKING ANSWER...' : '🔐 LOCK ANSWER (Check Correctness)'}
                        </button>
                      ) : (
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem 3rem', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.2)', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                          ⏳ WAITING FOR CONTESTANT TO PRE-SELECT AN OPTION...
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="glass-card text-center" style={{ padding: '4rem' }}>
                    <h2 className="golden-glow">🎙️ CONSOLE ACTIVE</h2>
                    <p style={{ fontSize: '1.1rem' }}>No active contestant in the hotseat or awaiting the start of next question.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Interactive Ladder progress timeline + Correct Answer & Trivia */}
            <div className="hotseat-ladder-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
              
              {/* Answer Key & Trivia Box */}
              {hostHotseatData?.active && hostHotseatData?.question && (
                <div className="admin-key-trivia-box glass-card glow-cyan" style={{ padding: '1.25rem', border: '1px solid rgba(0, 188, 212, 0.4)', background: 'rgba(0, 188, 212, 0.04)', borderRadius: '10px' }}>
                  <h3 className="golden-glow" style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    🔑 ANSWER KEY & INFO
                  </h3>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Correct Answer</span>
                    <div style={{ fontSize: '1.05rem', color: '#4caf50', fontWeight: '900', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76,175,80,0.3)', padding: '0.6rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: '#4caf50', color: '#000', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.85rem' }}>{correctChoiceIndicator}</span>
                      <span>{correctChoice ? correctChoice.text : 'N/A'}</span>
                    </div>
                  </div>
                  
                  {hostHotseatData.question.trivia && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>💡 Host Trivia Note</span>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: '1.45', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        "{hostHotseatData.question.trivia}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="ladder-header golden-glow" style={{ fontSize: '1.1rem', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>SCORE LADDER (HOST)</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '0', marginBottom: '1rem' }}>Click to inspect constraints</p>
                <div className="ladder-list">
                  {SCORE_LADDER.map((step, idx) => {
                    const isActive = step.level === (progressLevel + 1);
                    const isPassed = step.level <= progressLevel;
                    return (
                      <div 
                        key={step.level} 
                        className={`ladder-step ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''} ${step.checkpoint ? 'checkpoint' : ''}`}
                        onClick={() => handleLadderLevelClick(step.level)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="step-num">{step.level}</span>
                        <span className="step-score">{step.score} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      );
    }

    // View if player is the actual Hotseat Contestant
    if (liveState.student_role === 'hotseat_player') {
      if (hotseatCompleted) {
        return (
          <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} ${poweringOn ? 'arena-power-on' : ''}`}>
            <div className="arena-center">
              <div className="arena-completed-panel glass-card text-center glow-blue">
                <span className="arena-status">Hotseat Finished</span>
                <h2 className="golden-glow">Round Concluded</h2>
                <div className="arena-score-display">
                  <span className="score-kicker">Final Score</span>
                  <strong>{hotseatScore} pts</strong>
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
          <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} ${poweringOn ? 'arena-power-on' : ''}`}>
            {introComponent}
            <div className="arena-center">
              <h2>Loading active Hotseat question card...</h2>
            </div>
          </main>
        );
      }

      if (liveState?.hotseat_attempt && !liveState.hotseat_attempt.showing_question) {
        return (
          <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} ${poweringOn ? 'arena-power-on' : ''}`}>
            {introComponent}
            <div className="arena-background">
              <KbcStageFx intensity="lite" />
              <div className="arena-orb orb-pink" />
              <div className="arena-orb orb-cyan" />
            </div>
            {renderTopbar(`HOTSEAT LIVE: ${session?.user?.full_name}`, "HOTSEAT CONTENDER", false, 0, liveState?.hotseat_attempt?.score)}

            <div className="arena-center animate-fade-in" style={{ padding: '2rem' }}>
              <div className="glass-card glow-green text-center" style={{ maxWidth: '600px', width: '95%', padding: '3.5rem', borderRadius: '16px', border: '1px solid rgba(76, 175, 80, 0.4)', background: 'rgba(76, 175, 80, 0.02)' }}>
                <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem', animation: 'scaleUp 0.3s ease' }}>🎉</div>
                <h2 className="golden-glow" style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', fontWeight: '900', letterSpacing: '0.05em' }}>CORRECT ANSWER!</h2>
                <p style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 2rem 0', lineHeight: '1.6' }}>
                  Congratulations! You have successfully answered the question. 
                  <br />
                  Total Points Earned: <strong className="winner-text" style={{ color: '#ffd700', fontSize: '1.5rem', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>{liveState.hotseat_attempt.score} pts</strong>
                </p>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  ⏳ Awaiting the Host to push the next question...
                </div>
              </div>
            </div>
          </main>
        );
      }

      return (
        <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'} ${poweringOn ? 'arena-power-on' : ''}`}>
          {introComponent}
          <div className="arena-background">
            <KbcStageFx intensity="lite" />
            <div className="arena-orb orb-pink" />
            <div className="arena-orb orb-cyan" />
          </div>
          {renderTopbar(`HOTSEAT LIVE: ${session?.user?.full_name}`, "HOTSEAT CONTENDER", hotseatTimeLeft !== null, hotseatTimeLeft, liveState?.hotseat_attempt?.score)}

          {/* Pending Lifeline Request Overlay */}
          {liveState?.hotseat_attempt?.lifeline_request_status === 'requested' && (
            <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 999 }}>
              <div className="modal-content glass-card glow-gold text-center animate-pulse" style={{ maxWidth: '450px', padding: '2.5rem' }}>
                <div className="loading-spinner-hourglass" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⌛</div>
                <h2 className="golden-glow" style={{ margin: '0 0 1rem 0', fontWeight: '900', letterSpacing: '0.05em' }}>LIFELINE PENDING</h2>
                <p style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  Your request to use the <strong style={{ color: '#ffd700', textTransform: 'uppercase' }}>{liveState.hotseat_attempt.pending_lifeline_type === '5050' ? '50:50' : liveState.hotseat_attempt.pending_lifeline_type === 'poll' ? 'Audience Poll' : 'Switch Question'}</strong> lifeline is awaiting approval from the host.
                </p>
                <div className="helper-text" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                  Please standby. The host will approve your request shortly...
                </div>
              </div>
            </div>
          )}

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
                    const isChoiceVisible = liveState?.hotseat_attempt?.options_visible && (revealedChoicesCount > i);
                    return (
                      <button 
                        key={choice.id}
                        className={`arena-choice-btn kbc-choice ${selectedHotseatChoice === choice.id ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`}
                        onClick={() => handleHotseatChoiceClick(choice.id)}
                        disabled={isEliminated || submittingHotseat || !isChoiceVisible}
                        style={{
                          opacity: isChoiceVisible ? 1 : 0,
                          pointerEvents: isChoiceVisible ? 'auto' : 'none',
                          transform: isChoiceVisible ? 'translateY(0)' : 'translateY(10px)',
                          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                        }}
                      >
                        <div className="choice-indicator">{['A','B','C','D'][i]}</div>
                        <div className="choice-text">{isEliminated ? "" : choice.text}</div>
                      </button>
                    );
                  })}
                </div>

                {liveState?.hotseat_attempt?.options_visible && (
                  <div className="hotseat-action-row" style={{ justifyContent: 'center' }}>
                    <button className="btn-walkaway glow-red" onClick={handleWalkAway} disabled={submittingHotseat}>
                      🏃 WALK AWAY (Lock Current Score)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Score Ladder */}
            <div className="hotseat-ladder-panel glass-card">
              <h3 className="ladder-header golden-glow">SCORE LADDER</h3>
              <div className="ladder-list">
                {SCORE_LADDER.map((step, idx) => {
                  const isCurrent = step.level === (hotseatIndex + 1);
                  const isPassed = step.level <= hotseatIndex;
                  return (
                    <div 
                      key={step.level} 
                      className={`ladder-step ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''} ${step.checkpoint ? 'checkpoint' : ''}`}
                    >
                      <span className="step-num">{step.level}</span>
                      <span className="step-score">{step.score} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audience Poll Modal */}
          {showPollModal && pollVotes && (
            <div className="modal-overlay">
              <div className="modal-content poll-modal glass-card glow-blue" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '2.5rem' }}>
                <h2 className="golden-glow" style={{ marginBottom: '0.5rem' }}>
                  {pollAnimating ? 'COLLECTING VOTES...' : 'AUDIENCE POLL RESULTS'}
                </h2>
                {pollAnimating && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem', animation: 'pulse 1.2s infinite' }}>
                    📊 Audience members are submitting their votes...
                  </p>
                )}
                <div className="poll-chart-container">
                  {hotseatQuestion.choices.map((choice, i) => {
                    const displayVotes = pollAnimating ? pollAnimVotes : pollVotes;
                    const percentage = (displayVotes && displayVotes[choice.id]) || 0;
                    const isHighest = !pollAnimating && percentage === Math.max(...Object.values(pollVotes));
                    return (
                      <div key={choice.id} className="poll-bar-col">
                        <div className="poll-bar-wrapper">
                          <div
                            className={`poll-bar-fill ${isHighest && !pollAnimating ? 'poll-bar-winner' : ''}`}
                            style={{
                              height: `${percentage}%`,
                              transition: pollAnimating ? 'height 0.15s linear' : 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              background: isHighest && !pollAnimating
                                ? 'linear-gradient(180deg, #ffd700, #ff8c00)'
                                : undefined
                            }}
                          >
                            <span className="poll-pct">{percentage}%</span>
                          </div>
                        </div>
                        <div className="poll-bar-label" style={{ fontWeight: isHighest && !pollAnimating ? '900' : '600', color: isHighest && !pollAnimating ? '#ffd700' : undefined }}>
                          {['A','B','C','D','E','F','G','H'][i] || i + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!pollAnimating && (
                  <button className="btn-submit" onClick={() => setShowPollModal(false)} style={{ marginTop: '1.5rem' }}>CLOSE RESULTS</button>
                )}
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
      <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
        <div className="arena-background">
          <KbcStageFx intensity="lite" />
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
                <p>Current Score: <strong className="winner-text">{currentContestantScore} pts</strong></p>
              </div>

              {liveState.hotseat_attempt?.status !== 'playing' ? (
                <div className="glass-card text-center" style={{padding: '3rem'}}>
                  <h2 className="golden-glow">HOTSEAT COMPLETED</h2>
                  <p>Contestant run has concluded. Final score: <strong>{currentContestantScore} pts</strong></p>
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
            <h3 className="ladder-header golden-glow">SCORE LADDER</h3>
            <div className="ladder-list">
              {SCORE_LADDER.map((step, idx) => {
                const isCurrent = step.level === (progressLevel + 1);
                const isPassed = step.level <= progressLevel;
                return (
                  <div 
                    key={step.level} 
                    className={`ladder-step ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''} ${step.checkpoint ? 'checkpoint' : ''}`}
                  >
                    <span className="step-num">{step.level}</span>
                    <span className="step-score">{step.score} pts</span>
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
    <main className={`arena-page kbc-broadcast ${isLight ? 'theme-light' : 'theme-dark'}`}>
      <div className="arena-center">
        <h2>Live Arena Standby</h2>
        <p>Connecting with server machine...</p>
      </div>
    </main>
  );
}

function QuizArenaPage() {
  const [popupConfig, setPopupConfig] = useState(null);

  const showBeautifulPopup = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'OK', cancelText = 'Cancel') => {
    setPopupConfig({ title, message, type, onConfirm, onCancel, confirmText, cancelText });
  };

  return (
    <>
      <QuizArenaInner showBeautifulPopup={showBeautifulPopup} />
      {popupConfig && (
        <div className="modal-overlay" style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className={`modal-content glass-card glow-${popupConfig.type === 'error' ? 'red' : popupConfig.type === 'success' ? 'green' : 'blue'}`} style={{ maxWidth: '450px', width: '90%', padding: '2rem', textAlign: 'center', animation: 'scaleUp 0.3s ease', borderRadius: '12px' }}>
            <h2 style={{
              color: popupConfig.type === 'error' ? 'var(--admin-red)' : popupConfig.type === 'success' ? '#4caf50' : 'var(--admin-cyan)',
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.8rem',
              letterSpacing: '0.05em',
              fontWeight: '900'
            }}>
              {popupConfig.type === 'error' ? '🚨 ' : popupConfig.type === 'success' ? '🎉 ' : '💡 '}
              {popupConfig.title}
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.5', margin: '0 0 2rem 0', color: 'rgba(255, 255, 255, 0.95)' }}>
              {popupConfig.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {popupConfig.onCancel && (
                <button 
                  className="prelim-reset-btn" 
                  onClick={() => {
                    popupConfig.onCancel();
                    setPopupConfig(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '0.6rem 2rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {popupConfig.cancelText || 'Cancel'}
                </button>
              )}
              <button 
                className="btn-submit" 
                onClick={() => {
                  if (popupConfig.onConfirm) popupConfig.onConfirm();
                  setPopupConfig(null);
                }}
                style={{
                  padding: '0.6rem 2.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: popupConfig.type === 'error' 
                    ? 'linear-gradient(135deg, #f44336 0%, #c62828 100%)' 
                    : popupConfig.type === 'success' 
                      ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)' 
                      : 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '900',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
              >
                {popupConfig.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuizArenaPage;
