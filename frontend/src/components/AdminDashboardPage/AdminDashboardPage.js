import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthSession, saveAuthSession, getSchools, getProgramsBySchool, getBranchesByProgram, updateUserCredentials } from '../../api/auth';
import {
  getAdminQuizzes,
  updateAdminQuiz,
  createAdminQuiz,
  getAdminStats,
  deleteAdminQuiz,
  updateQuizStage,
  setQuizBatches,
  getFFFResults,
  promoteToHotseat,
  getPrelimScores,
  getQuizDetails,
  getQuizLiveState,
  getEnrolledStudents,
  removeRegistration,
  enrollStudentManual,
  bulkEnrollStudents,
  downloadEnrollmentTemplate
} from '../../api/quizzes';
import KbcStageFx from '../KbcStageFx/KbcStageFx';
import './AdminDashboardPage.css';

let rawApiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

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

function AdminDashboardInner({ showBeautifulPopup }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('quizverse-theme') || 'dark');
  const [selectedPromoteStudentId, setSelectedPromoteStudentId] = useState('');
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
  const [editingQuizId, setEditingQuizId] = useState(null);
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
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedManageQuiz, setSelectedManageQuiz] = useState(null);
  const [manageQuestions, setManageQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [newQuestionData, setNewQuestionData] = useState({
    text: '',
    question_type: 'regular',
    category: 'General',
    marks: 1,
    trivia: '',
    choices: [
      { text: '', is_correct: true, correct_order: null },
      { text: '', is_correct: false, correct_order: null },
      { text: '', is_correct: false, correct_order: null },
      { text: '', is_correct: false, correct_order: null }
    ]
  });

  useEffect(() => {
    const isFFF = newQuestionData.question_type.startsWith('fff_');
    if (isFFF) {
      if (newQuestionData.choices.length < 8) {
        const needed = 8 - newQuestionData.choices.length;
        const extra = Array.from({ length: needed }, (_, i) => ({
          text: '',
          is_correct: false,
          correct_order: newQuestionData.choices.length + i + 1
        }));
        setNewQuestionData(prev => ({
          ...prev,
          choices: [...prev.choices, ...extra]
        }));
      }
    } else {
      if (newQuestionData.choices.length !== 4) {
        setNewQuestionData(prev => ({
          ...prev,
          choices: [
            { text: prev.choices[0]?.text || '', is_correct: true, correct_order: null },
            { text: prev.choices[1]?.text || '', is_correct: false, correct_order: null },
            { text: prev.choices[2]?.text || '', is_correct: false, correct_order: null },
            { text: prev.choices[3]?.text || '', is_correct: false, correct_order: null }
          ]
        }));
      }
    }
  }, [newQuestionData.question_type]);

  const session = getAuthSession();
  const isLight = theme === 'light';
  const admin = {
    name: session?.student?.full_name || 'Administrator',
    role: 'System Overseer',
  };

  const navigation = [
    { label: 'Overview', symbol: SYMBOLS.square },
    { label: 'Manage Quizzes', symbol: SYMBOLS.quizzes },
    { label: 'Live KBC Controller', symbol: SYMBOLS.sun },
    { label: 'Manage Students', symbol: SYMBOLS.users },
    { label: 'System Settings', symbol: SYMBOLS.gear },
  ];

  // KBC Controller States
  const [selectedKbcQuizId, setSelectedKbcQuizId] = useState(null);
  const [kbcQuizDetail, setKbcQuizDetail] = useState(null);
  const [kbcLiveState, setKbcLiveState] = useState(null);
  const [prelimScoresList, setPrelimScoresList] = useState([]);
  const [fffResultsData, setFffResultsData] = useState(null);
  const [kbcLoading, setKbcLoading] = useState(false);
  const [batch1Input, setBatch1Input] = useState('');
  const [batch2Input, setBatch2Input] = useState('');
  const [batch3Input, setBatch3Input] = useState('');


  // Manage Students States
  const [selectedEnrollQuizId, setSelectedEnrollQuizId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrollForm, setEnrollForm] = useState({ fullName: '', email: '', collegeId: '', paymentStatus: 'paid' });
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollFile, setEnrollFile] = useState(null);

  // System Settings States
  const [settingsForm, setSettingsForm] = useState({
    email: session?.user?.email || 'admin@quizverse.com',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Custom Live Event Configuration States stored in localStorage
  const [prelimDuration, setPrelimDuration] = useState(() => parseInt(localStorage.getItem('quizverse_cfg_prelim_duration') || '90'));
  const [fffDuration, setFffDuration] = useState(() => parseInt(localStorage.getItem('quizverse_cfg_fff_duration') || '20'));
  const [hotseatQ1Q5Duration, setHotseatQ1Q5Duration] = useState(() => parseInt(localStorage.getItem('quizverse_cfg_hotseat_q1_q5_duration') || '60'));
  const [hotseatQ6Q10Duration, setHotseatQ6Q10Duration] = useState(() => parseInt(localStorage.getItem('quizverse_cfg_hotseat_q6_q10_duration') || '120'));
  const [autoApproveEnrollment, setAutoApproveEnrollment] = useState(() => localStorage.getItem('quizverse_cfg_auto_approve_enrollment') === 'true');

  const fetchEnrolledStudents = async (quizId) => {
    if (!quizId) {
      setEnrolledStudents([]);
      return;
    }
    try {
      setEnrollLoading(true);
      const data = await getEnrolledStudents(quizId, session?.token);
      setEnrolledStudents(data || []);
    } catch (err) {
      console.error("Error fetching enrolled students:", err);
      alert(err.message || 'Failed to fetch enrolled students');
    } finally {
      setEnrollLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Manage Students' && selectedEnrollQuizId) {
      fetchEnrolledStudents(selectedEnrollQuizId);
    }
  }, [activeTab, selectedEnrollQuizId]);

  useEffect(() => {
    if (activeTab === 'Manage Students' && quizzes.length > 0 && !selectedEnrollQuizId) {
      setSelectedEnrollQuizId(quizzes[0].id);
    }
  }, [activeTab, quizzes]);

  const handleEnrollManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEnrollQuizId) {
      alert('Please select a quiz first.');
      return;
    }
    try {
      setEnrollLoading(true);
      const payload = {
        full_name: enrollForm.fullName,
        email: enrollForm.email,
        college_id: enrollForm.collegeId,
        payment_status: enrollForm.paymentStatus
      };
      const res = await enrollStudentManual(selectedEnrollQuizId, payload, session?.token);
      alert(res.detail || 'Student enrolled successfully!');
      setEnrollForm({ fullName: '', email: '', collegeId: '', paymentStatus: 'paid' });
      fetchEnrolledStudents(selectedEnrollQuizId);
    } catch (err) {
      alert(err.message || 'Failed to enroll student manually');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleBulkEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEnrollQuizId) {
      alert('Please select a quiz first.');
      return;
    }
    if (!enrollFile) {
      alert('Please select a CSV or XLSX file first.');
      return;
    }
    try {
      setEnrollLoading(true);
      const res = await bulkEnrollStudents(selectedEnrollQuizId, enrollFile, session?.token);
      alert(res.detail || 'Bulk enrollment completed!');
      setEnrollFile(null);
      const fileInput = document.getElementById('bulk-enroll-file-input');
      if (fileInput) fileInput.value = '';
      fetchEnrolledStudents(selectedEnrollQuizId);
    } catch (err) {
      alert(err.message || 'Failed to bulk enroll students');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleSaveSettingsSubmit = async (e) => {
    e.preventDefault();
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmNewPassword) {
      alert("New password and confirmation do not match.");
      return;
    }
    
    try {
      setSettingsLoading(true);
      const payload = {
        email: settingsForm.email
      };
      if (settingsForm.newPassword) {
        payload.password = settingsForm.newPassword;
        payload.current_password = settingsForm.currentPassword;
      }
      
      const res = await updateUserCredentials(session?.token, payload);
      
      const currentSession = getAuthSession();
      if (currentSession) {
        currentSession.user = {
          ...currentSession.user,
          email: res.user.email
        };
        saveAuthSession(currentSession);
      }
      
      setSettingsForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }));
      
      alert(res.message || "Account settings updated successfully.");
    } catch (err) {
      console.error("Error updating settings:", err);
      alert(err.message || "Failed to update settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('quizverse_cfg_prelim_duration', prelimDuration.toString());
    localStorage.setItem('quizverse_cfg_fff_duration', fffDuration.toString());
    localStorage.setItem('quizverse_cfg_hotseat_q1_q5_duration', hotseatQ1Q5Duration.toString());
    localStorage.setItem('quizverse_cfg_hotseat_q6_q10_duration', hotseatQ6Q10Duration.toString());
    localStorage.setItem('quizverse_cfg_auto_approve_enrollment', autoApproveEnrollment.toString());
    alert("Live Event Preferences saved successfully.");
  };

  const handleResetLiveEventState = () => {
    showBeautifulPopup(
      "Reset Live Event State?",
      "Are you absolutely sure you want to reset the KBC live round states? This will reset all active hotseat attempts and fff speeds back to their zero marks.",
      "warning",
      () => {
        alert("KBC live stage state has been successfully reset across the cluster!");
      }
    );
  };

  const handleRemoveRegistration = async (registrationId, studentName) => {
    showBeautifulPopup(
      "Remove Registration?",
      `Are you sure you want to remove "${studentName}" from this quiz?\n\nThis will also delete their quiz attempt, answers, and FFF submissions. They will be able to re-register.`,
      "warning",
      async () => {
        try {
          setEnrollLoading(true);
          const res = await removeRegistration(selectedEnrollQuizId, registrationId, session?.token);
          showBeautifulPopup("Success", res.detail || 'Registration removed successfully.', "success");
          fetchEnrolledStudents(selectedEnrollQuizId);
        } catch (err) {
          showBeautifulPopup("Error", err.message || 'Failed to remove registration.', "error");
        } finally {
          setEnrollLoading(false);
        }
      },
      () => {},
      "Yes, Remove",
      "Cancel"
    );
  };

  const handleDownloadEnrollmentTemplate = async () => {
    try {
      setEnrollLoading(true);
      const blob = await downloadEnrollmentTemplate(session?.token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_enrollment_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message || 'Failed to download student enrollment template');
    } finally {
      setEnrollLoading(false);
    }
  };

  const KBC_STAGES = [
    { value: 'regular', label: 'Preliminary Quiz' },
    { value: 'batch_selection', label: 'Batch Configuration' },
    { value: 'fff_batch_1', label: 'FFF — Batch 1' },
    { value: 'fff_batch_2', label: 'FFF — Batch 2' },
    { value: 'fff_batch_3', label: 'FFF — Batch 3' },
    { value: 'hotseat_batch_1', label: 'Hotseat — Batch 1' },
    { value: 'hotseat_batch_2', label: 'Hotseat — Batch 2' },
    { value: 'hotseat_batch_3', label: 'Hotseat — Batch 3' },
    { value: 'completed', label: 'Event Completed' }
  ];

  const KBC_LADDER = [
    { q: 15, val: '150 pts', jackpot: true },
    { q: 14, val: '140 pts' },
    { q: 13, val: '130 pts' },
    { q: 12, val: '120 pts' },
    { q: 11, val: '110 pts' },
    { q: 10, val: '100 pts', checkpoint: true },
    { q: 9, val: '90 pts' },
    { q: 8, val: '80 pts' },
    { q: 7, val: '70 pts' },
    { q: 6, val: '60 pts' },
    { q: 5, val: '50 pts', checkpoint: true },
    { q: 4, val: '40 pts' },
    { q: 3, val: '30 pts' },
    { q: 2, val: '20 pts' },
    { q: 1, val: '10 pts' }
  ];

  const fetchKbcControllerData = async (quizId) => {
    if (!quizId) return;
    try {
      const token = session?.token;
      const detail = await getQuizDetails(quizId, token);
      setKbcQuizDetail(detail);

      // Fetch live-state (for hotseat attempt info)
      try {
        const liveState = await getQuizLiveState(quizId, token);
        setKbcLiveState(liveState);
      } catch (e) {
        console.error("Error fetching KBC live state:", e);
      }

      // Fetch prelim scores
      try {
        const scores = await getPrelimScores(quizId, token);
        setPrelimScoresList(scores);
      } catch (e) {
        console.error("Error fetching prelim scores:", e);
      }

      // Fetch FFF results if in FFF stage or Hotseat stage
      const stage = detail.current_stage;
      if (stage.startsWith('fff_') || stage.startsWith('hotseat_')) {
        try {
          const fffData = await getFFFResults(quizId, token);
          setFffResultsData(fffData);
        } catch (e) {
          console.error("Error fetching FFF results:", e);
          setFffResultsData(null);
        }
      } else {
        setFffResultsData(null);
      }


    } catch (err) {
      console.error("Error fetching KBC controller data:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Live KBC Controller' && selectedKbcQuizId) {
      // Fetch immediately
      fetchKbcControllerData(selectedKbcQuizId);

      // Poll every 3 seconds
      const interval = setInterval(() => {
        fetchKbcControllerData(selectedKbcQuizId);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [activeTab, selectedKbcQuizId]);

  useEffect(() => {
    if (kbcQuizDetail) {
      setBatch1Input(kbcQuizDetail.batch_1_players?.join(', ') || '');
      setBatch2Input(kbcQuizDetail.batch_2_players?.join(', ') || '');
      setBatch3Input(kbcQuizDetail.batch_3_players?.join(', ') || '');
    }
  }, [kbcQuizDetail?.id]);

  const handleUpdateStage = async (stage) => {
    try {
      setKbcLoading(true);
      await updateQuizStage(selectedKbcQuizId, stage, session?.token);
      await fetchKbcControllerData(selectedKbcQuizId);
    } catch (err) {
      alert(err.message || 'Failed to update stage');
    } finally {
      setKbcLoading(false);
    }
  };


  const handleAutoGenerateBatches = async () => {
    try {
      setKbcLoading(true);
      await setQuizBatches(selectedKbcQuizId, [], [], [], session?.token);
      const data = await getQuizDetails(selectedKbcQuizId, session?.token);
      setKbcQuizDetail(data);
      setBatch1Input(data.batch_1_players?.join(', ') || '');
      setBatch2Input(data.batch_2_players?.join(', ') || '');
      setBatch3Input(data.batch_3_players?.join(', ') || '');
      alert('Batches automatically configured based on top 30 preliminary scorers.');
    } catch (err) {
      alert(err.message || 'Failed to auto-generate batches');
    } finally {
      setKbcLoading(false);
    }
  };

  const handleSaveBatches = async () => {
    try {
      setKbcLoading(true);
      const parseCsv = (str) => str.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
      const b1 = parseCsv(batch1Input);
      const b2 = parseCsv(batch2Input);
      const b3 = parseCsv(batch3Input);
      
      await setQuizBatches(selectedKbcQuizId, b1, b2, b3, session?.token);
      alert('Batches saved successfully.');
      await fetchKbcControllerData(selectedKbcQuizId);
    } catch (err) {
      alert(err.message || 'Failed to save batches');
    } finally {
      setKbcLoading(false);
    }
  };

  const handlePromoteToHotseat = async (studentId) => {
    try {
      setKbcLoading(true);
      await promoteToHotseat(selectedKbcQuizId, studentId, session?.token);
      alert('Student successfully promoted to Hotseat!');
      await fetchKbcControllerData(selectedKbcQuizId);
    } catch (err) {
      alert(err.message || 'Failed to promote student');
    } finally {
      setKbcLoading(false);
    }
  };

  const getNextStageValue = (current) => {
    const idx = KBC_STAGES.findIndex(s => s.value === current);
    if (idx !== -1 && idx < KBC_STAGES.length - 1) {
      return KBC_STAGES[idx + 1].value;
    }
    return null;
  };

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

  const handleCreateNewClick = () => {
    setEditingQuizId(null);
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
    setShowModal(true);
  };

  const handleEditClick = (quiz) => {
    setEditingQuizId(quiz.id);
    
    const splitDateTime = (isoString) => {
      if (!isoString) return { date: '', time: '' };
      try {
        const d = new Date(isoString);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
        return {
          date: local.split('T')[0],
          time: local.split('T')[1].substring(0,5)
        };
      } catch(e) { return { date: '', time: '' }; }
    }

    const event = splitDateTime(quiz.event_date);
    const regOpen = splitDateTime(quiz.registration_open_date);
    const regClose = splitDateTime(quiz.registration_close_date);

    setFormData({
      title: quiz.title || '',
      description: quiz.description || '',
      rules_instructions: quiz.rules_instructions || '',
      event_date: event.date,
      event_time: event.time,
      registration_open_date: regOpen.date,
      registration_open_time: regOpen.time,
      registration_close_date: regClose.date,
      registration_close_time: regClose.time,
      max_participants: quiz.max_participants ? quiz.max_participants.toString() : '',
      registration_fee: quiz.registration_fee ? quiz.registration_fee.toString() : '0',
      visible_to_students: quiz.visible_to_students || false,
      is_registration_open: quiz.is_registration_open || false,
      require_eligibility: !!(quiz.allowed_schools?.length || quiz.allowed_programs?.length || quiz.allowed_branches?.length),
      eligibility_school: quiz.allowed_schools?.[0] || '',
      eligibility_programs: quiz.allowed_programs || [],
      eligibility_branches: quiz.allowed_branches || []
    });
    
    setShowModal(true);
  };

  const handleDeleteClick = async (quizId) => {
    showBeautifulPopup(
      "Delete Quiz?",
      "Are you sure you want to completely delete this quiz? This action cannot be undone.",
      "warning",
      async () => {
        try {
          await deleteAdminQuiz(quizId, session?.token);
          await fetchDashboardData();
          showBeautifulPopup("Success", 'Quiz deleted successfully.', "success");
        } catch (err) {
          showBeautifulPopup("Error", 'Failed to delete quiz.', "error");
        }
      },
      () => {},
      "Delete",
      "Cancel"
    );
  };

  const handleDownloadTemplate = async (type = 'prelim') => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/admin/download_template/?type=${type}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session?.token}` },
      });
      
      if (!res.ok) throw new Error('Failed to download template');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz_template_${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadExcel = async (quizId, file) => {
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      
      const res = await fetch(`${API_BASE_URL}/quizzes/admin/${quizId}/upload_questions/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.token}` },
        body: formDataObj
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      
      setUploadResult(data);
      await fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleManageQuestionsClick = async (quiz) => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/admin/${quiz.id}/questions/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch questions');
      
      setManageQuestions(data);
      setSelectedManageQuiz(quiz);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    showBeautifulPopup(
      "Delete Question?",
      "Are you sure you want to delete this question? This action cannot be undone.",
      "warning",
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/quizzes/admin/delete_question/`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${session?.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: questionId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to delete question');
          
          if (selectedManageQuiz) {
            await handleManageQuestionsClick(selectedManageQuiz);
            await fetchDashboardData();
          }
        } catch (err) {
          showBeautifulPopup("Error", err.message, "error");
        }
      },
      () => {},
      "Delete",
      "Cancel"
    );
  };

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/admin/${selectedManageQuiz.id}/add_question/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQuestionData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add question');
      
      alert('Question added successfully!');
      setNewQuestionData({
        text: '',
        question_type: 'regular',
        category: 'General',
        marks: 1,
        trivia: '',
        choices: [
          { text: '', is_correct: true, correct_order: null },
          { text: '', is_correct: false, correct_order: null },
          { text: '', is_correct: false, correct_order: null },
          { text: '', is_correct: false, correct_order: null }
        ]
      });
      setShowAddQuestionForm(false);
      await handleManageQuestionsClick(selectedManageQuiz);
      await fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditQuestionClick = (question) => {
    setEditingQuestion(question);
    setNewQuestionData({
      id: question.id,
      text: question.text,
      question_type: question.question_type,
      category: question.category,
      marks: question.marks,
      trivia: question.trivia,
      choices: question.choices.map(c => ({
        text: c.text,
        is_correct: c.is_correct,
        correct_order: c.correct_order
      }))
    });
  };

  const handleEditQuestionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/admin/edit_question/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQuestionData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update question');
      
      alert('Question updated successfully!');
      setEditingQuestion(null);
      setNewQuestionData({
        text: '',
        question_type: 'regular',
        category: 'General',
        marks: 1,
        trivia: '',
        choices: [
          { text: '', is_correct: true, correct_order: null },
          { text: '', is_correct: false, correct_order: null },
          { text: '', is_correct: false, correct_order: null },
          { text: '', is_correct: false, correct_order: null }
        ]
      });
      await handleManageQuestionsClick(selectedManageQuiz);
    } catch (err) {
      alert(err.message);
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
        payload.event_date = null;
      }
      delete payload.event_time;

      if (payload.registration_open_date && payload.registration_open_time) {
        payload.registration_open_date = `${payload.registration_open_date}T${payload.registration_open_time}:00`;
      } else {
        payload.registration_open_date = null;
      }
      delete payload.registration_open_time;

      if (payload.registration_close_date && payload.registration_close_time) {
        payload.registration_close_date = `${payload.registration_close_date}T${payload.registration_close_time}:00`;
      } else {
        payload.registration_close_date = null;
      }
      delete payload.registration_close_time;
      
      payload.max_participants = payload.max_participants ? parseInt(payload.max_participants) : null;
      payload.registration_fee = payload.registration_fee ? parseFloat(payload.registration_fee) : 0.00;
      
      if (!payload.require_eligibility) {
        payload.allowed_schools = [];
        payload.allowed_programs = [];
        payload.allowed_branches = [];
      } else {
        payload.allowed_schools = payload.eligibility_school ? [payload.eligibility_school] : [];
        payload.allowed_programs = payload.eligibility_programs || [];
        payload.allowed_branches = payload.eligibility_branches || [];
      }
      delete payload.require_eligibility;
      delete payload.eligibility_school;
      delete payload.eligibility_programs;
      delete payload.eligibility_branches;

      // Remove optional empty string fields to bypass strict backend format validations, but preserve nulls
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      
      console.log('Sending payload:', payload);

      if (editingQuizId) {
        await updateAdminQuiz(editingQuizId, payload, session?.token);
        alert('Quiz updated successfully!');
      } else {
        await createAdminQuiz(payload, session?.token);
        alert(isDraft ? 'Draft saved successfully!' : 'Quiz created successfully!');
      }
      
      await fetchDashboardData();
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
      className="admin-dashboard-page kbc-broadcast theme-dark"
      style={{ '--core-x': `${coreOffset.x}px`, '--core-y': `${coreOffset.y}px` }}
      onPointerMove={handlePointerMove}
    >
      <div className="admin-dashboard-background" aria-hidden="true">
        <KbcStageFx intensity="lite" />
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

        <div className="admin-sidebar-footer" style={{ marginTop: 'auto' }}>
          <Link to="/login" className="admin-sidebar-item" style={{ textDecoration: 'none' }}>
            <span className="admin-sidebar-icon" style={{ color: 'rgb(255,100,100)' }}>{SYMBOLS.exit}</span>
            <span className="admin-sidebar-label" style={{ color: 'rgb(255,100,100)' }}>LOGOUT</span>
            <span className="admin-sidebar-hover-symbol" style={{ color: 'rgb(255,100,100)' }}>{SYMBOLS.exit}</span>
          </Link>
        </div>
      </aside>

      <section className="admin-shell">
        <header className="admin-topbar">
          <div>
            <p className="admin-welcome-kicker">Welcome back, {admin.name}</p>
            <h1>{admin.role} {SYMBOLS.dot} Main Facility</h1>
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
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button 
                    className="dash-chip-btn" 
                    onClick={() => handleDownloadTemplate('prelim')}
                    style={{borderColor: 'rgba(255,255,255,0.4)', color: 'var(--admin-text)', cursor: 'pointer', padding: '0.8rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px'}}
                  >
                    📥 PRELIM TEMPLATE (MCQ)
                  </button>
                  <button 
                    className="dash-chip-btn" 
                    onClick={() => handleDownloadTemplate('fff')}
                    style={{borderColor: 'rgba(255,215,0,0.4)', color: '#ffd700', cursor: 'pointer', padding: '0.8rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px'}}
                  >
                    📥 FFF TEMPLATE (SEQ)
                  </button>
                  <button 
                    className="dash-chip-btn" 
                    onClick={() => handleDownloadTemplate('hotseat')}
                    style={{borderColor: 'rgba(0,180,216,0.4)', color: '#00b4d8', cursor: 'pointer', padding: '0.8rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px'}}
                  >
                    📥 HOTSEAT TEMPLATE
                  </button>
                  <button 
                    className="dash-chip-btn" 
                    onClick={handleCreateNewClick}
                    style={{background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold', padding: '0.8rem 1.5rem', fontSize: '1rem', cursor: 'pointer', borderRadius: '8px'}}
                  >
                    + CREATE NEW QUIZ
                  </button>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '2rem', flexDirection: 'column'}}>
                
                {/* List Section */}
                <div>
                  {loading ? (
                    <p>Loading quizzes...</p>
                  ) : quizzes.length === 0 ? (
                    <p>No quizzes created yet.</p>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                      {quizzes.map(quiz => (
                        <div 
                          key={quiz.id} 
                          className="admin-quiz-list-item"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            gap: '2.5rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '12px',
                            padding: '1.5rem 2rem',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                            flexDirection: 'row',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'var(--admin-text)' }}>
                                {quiz.title}
                              </h3>
                              
                              {quiz.is_archived && (
                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                  ARCHIVED
                                </span>
                              )}

                              <span style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                background: quiz.status === 'live' ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                                color: quiz.status === 'live' ? '#98ff98' : 'rgba(255,255,255,0.6)',
                                border: quiz.status === 'live' ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(255,255,255,0.1)'
                              }}>
                                {quiz.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            <p style={{ margin: 0, color: 'var(--admin-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                              {quiz.description || 'No event description provisioned yet.'}
                            </p>

                            <div className="admin-quiz-list-meta" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--admin-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                              <span>👥 Enrolled: <strong style={{ color: 'var(--admin-text)' }}>{quiz.registered_count}</strong></span>
                              {quiz.event_date && <span>📅 Date: <strong style={{ color: 'var(--admin-text)' }}>{new Date(quiz.event_date).toLocaleDateString()}</strong></span>}
                            </div>
                          </div>

                          {/* Action Panel grouped by high and normal priorities */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '290px', flexShrink: 0 }}>
                            
                            {/* Golden Glowing Primary Console Trigger */}
                            <button 
                              className="dash-chip-btn glow-gold blinking-border" 
                              onClick={() => {
                                setSelectedKbcQuizId(quiz.id);
                                setActiveTab('Live KBC Controller');
                              }}
                              style={{
                                borderColor: 'rgba(255, 215, 0, 0.8)',
                                color: '#ffd700',
                                background: 'rgba(255, 215, 0, 0.08)',
                                fontWeight: '900',
                                fontSize: '0.88rem',
                                padding: '0.65rem 1rem',
                                boxShadow: '0 0 15px rgba(255, 215, 0, 0.1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                cursor: 'pointer',
                                borderRadius: '8px'
                              }}
                            >
                              🎙️ Live KBC Console
                            </button>

                            {/* Content Creation Controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => handleManageQuestionsClick(quiz)}
                                style={{
                                  borderColor: 'rgb(var(--admin-cyan-rgb))',
                                  color: 'rgb(var(--admin-cyan-rgb))',
                                  background: 'rgba(var(--admin-cyan-rgb), 0.05)',
                                  fontSize: '0.8rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                📋 Questions
                              </button>
                              
                              <label 
                                className="dash-chip-btn" 
                                style={{
                                  borderColor: 'rgba(255, 255, 255, 0.4)',
                                  color: 'var(--admin-text)',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  display: 'block',
                                  fontWeight: 'bold'
                                }}
                              >
                                📥 Upload Excel
                                <input 
                                  type="file" 
                                  accept=".xlsx" 
                                  style={{display: 'none'}} 
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      handleUploadExcel(quiz.id, e.target.files[0]);
                                      e.target.value = null;
                                    }
                                  }} 
                                />
                              </label>
                            </div>

                            {/* Stage & Visibility Controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => toggleQuizSetting(quiz.id, 'visible_to_students', quiz.visible_to_students)}
                                style={{
                                  borderColor: quiz.visible_to_students ? 'rgb(var(--admin-mint-rgb))' : 'var(--admin-border)',
                                  color: quiz.visible_to_students ? '#98ff98' : 'var(--admin-muted)',
                                  background: quiz.visible_to_students ? 'rgba(152,255,152,0.05)' : 'transparent',
                                  fontSize: '0.78rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {quiz.visible_to_students ? '🟢 Published' : '🔴 Hidden'}
                              </button>
                              
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => toggleQuizSetting(quiz.id, 'is_registration_open', quiz.is_registration_open)}
                                style={{
                                  borderColor: quiz.is_registration_open ? 'rgb(var(--admin-cyan-rgb))' : 'var(--admin-border)',
                                  color: quiz.is_registration_open ? 'rgb(var(--admin-cyan-rgb))' : 'var(--admin-muted)',
                                  background: quiz.is_registration_open ? 'rgba(var(--admin-cyan-rgb), 0.05)' : 'transparent',
                                  fontSize: '0.78rem',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {quiz.is_registration_open ? '🔓 Reg Open' : '🔒 Reg Closed'}
                              </button>
                            </div>

                            {/* Utilities & Danger controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.4rem' }}>
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => handleEditClick(quiz)}
                                style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'var(--admin-text)', fontSize: '0.75rem', padding: '0.45rem 0.2rem', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                ✏️ Edit
                              </button>
                              
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => toggleQuizSetting(quiz.id, 'is_archived', quiz.is_archived)}
                                style={{
                                  borderColor: quiz.is_archived ? 'var(--admin-text)' : 'var(--admin-border)',
                                  color: quiz.is_archived ? 'var(--admin-text)' : 'var(--admin-muted)',
                                  fontSize: '0.75rem',
                                  padding: '0.45rem 0.2rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {quiz.is_archived ? '📂 Active' : '📁 Arch'}
                              </button>
                              
                              <button 
                                className="dash-chip-btn" 
                                onClick={() => handleDeleteClick(quiz.id)}
                                style={{
                                  borderColor: 'rgba(255,80,80,0.4)',
                                  color: 'rgb(255,80,80)',
                                  background: 'rgba(255,80,80,0.03)',
                                  fontSize: '0.75rem',
                                  padding: '0.45rem 0.2rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                🗑️ Del
                              </button>
                            </div>
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

        {activeTab === 'Live KBC Controller' && (
          <section className="admin-overview-hero tilt-card kbc-controller-container">
            {!selectedKbcQuizId ? (
              <div className="kbc-quiz-selector">
                <span className="overview-status">KBC Event Command Center</span>
                <h2>Select a Live Event to Control</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem'}}>
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="admin-quiz-list-item kbc-selector-item">
                      <div>
                        <h3>{quiz.title}</h3>
                        <div className="admin-quiz-list-meta">
                          <span>Active Stage: <strong style={{color: '#ffd700'}}>{quiz.current_stage?.replace('_', ' ').toUpperCase() || 'REGULAR'}</strong></span>
                          <span>Registered: {quiz.registered_count}</span>
                        </div>
                      </div>
                      <button 
                        className="dash-chip-btn kbc-control-launch-btn"
                        onClick={() => setSelectedKbcQuizId(quiz.id)}
                        style={{borderColor: '#ffd700', color: '#ffd700'}}
                      >
                        CONTROL LIVE EVENT
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="kbc-active-console">
                {/* Header */}
                <div className="kbc-console-header">
                  <div>
                    <button className="kbc-back-btn" onClick={() => { setSelectedKbcQuizId(null); setKbcQuizDetail(null); setKbcLiveState(null); }}>
                      &larr; Exit Console
                    </button>
                    <h2>Live KBC Console: <span style={{color: '#ffd700'}}>{kbcQuizDetail?.title}</span></h2>
                  </div>
                  <div className="kbc-console-status">
                    <span className="kbc-status-pill">
                      <span className="pulse-dot"></span>
                      SYSTEM LIVE (Polling active)
                    </span>
                    <button className="kbc-refresh-btn" onClick={() => fetchKbcControllerData(selectedKbcQuizId)} style={{ marginRight: '0.5rem' }}>
                      Force Sync
                    </button>
                    <Link 
                      to={`/quiz-arena/${selectedKbcQuizId}`} 
                      target="_blank" 
                      className="kbc-refresh-btn" 
                      style={{ 
                        background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', 
                        color: '#000', 
                        border: 'none', 
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        textDecoration: 'none',
                        boxShadow: '0 2px 10px rgba(255, 215, 0, 0.2)'
                      }}
                    >
                      🎙️ Host Showtime (Arena Mode)
                    </Link>
                  </div>
                </div>

                {/* Stage Director Board */}
                <div className="kbc-stage-director glass-card glow-blue" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--admin-border)',
                  marginBottom: '2rem',
                  gap: '1rem',
                }}>
                  {KBC_STAGES.map((stage) => {
                    const isActive = kbcQuizDetail?.current_stage === stage.value;
                    return (
                      <button
                        key={stage.value}
                        onClick={() => handleUpdateStage(stage.value)}
                        disabled={kbcLoading}
                        style={{
                          background: isActive ? 'rgba(0, 188, 212, 0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? 'var(--admin-cyan)' : 'rgba(255,255,255,0.1)'}`,
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                          padding: '1rem 0.5rem',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isActive ? 'scale(1.05)' : 'none',
                          boxShadow: isActive ? '0 0 15px rgba(0, 188, 212, 0.3)' : 'none'
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: isActive ? 'var(--admin-cyan)' : 'transparent',
                          border: `2px solid ${isActive ? 'var(--admin-cyan)' : 'rgba(255,255,255,0.3)'}`,
                          boxShadow: isActive ? '0 0 8px var(--admin-cyan)' : 'none'
                        }} />
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{stage.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="kbc-console-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
                  {/* Left Column: Stage Actions & Hotseat Stats/Quick Promote */}
                  <div className="kbc-console-left">
                    <div className="kbc-panel stage-controller-panel">
                      <h3>Stage Director</h3>
                      <p className="panel-subtitle" style={{ marginBottom: '1.2rem' }}>You are now in full manual control.</p>

                      <div style={{ background: 'rgba(0, 188, 212, 0.1)', border: '1px solid rgba(0, 188, 212, 0.3)', color: 'var(--admin-cyan)', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        Click any stage on the Director Board above to instantly switch the live event phase.
                      </div>
                    </div>

                    {/* Hotseat Info Panel */}
                    <div className="kbc-panel hotseat-info-panel" style={{ marginTop: '1.5rem' }}>
                      <h3>Active Hotseat Player</h3>
                      {kbcLiveState?.hotseat_attempt ? (
                        <div className="hotseat-metrics">
                          <div className="metric-row">
                            <span className="metric-lbl">Contender:</span>
                            <span className="metric-val text-gold">{kbcLiveState.hotseat_attempt.student_name}</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-lbl">Player ID:</span>
                            <span className="metric-val">{kbcLiveState.hotseat_attempt.player_id}</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-lbl">Current Score:</span>
                            <span className="metric-val text-cyan">{kbcLiveState.hotseat_attempt.score} pts</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-lbl">Status:</span>
                            <span className="metric-val text-green">{kbcLiveState.hotseat_attempt.status?.toUpperCase()}</span>
                          </div>

                          <div className="lifelines-status">
                            <h4>Lifelines Status</h4>
                            <div className="lifelines-row">
                              <div className={`lifeline-badge ${kbcLiveState.hotseat_attempt.lifeline_5050_used ? 'used' : 'ready'}`}>
                                50:50 {kbcLiveState.hotseat_attempt.lifeline_5050_used ? '❌' : '✅'}
                              </div>
                              <div className={`lifeline-badge ${kbcLiveState.hotseat_attempt.lifeline_poll_used ? 'used' : 'ready'}`}>
                                Poll {kbcLiveState.hotseat_attempt.lifeline_poll_used ? '❌' : '✅'}
                              </div>
                              <div className={`lifeline-badge ${kbcLiveState.hotseat_attempt.lifeline_switch_used ? 'used' : 'ready'}`}>
                                Switch {kbcLiveState.hotseat_attempt.lifeline_switch_used ? '❌' : '✅'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="no-active-msg" style={{ margin: '0 0 1rem 0' }}>No active contestant in hotseat currently.</p>
                          
                          {/* Quick promote dropdown box */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: '1rem' }}>
                            <h4 style={{ color: '#ffd700', fontSize: '0.85rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ⚡ Quick Promote Contestant
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.8rem 0', lineHeight: 1.4 }}>
                              Skip Fast FFF round and promote any contender directly to the Hotseat!
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              <select 
                                value={selectedPromoteStudentId} 
                                onChange={e => setSelectedPromoteStudentId(e.target.value)}
                                style={{
                                  background: 'rgba(0,0,0,0.5)',
                                  border: '1px solid var(--admin-border)',
                                  color: '#fff',
                                  padding: '0.55rem',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  width: '100%',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="">-- Select Contender --</option>
                                {prelimScoresList.map(score => (
                                  <option key={score.student_id} value={score.student_id}>
                                    {score.student_name} ({score.score} pts)
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  if (!selectedPromoteStudentId) {
                                    showBeautifulPopup("Selection Required", "Please select a contender from the dropdown first.", "error");
                                    return;
                                  }
                                  handlePromoteToHotseat(selectedPromoteStudentId);
                                }}
                                disabled={kbcLoading}
                                style={{
                                  background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                                  color: '#000',
                                  border: 'none',
                                  fontWeight: '900',
                                  padding: '0.55rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  boxShadow: '0 2px 8px rgba(255, 215, 0, 0.15)',
                                  textTransform: 'uppercase'
                                }}
                              >
                                🚀 PROMOTE DIRECTLY
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Dynamic Context Screen */}
                  <div className="kbc-console-mid">
                    {/* Preliminary Stage details */}
                    {kbcQuizDetail?.current_stage === 'regular' && (
                      <div className="kbc-panel context-panel">
                        <h3>Preliminary Leaderboard</h3>
                        <p className="panel-subtitle">Students currently playing standard preliminary round</p>
                        <div className="scores-table-container">
                          <table className="kbc-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th>Player ID</th>
                                <th>Score</th>
                                <th>Progress</th>
                                <th>Time Taken</th>
                                <th>Correct</th>
                                <th>Incorrect</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prelimScoresList.length === 0 ? (
                                <tr><td colSpan="9" className="text-center">No submissions yet. Waiting for students to start...</td></tr>
                              ) : (
                                prelimScoresList.map(score => (
                                  <tr key={score.student_id} className={score.completed ? '' : 'in-progress-row'}>
                                    <td>#{score.rank}</td>
                                    <td className="text-gold">{score.student_name}</td>
                                    <td>{score.player_id}</td>
                                    <td className="text-cyan font-bold">{score.score}</td>
                                    <td>{score.questions_answered}/{score.total_questions}</td>
                                    <td>{score.time_taken ? `${score.time_taken.toFixed(1)}s` : '-'}</td>
                                    <td className="text-emerald font-bold">{score.correct_count ?? '-'}</td>
                                    <td className="text-rose font-bold">{score.incorrect_count ?? '-'}</td>
                                    <td>
                                      <span className={`status-pill ${score.completed ? 'completed' : 'in-progress'}`}>
                                        {score.completed ? '✅ COMPLETED' : '⏳ IN PROGRESS'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Batch Selection Stage */}
                    {kbcQuizDetail?.current_stage === 'batch_selection' && (
                      <div className="kbc-panel context-panel">
                        <h3>Batch Configuration</h3>
                        <p className="panel-subtitle">Set FFF contestants. Group top 30 preliminary scorers into 3 batches of 10.</p>
                        
                        <div className="batch-actions-bar">
                          <button className="kbc-secondary-btn" onClick={handleAutoGenerateBatches} disabled={kbcLoading}>
                            ⚡ Auto-Generate Batches
                          </button>
                          <button className="kbc-save-btn" onClick={handleSaveBatches} disabled={kbcLoading}>
                            💾 Lock & Save Batches
                          </button>
                        </div>

                        <div className="batches-grid">
                          <div className="batch-input-card">
                            <h4>Batch 1 (FFF Round 1)</h4>
                            <textarea 
                              className="batch-input-field" 
                              value={batch1Input} 
                              onChange={e => setBatch1Input(e.target.value)}
                              placeholder="Comma separated User IDs (e.g. 101, 102, 103)"
                            />
                            <span className="batch-count">Count: {batch1Input ? batch1Input.split(',').filter(x => x.trim()).length : 0} / 10</span>
                          </div>

                          <div className="batch-input-card">
                            <h4>Batch 2 (FFF Round 2)</h4>
                            <textarea 
                              className="batch-input-field" 
                              value={batch2Input} 
                              onChange={e => setBatch2Input(e.target.value)}
                              placeholder="Comma separated User IDs"
                            />
                            <span className="batch-count">Count: {batch2Input ? batch2Input.split(',').filter(x => x.trim()).length : 0} / 10</span>
                          </div>

                          <div className="batch-input-card">
                            <h4>Batch 3 (FFF Round 3)</h4>
                            <textarea 
                              className="batch-input-field" 
                              value={batch3Input} 
                              onChange={e => setBatch3Input(e.target.value)}
                              placeholder="Comma separated User IDs"
                            />
                            <span className="batch-count">Count: {batch3Input ? batch3Input.split(',').filter(x => x.trim()).length : 0} / 10</span>
                          </div>
                        </div>

                        {/* Top 30 Preliminary list for reference */}
                        <div style={{marginTop: '2rem'}}>
                          <h4>Top Preliminary Scorers Reference</h4>
                          <div className="scores-table-container mini-table">
                            <table className="kbc-table">
                              <thead>
                                <tr>
                                  <th>Rank</th>
                                  <th>User ID</th>
                                  <th>Name</th>
                                  <th>Player ID</th>
                                  <th>Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prelimScoresList.map(score => (
                                  <tr key={score.student_id}>
                                    <td>#{score.rank}</td>
                                    <td><strong className="text-cyan">{score.student_id}</strong></td>
                                    <td className="text-gold">{score.student_name}</td>
                                    <td>{score.player_id}</td>
                                    <td>{score.score}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FFF Stages */}
                    {kbcQuizDetail?.current_stage.startsWith('fff_') && (
                      <div className="kbc-panel context-panel">
                        <h3>FFF Live Standings</h3>
                        <p className="panel-subtitle">Submissions for active batch in real time. Winner is the fastest correct responder.</p>

                        {fffResultsData?.question && (
                          <div className="fff-question-box">
                            <h4>FFF Active Question:</h4>
                            <p className="fff-question-text">{fffResultsData.question.text}</p>
                          </div>
                        )}

                        <div className="fff-standings-table">
                          <table className="kbc-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Contender</th>
                                <th>Player ID</th>
                                <th>Choice Submitted</th>
                                <th>Time Taken</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!fffResultsData?.results || fffResultsData.results.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">No submissions received yet...</td></tr>
                              ) : (
                                fffResultsData.results.map((res, idx) => {
                                  const isWinner = res.is_correct && idx === 0;
                                  return (
                                    <tr key={res.id} className={isWinner ? 'fff-winner-row' : ''}>
                                      <td>
                                        {isWinner ? (
                                          <span className="winner-crown">👑 #1</span>
                                        ) : (
                                          `#${idx + 1}`
                                        )}
                                      </td>
                                      <td className="text-gold font-bold">{res.student_name}</td>
                                      <td>{res.player_id}</td>
                                      <td className="font-mono text-cyan" style={{ fontSize: '0.85rem' }}>
                                        {(() => {
                                          if (res.submitted_sequence) {
                                            const choiceIds = res.submitted_sequence.split(',');
                                            const arrangedLetters = choiceIds.map(cid => {
                                              const choiceIndex = fffResultsData.question.choices?.findIndex(c => String(c.id) === cid);
                                              return choiceIndex !== -1 ? ['A','B','C','D'][choiceIndex] : '?';
                                            });
                                            return arrangedLetters.join(' → ');
                                          }
                                          return res.selected_choice_text || 'No selection';
                                        })()}
                                      </td>
                                      <td className="text-pink font-mono font-bold">{res.time_taken_seconds?.toFixed(3)}s</td>
                                      <td>
                                        {res.is_correct ? (
                                          <span className="badge-correct">CORRECT</span>
                                        ) : (
                                          <span className="badge-incorrect">INCORRECT</span>
                                        )}
                                      </td>
                                      <td>
                                        <button 
                                          className="dash-chip-btn kbc-action-btn"
                                          onClick={() => handlePromoteToHotseat(res.student)}
                                          disabled={kbcLoading}
                                          style={{borderColor: '#ffd700', color: '#ffd700'}}
                                        >
                                          Promote
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Hotseat Stages */}
                    {kbcQuizDetail?.current_stage.startsWith('hotseat_') && (
                      <div className="kbc-panel context-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 15, 30, 0.98)' }}>
                        <div className="kbc-crest" style={{ fontSize: '3.5rem', color: '#ffd700', marginBottom: '1rem' }}>
                          🎙️
                        </div>
                        <h3 className="golden-glow" style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0 0 0.8rem 0', letterSpacing: '0.05em' }}>
                          HOTSEAT SHOWTIME (ARENA MODE)
                        </h3>
                        <p className="panel-subtitle" style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.95)', maxWidth: '650px', lineHeight: '1.7', margin: '0 auto 2rem auto', fontWeight: '500' }}>
                          The Hotseat round for <strong style={{ color: '#ffd700', fontSize: '1.25rem' }}>Batch {kbcQuizDetail.current_stage.slice(-1)}</strong> is now active! Command the show, view contestant preselected choices, read KBC-style trivia, and lock choices using the premium, immersive full-screen Host Arena interface.
                        </p>

                        <div style={{ 
                          background: 'rgba(212, 175, 55, 0.05)', 
                          border: '1px solid rgba(212, 175, 55, 0.3)', 
                          borderRadius: '12px', 
                          padding: '1.75rem 2.25rem', 
                          marginBottom: '2.5rem', 
                          maxWidth: '650px', 
                          width: '100%',
                          textAlign: 'left'
                        }}>
                          <h4 style={{ color: '#ffd700', fontSize: '1.25rem', fontWeight: '900', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.05em' }}>
                            🎬 HOST OPERATIONAL STEPS
                          </h4>
                          <ul style={{ color: '#fff', fontSize: '1.05rem', lineHeight: '1.7', paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>
                              <strong style={{ color: '#ffd700' }}>Step 1: Choose a Contestant</strong> — Use the <strong>"Active Hotseat Player"</strong> panel on the left to select and promote a student directly to the hotseat.
                            </li>
                            <li>
                              <strong style={{ color: '#ffd700' }}>Step 2: Enter Host Arena</strong> — Click the big yellow button below to open the **Broadcast Arena Controller** in a new full-screen tab.
                            </li>
                            <li>
                              <strong style={{ color: '#ffd700' }}>Step 3: Run the Show</strong> — From the Arena tab, read KBC trivia, view student choice selection in real-time, approve lifelines, lock answers, and advance KBC ladder levels!
                            </li>
                          </ul>
                        </div>

                        {kbcLiveState?.hotseat_attempt ? (
                          <div className="glass-card" style={{
                            background: 'rgba(255, 215, 0, 0.02)',
                            border: '1px solid rgba(255, 215, 0, 0.2)',
                            borderRadius: '12px',
                            padding: '1.5rem 2rem',
                            marginBottom: '2rem',
                            maxWidth: '450px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            textAlign: 'left'
                          }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>👤</span> ACTIVE CONTESTANT PROFILE
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Contender:</span>
                              <strong style={{ color: '#fff' }}>{kbcLiveState.hotseat_attempt.student_name}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Player ID:</span>
                              <strong style={{ color: 'var(--admin-cyan)' }}>{kbcLiveState.hotseat_attempt.player_id}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Current Level:</span>
                              <strong style={{ color: '#ff9800' }}>Question {kbcLiveState.hotseat_attempt.current_question_index + 1}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Current Score:</span>
                              <strong style={{ color: '#4caf50' }}>{kbcLiveState.hotseat_attempt.score} pts</strong>
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem 2rem', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', marginBottom: '2rem' }}>
                            ⏳ Awaiting promotion / start of active contestant attempt...
                          </div>
                        )}

                        <Link 
                          to={`/quiz-arena/${selectedKbcQuizId}?role=host`} 
                          target="_blank" 
                          className="kbc-advance-btn glow-button"
                          style={{
                            background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                            color: '#000',
                            fontWeight: '900',
                            padding: '1.2rem 3.5rem',
                            fontSize: '1.25rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 6px 25px rgba(255, 215, 0, 0.35)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            textDecoration: 'none',
                            margin: '0 auto'
                          }}
                        >
                          🎙️ ENTER FULL-SCREEN HOST ARENA
                        </Link>
                      </div>
                    )}

                    {/* Completed Stage */}
                    {kbcQuizDetail?.current_stage === 'completed' && (
                      <div className="kbc-panel context-panel podium-panel">
                        <h3>Event Concluded</h3>
                        <p className="panel-subtitle">All hotseat players have finished. Highest score wins.</p>

                        <div className="podium-showcase">
                          {(() => {
                            const players = [
                              { name: kbcQuizDetail.hotseat_player_1_name || 'Contender 1', score: kbcQuizDetail.hotseat_score_1 || 0 },
                              { name: kbcQuizDetail.hotseat_player_2_name || 'Contender 2', score: kbcQuizDetail.hotseat_score_2 || 0 },
                              { name: kbcQuizDetail.hotseat_player_3_name || 'Contender 3', score: kbcQuizDetail.hotseat_score_3 || 0 }
                            ].sort((a,b) => b.score - a.score);

                            return (
                              <div className="podium-wrapper">
                                {/* Second Place */}
                                <div className="podium-column podium-silver">
                                  <span className="podium-rank">2nd</span>
                                  <span className="podium-player-name">{players[1]?.name}</span>
                                  <span className="podium-player-score">{players[1]?.score} pts</span>
                                  <div className="podium-bar silver-bar"></div>
                                </div>

                                {/* First Place */}
                                <div className="podium-column podium-gold">
                                  <span className="podium-crown font-mono">👑</span>
                                  <span className="podium-rank">1st</span>
                                  <span className="podium-player-name">{players[0]?.name}</span>
                                  <span className="podium-player-score">{players[0]?.score} pts</span>
                                  <div className="podium-bar gold-bar"></div>
                                </div>

                                {/* Third Place */}
                                <div className="podium-column podium-bronze">
                                  <span className="podium-rank">3rd</span>
                                  <span className="podium-player-name">{players[2]?.name}</span>
                                  <span className="podium-player-score">{players[2]?.score} pts</span>
                                  <div className="podium-bar bronze-bar"></div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: High-contrast Prize Ladder (Not shown in Hotseat stages to allow Host card full width) */}
                  {!kbcQuizDetail?.current_stage?.startsWith('hotseat_') && (
                    <div className="kbc-console-right">
                      <div className="kbc-panel prize-ladder-panel">
                        <h3>Prize Ladder</h3>
                        <div className="kbc-ladder-grid">
                          {KBC_LADDER.map(level => {
                            const isActive = kbcLiveState?.hotseat_attempt?.current_question_index === level.q;
                            const isPassed = kbcLiveState?.hotseat_attempt?.current_question_index > level.q;
                            return (
                              <div 
                                key={level.q} 
                                className={`kbc-ladder-row ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''} ${level.checkpoint ? 'checkpoint' : ''} ${level.jackpot ? 'jackpot' : ''}`}
                              >
                                <span className="ladder-q-num font-mono">{level.q}</span>
                                <span className="ladder-q-sym">♦</span>
                                <span className="ladder-q-val font-mono">{level.val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'Manage Students' && (
          <section className="admin-overview-hero tilt-card manage-students-container" style={{ marginTop: '2rem', padding: '2rem' }}>
            <div className="overview-copy" style={{ width: '100%' }}>
              <span className="overview-status" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                Contestant Registration & Profile Facility
              </span>
              
              {/* Quiz Selection Dropdown Header */}
              <div className="manage-students-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>Manage Enrolled Students</h2>
                <div className="quiz-selector-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label htmlFor="student-quiz-select" className="admin-form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Active Quiz Sector:</label>
                  <select
                    id="student-quiz-select"
                    className="admin-form-input inline-select"
                    style={{ minWidth: '250px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                    value={selectedEnrollQuizId}
                    onChange={(e) => setSelectedEnrollQuizId(e.target.value)}
                  >
                    <option value="">-- Choose Quiz Sector --</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.registered_count} Enrolled)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedEnrollQuizId ? (
                <div className="no-quiz-selected-state" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--admin-border)' }}>
                  <p className="no-active-msg" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--admin-muted)' }}>
                    Please select a quiz sector from the dropdown above to manage registrations.
                  </p>
                </div>
              ) : (
                <div className="students-facility-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', marginTop: '1rem' }}>
                  {/* Left Panel: Direct Single Enrollment Form & Bulk Excel Uploader */}
                  <div className="students-facility-left" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* single manual enrollment card */}
                    <div className="students-panel glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                      <h3 style={{ marginTop: 0, color: 'rgb(var(--admin-cyan-rgb))' }}>Single Contestant Manual Form</h3>
                      <p className="panel-subtitle font-mono" style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', marginBottom: '1.5rem' }}>
                        Provision profile & credentials instantly
                      </p>
                      
                      <form onSubmit={handleEnrollManualSubmit} className="manual-enroll-form" style={{ display: 'grid', gap: '1.2rem' }}>
                        <div className="form-group">
                          <label className="admin-form-label">Full Name</label>
                          <input
                            required
                            type="text"
                            className="admin-form-input"
                            placeholder="e.g. Sanjana Prasad"
                            value={enrollForm.fullName}
                            onChange={(e) => setEnrollForm({ ...enrollForm, fullName: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="admin-form-label">Email Address</label>
                          <input
                            required
                            type="email"
                            className="admin-form-input"
                            placeholder="sanjana@domain.com"
                            value={enrollForm.email}
                            onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="admin-form-label">College / University ID</label>
                          <input
                            required
                            type="text"
                            className="admin-form-input"
                            placeholder="COLLEGE_ID_2026"
                            value={enrollForm.collegeId}
                            onChange={(e) => setEnrollForm({ ...enrollForm, collegeId: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="admin-form-label">Mock Payment Status</label>
                          <select
                            className="admin-form-input"
                            value={enrollForm.paymentStatus}
                            onChange={(e) => setEnrollForm({ ...enrollForm, paymentStatus: e.target.value })}
                          >
                            <option value="paid">Paid (Instant Arena Access)</option>
                            <option value="pending">Pending (Awaiting Mock Payment)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="dash-chip-btn submit-enroll-btn"
                          disabled={enrollLoading}
                          style={{ background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold', padding: '1rem', cursor: 'pointer', borderRadius: '4px', marginTop: '0.5rem', width: '100%' }}
                        >
                          {enrollLoading ? 'PROVISIONING...' : 'ENROLL CONTESTANT 🚀'}
                        </button>
                      </form>
                    </div>

                    {/* Bulk Enrollment Card */}
                    <div className="students-panel glass-card bulk-enroll-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                      <h3 style={{ marginTop: 0, color: 'rgb(var(--admin-pink-rgb))' }}>Bulk Enroll Contestants</h3>
                      <p className="panel-subtitle" style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', marginBottom: '1.5rem' }}>
                        Upload student spreadsheet sheet (.csv or .xlsx)
                      </p>
                      
                      <div className="bulk-actions-wrapper" style={{ marginBottom: '1.5rem' }}>
                        <button
                          type="button"
                          className="dash-chip-btn template-download-btn"
                          onClick={handleDownloadEnrollmentTemplate}
                          disabled={enrollLoading}
                          style={{ background: 'transparent', borderColor: 'var(--admin-border)', color: 'var(--admin-text)', padding: '0.8rem 1.2rem', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                        >
                          📥 DOWNLOAD STUDENT TEMPLATE (.XLSX)
                        </button>
                      </div>

                      <form onSubmit={handleBulkEnrollSubmit} className="bulk-enroll-form" style={{ display: 'grid', gap: '1.2rem' }}>
                        <div className="file-uploader-box" style={{ border: '2px dashed var(--admin-border)', padding: '2rem 1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}>
                          <input
                            id="bulk-enroll-file-input"
                            type="file"
                            accept=".csv, .xlsx"
                            className="file-input-hidden"
                            style={{ display: 'none' }}
                            onChange={(e) => setEnrollFile(e.target.files[0])}
                          />
                          <label htmlFor="bulk-enroll-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="upload-icon" style={{ fontSize: '2.5rem' }}>📁</span>
                            <span className="upload-text" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              {enrollFile ? enrollFile.name : 'Select student roster sheet...'}
                            </span>
                            <span className="upload-subtext" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>
                              Supports CSV / XLSX template formats
                            </span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="dash-chip-btn submit-bulk-btn"
                          disabled={enrollLoading || !enrollFile}
                          style={{ background: enrollFile ? 'rgb(var(--admin-pink-rgb))' : 'rgba(255,255,255,0.05)', color: enrollFile ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 'bold', padding: '1rem', cursor: enrollFile ? 'pointer' : 'not-allowed', borderRadius: '4px', width: '100%' }}
                        >
                          {enrollLoading ? 'PROCESSING EXCEL...' : 'BULK UPLOAD & PROVISION 🚀'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Panel: Enrolled Students List Roster */}
                  <div className="students-facility-right">
                    <div className="students-panel glass-card roster-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--admin-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                          <h3 style={{ margin: 0, color: 'rgb(var(--admin-yellow-rgb))' }}>Registered Roster</h3>
                          <p className="panel-subtitle" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                            Total enrolled: {enrolledStudents.length} contestants
                          </p>
                        </div>
                        {enrollLoading && <span className="roster-syncing" style={{ fontSize: '0.8rem', color: 'rgb(var(--admin-cyan-rgb))', animation: 'pulse 1.5s infinite' }}>Syncing...</span>}
                      </div>

                      <div className="roster-table-container" style={{ overflowY: 'auto', maxHeight: '680px', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
                        <table className="kbc-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--admin-border)' }}>
                              <th style={{ padding: '1rem' }}>Seq</th>
                              <th style={{ padding: '1rem' }}>Player ID</th>
                              <th style={{ padding: '1rem' }}>Name & Email</th>
                              <th style={{ padding: '1rem' }}>College ID</th>
                              <th style={{ padding: '1rem' }}>Payment</th>
                              <th style={{ padding: '1rem' }}>Registered At</th>
                              <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrolledStudents.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--admin-muted)', fontStyle: 'italic' }}>
                                  No registered contestants found in this sector yet.<br/>
                                  Use the forms on the left to add students.
                                </td>
                              </tr>
                            ) : (
                              enrolledStudents.map((studentReg) => (
                                <tr key={studentReg.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                  <td className="font-mono" style={{ padding: '1rem' }}>#{studentReg.sequence_number || studentReg.id}</td>
                                  <td className="text-cyan font-bold font-mono" style={{ padding: '1rem', color: 'rgb(var(--admin-cyan-rgb))' }}>{studentReg.player_id}</td>
                                  <td style={{ padding: '1rem' }}>
                                    <div className="roster-student-details" style={{ display: 'flex', flexDirection: 'column' }}>
                                      <strong className="text-gold" style={{ color: 'rgb(var(--admin-yellow-rgb))' }}>{studentReg.student_name}</strong>
                                      <span className="roster-email" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>{studentReg.student_email}</span>
                                    </div>
                                  </td>
                                  <td className="font-mono" style={{ padding: '1rem', fontSize: '0.85rem' }}>{studentReg.college_id || '-'}</td>
                                  <td style={{ padding: '1rem' }}>
                                    <span 
                                      className={`badge-payment ${studentReg.payment_status}`}
                                      style={{
                                        display: 'inline-block',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        background: studentReg.payment_status === 'paid' ? 'rgba(152,255,152,0.15)' : 'rgba(255,223,137,0.15)',
                                        color: studentReg.payment_status === 'paid' ? '#98ff98' : '#ffdf89',
                                        border: studentReg.payment_status === 'paid' ? '1px solid rgba(152,255,152,0.3)' : '1px solid rgba(255,223,137,0.3)'
                                      }}
                                    >
                                      {studentReg.payment_status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="font-mono" style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                    {new Date(studentReg.registered_at).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button
                                      className="roster-remove-btn"
                                      onClick={() => handleRemoveRegistration(studentReg.id, studentReg.student_name)}
                                      disabled={enrollLoading}
                                      style={{
                                        background: 'rgba(255, 99, 71, 0.1)',
                                        border: '1px solid rgba(255, 99, 71, 0.35)',
                                        color: '#ff6347',
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        cursor: enrollLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'monospace',
                                        letterSpacing: '0.03em',
                                        opacity: enrollLoading ? 0.5 : 1
                                      }}
                                      onMouseOver={(e) => { if (!enrollLoading) { e.currentTarget.style.background = 'rgba(255, 99, 71, 0.25)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 99, 71, 0.3)'; }}}
                                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 99, 71, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                      🗑️ REMOVE
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'System Settings' && (
          <section className="admin-overview-hero" style={{ marginTop: '2rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'stretch' }}>
            <div className="overview-copy" style={{ width: '100%' }}>
              <span className="overview-status" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                ⚙️ SYSTEM OPERATIONS PANEL
              </span>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '900' }}>System Settings & Preferences</h2>
              <p style={{ margin: '0.2rem 0 2rem 0', fontSize: '1rem', color: 'var(--admin-muted)' }}>
                Configure global live tournament thresholds, manage student registrations behaviors, and update administrator profile credentials safely.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Profile Credentials Settings Card */}
                <div className="kbc-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '2rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'rgb(var(--admin-cyan-rgb))', fontSize: '1.25rem', fontWeight: 'bold' }}>👤 Update Administrator Profile</h3>
                  <p className="panel-subtitle" style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', marginBottom: '1.5rem' }}>
                    Modify your contact email address and change login credentials secure validation.
                  </p>

                  <form onSubmit={handleSaveSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                      <label className="admin-form-label" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>Contact Email</label>
                      <input 
                        required
                        type="email"
                        placeholder="admin@quizverse.com"
                        className="admin-form-input"
                        value={settingsForm.email}
                        onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.8rem', borderRadius: '6px', width: '100%' }}
                      />
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />

                    <div className="form-group" style={{ textAlign: 'left' }}>
                      <label className="admin-form-label" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>Current Password</label>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        className="admin-form-input"
                        value={settingsForm.currentPassword}
                        onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.8rem', borderRadius: '6px', width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label className="admin-form-label" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>New Password</label>
                        <input 
                          type="password"
                          placeholder="Min 8 chars"
                          className="admin-form-input"
                          value={settingsForm.newPassword}
                          onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.8rem', borderRadius: '6px', width: '100%' }}
                        />
                      </div>

                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label className="admin-form-label" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>Confirm New Password</label>
                        <input 
                          type="password"
                          placeholder="••••••••"
                          className="admin-form-input"
                          value={settingsForm.confirmNewPassword}
                          onChange={(e) => setSettingsForm({ ...settingsForm, confirmNewPassword: e.target.value })}
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.8rem', borderRadius: '6px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="dash-chip-btn submit-enroll-btn"
                      disabled={settingsLoading}
                      style={{ background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: '900', padding: '0.85rem', cursor: 'pointer', borderRadius: '6px', marginTop: '0.5rem', width: '100%', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      {settingsLoading ? 'SAVING PROFILE...' : '💾 SAVE PROFILE'}
                    </button>
                  </form>
                </div>

                {/* Event Preferences Configuration Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="kbc-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '2rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'rgb(var(--admin-yellow-rgb))', fontSize: '1.25rem', fontWeight: 'bold' }}>🎮 Live Arena Timing Preferences</h3>
                    <p className="panel-subtitle" style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', marginBottom: '1.5rem' }}>
                      Configure default timers and round limits saved to global configuration.
                    </p>

                    <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>Prelim MCQ Timer (sec)</label>
                          <input 
                            type="number"
                            className="admin-form-input"
                            value={prelimDuration}
                            onChange={(e) => setPrelimDuration(Math.max(10, parseInt(e.target.value) || 0))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.6rem', borderRadius: '6px', width: '100%' }}
                          />
                        </div>

                        <div className="form-group" style={{ textAlign: 'left' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>FFF Speed Timer (sec)</label>
                          <input 
                            type="number"
                            className="admin-form-input"
                            value={fffDuration}
                            onChange={(e) => setFffDuration(Math.max(5, parseInt(e.target.value) || 0))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.6rem', borderRadius: '6px', width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>Hotseat Q1-Q5 limit (sec)</label>
                          <input 
                            type="number"
                            className="admin-form-input"
                            value={hotseatQ1Q5Duration}
                            onChange={(e) => setHotseatQ1Q5Duration(Math.max(10, parseInt(e.target.value) || 0))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.6rem', borderRadius: '6px', width: '100%' }}
                          />
                        </div>

                        <div className="form-group" style={{ textAlign: 'left' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>Hotseat Q6-Q10 limit (sec)</label>
                          <input 
                            type="number"
                            className="admin-form-input"
                            value={hotseatQ6Q10Duration}
                            onChange={(e) => setHotseatQ6Q10Duration(Math.max(10, parseInt(e.target.value) || 0))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', padding: '0.6rem', borderRadius: '6px', width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox"
                          id="auto-approve-toggle"
                          checked={autoApproveEnrollment}
                          onChange={(e) => setAutoApproveEnrollment(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="auto-approve-toggle" style={{ fontSize: '0.88rem', color: 'var(--admin-text)', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}>
                          Auto-Approve Manual Registrations (Bypass pending status)
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="dash-chip-btn"
                        style={{ background: 'rgb(var(--admin-yellow-rgb))', color: '#000', border: 'none', fontWeight: '900', padding: '0.85rem', cursor: 'pointer', borderRadius: '6px', marginTop: '1rem', width: '100%', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >
                        💾 SAVE LIVE TOURNAMENT CONFIG
                      </button>
                    </form>
                  </div>

                  {/* Danger Zone System Reset Card */}
                  <div className="kbc-panel" style={{ background: 'rgba(255, 99, 71, 0.04)', border: '1px solid rgba(255, 99, 71, 0.3)', borderRadius: '12px', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <h3 style={{ margin: '0 0 0.2rem 0', color: '#ff5252', fontSize: '1.1rem', fontWeight: 'bold' }}>⚠️ DANGER ACTION ZONE</h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                        Perform comprehensive event and cache resets. Actions are irreversible.
                      </p>
                    </div>

                    <button
                      onClick={handleResetLiveEventState}
                      style={{
                        background: 'linear-gradient(135deg, #ff5252 0%, #c62828 100%)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: '900',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(255, 82, 82, 0.25)',
                        textTransform: 'uppercase',
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Reset KBC States
                    </button>
                  </div>
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
            <h3>{editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}</h3>
            <form onSubmit={handleCreateQuiz} style={{display: 'grid', gap: '1.2rem', gridTemplateColumns: '1fr 1fr'}}>
              <div style={{gridColumn: '1 / -1'}}>
                <label className="admin-form-label">Title</label>
                <input required type="text" className="admin-form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label className="admin-form-label">Description</label>
                <textarea className="admin-form-input admin-form-textarea" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label className="admin-form-label">Rules & Instructions</label>
                <textarea className="admin-form-input admin-form-textarea" value={formData.rules_instructions} onChange={e => setFormData({...formData, rules_instructions: e.target.value})} />
              </div>
              
              <div>
                <label className="admin-form-label">Event Date & Time</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" className="admin-form-input" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} />
                  <input type="time" className="admin-form-input" value={formData.event_time} onChange={e => setFormData({...formData, event_time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="admin-form-label">Max Participants</label>
                <input type="number" min="0" className="admin-form-input" value={formData.max_participants} onChange={e => setFormData({...formData, max_participants: e.target.value})} />
              </div>
              
              <div>
                <label className="admin-form-label">Registration Open Time</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" className="admin-form-input" value={formData.registration_open_date} onChange={e => setFormData({...formData, registration_open_date: e.target.value})} />
                  <input type="time" className="admin-form-input" value={formData.registration_open_time} onChange={e => setFormData({...formData, registration_open_time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="admin-form-label">Registration Fee (₹)</label>
                <input type="number" step="0.01" min="0" className="admin-form-input" value={formData.registration_fee} onChange={e => setFormData({...formData, registration_fee: e.target.value})} />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label className="admin-form-label">Registration Close Time (Optional)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="date" className="admin-form-input" value={formData.registration_close_date} onChange={e => setFormData({...formData, registration_close_date: e.target.value})} />
                  <input type="time" className="admin-form-input" value={formData.registration_close_time} onChange={e => setFormData({...formData, registration_close_time: e.target.value})} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center', gridColumn: '1 / -1', marginTop: '0.5rem', flexWrap: 'wrap'}}>
                <label className="admin-checkbox-label">
                  <input type="checkbox" checked={formData.visible_to_students} onChange={e => setFormData({...formData, visible_to_students: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Visible to Students
                </label>
                <label className="admin-checkbox-label">
                  <input type="checkbox" checked={formData.is_registration_open} onChange={e => setFormData({...formData, is_registration_open: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Registration Open
                </label>
                <label className="admin-checkbox-label" style={{marginLeft: 'auto'}}>
                  <input type="checkbox" checked={formData.require_eligibility} onChange={e => setFormData({...formData, require_eligibility: e.target.checked})} style={{width: '18px', height: '18px'}} />
                  Require Eligibility Criteria
                </label>
              </div>

              {/* Eligibility Filters */}
              {formData.require_eligibility && (
                <div style={{gridColumn: '1 / -1', background: 'var(--admin-surface-soft)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-border)'}}>
                  <h4 style={{marginTop: 0, marginBottom: '1rem', color: 'var(--admin-text)'}}>Eligibility Filters</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label className="admin-form-label">School</label>
                      <select className="admin-form-input" value={formData.eligibility_school} onChange={e => setFormData({...formData, eligibility_school: e.target.value, eligibility_programs: [], eligibility_branches: []})}>
                        <option value="">Any School</option>
                        {schools.map(school => <option key={school.id} value={school.id}>{school.school_code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="admin-form-label">Programmes (Multiple)</label>
                      <select multiple className="admin-form-input" value={formData.eligibility_programs} onChange={e => setFormData({...formData, eligibility_programs: Array.from(e.target.selectedOptions, option => option.value)})} disabled={!formData.eligibility_school}>
                        {programs.map(program => <option key={program.id} value={program.id}>{program.program_code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="admin-form-label">Branches (Multiple)</label>
                      <select multiple className="admin-form-input" value={formData.eligibility_branches} onChange={e => setFormData({...formData, eligibility_branches: Array.from(e.target.selectedOptions, option => option.value)})} disabled={formData.eligibility_programs.length === 0}>
                        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}
                      </select>
                    </div>
                  </div>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--admin-muted)'}}>Hold Ctrl (Windows) or Command (Mac) to select multiple options.</p>
                </div>
              )}
              
              <div style={{gridColumn: '1 / -1', marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem'}}>
                {editingQuizId ? (
                  <button 
                    type="button" 
                    className="admin-btn-cancel" 
                    onClick={() => {
                      handleDeleteClick(editingQuizId);
                      setShowModal(false);
                    }}
                    style={{
                      background: 'rgba(255, 80, 80, 0.12)',
                      borderColor: 'rgba(255, 80, 80, 0.4)',
                      color: 'rgb(255, 120, 120)',
                      marginRight: 'auto'
                    }}
                  >
                    DELETE QUIZ
                  </button>
                ) : <div />}

                <div style={{display: 'flex', gap: '1rem'}}>
                  <button type="button" className="admin-btn-cancel" onClick={() => setShowModal(false)}>
                    CANCEL
                  </button>
                  <button type="button" className="admin-btn-draft" onClick={handleSaveDraft} disabled={submitLoading}>
                    SAVE AS DRAFT
                  </button>
                  <button className="dash-chip-btn" type="submit" disabled={submitLoading} style={{background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold', padding: '0.8rem 2rem', fontSize: '1rem', cursor: 'pointer', borderRadius: '4px'}}>
                    {submitLoading ? 'SAVING...' : (editingQuizId ? 'SAVE CHANGES' : 'CREATE QUIZ')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="admin-modal-overlay" style={{ zIndex: 1050 }}>
          <div className="admin-modal-content" style={{ maxWidth: '650px', padding: '2.5rem' }}>
            <button className="admin-modal-close" onClick={() => setUploadResult(null)} type="button">&times;</button>
            <h3 style={{ color: 'var(--admin-text)', marginBottom: '1.5rem' }}>📊 Question Excel Upload Report</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(56, 176, 0, 0.08)', border: '1px solid rgba(56, 176, 0, 0.3)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', fontWeight: 'bold' }}>SUCCESSFULLY ADDED</span>
                <h2 style={{ color: '#38b000', margin: '0.5rem 0 0 0', fontSize: '2.25rem' }}>{uploadResult.success_count}</h2>
              </div>
              <div style={{ background: 'rgba(217, 4, 41, 0.08)', border: '1px solid rgba(217, 4, 41, 0.3)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', fontWeight: 'bold' }}>SKIPPED WITH ERRORS</span>
                <h2 style={{ color: '#d90429', margin: '0.5rem 0 0 0', fontSize: '2.25rem' }}>{uploadResult.error_count}</h2>
              </div>
            </div>
            
            {uploadResult.error_count > 0 && (
              <>
                <h4 style={{ color: 'rgb(255, 120, 120)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>⚠️ Validation Warnings & Errors</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-bg-deep)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}>
                        <th style={{ padding: '0.6rem', textAlign: 'center', width: '60px' }}>Row</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left' }}>Question Text</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.errors.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.6rem', textAlign: 'center', color: 'var(--admin-muted)', fontWeight: 'bold' }}>{err.row}</td>
                          <td style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={err.question}>{err.question}</td>
                          <td style={{ padding: '0.6rem', color: '#ffb703', fontWeight: '500' }}>{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="dash-chip-btn" 
                onClick={() => setUploadResult(null)}
                style={{ padding: '0.6rem 2.5rem', background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedManageQuiz && (
        <div className="admin-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="admin-modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
            <button className="admin-modal-close" onClick={() => setSelectedManageQuiz(null)} type="button">&times;</button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="admin-welcome-kicker">Manage Quiz Event Sector</span>
                <h3 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--admin-text)' }}>{selectedManageQuiz.title}</h3>
              </div>
              <button 
                type="button" 
                className="dash-chip-btn" 
                onClick={() => setShowAddQuestionForm(!showAddQuestionForm)}
                style={{
                  background: showAddQuestionForm ? 'rgba(255,255,255,0.08)' : 'rgb(var(--admin-cyan-rgb))',
                  color: showAddQuestionForm ? 'var(--admin-text)' : '#000',
                  border: showAddQuestionForm ? '1px solid var(--admin-border)' : 'none',
                  fontWeight: 'bold'
                }}
              >
                {showAddQuestionForm ? 'Close Manual Creator' : '+ Add Question Manually'}
              </button>
            </div>

            {/* Manual Question Creator Form */}
            {showAddQuestionForm && (
              <form onSubmit={handleAddQuestionSubmit} style={{ background: 'var(--admin-bg-deep)', border: '1px solid var(--admin-border)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'grid', gap: '1.2rem', gridTemplateColumns: '1fr 1fr' }}>
                <h4 style={{ gridColumn: '1 / -1', margin: 0, color: 'rgb(var(--admin-cyan-rgb))' }}>📝 Add Question Manually</h4>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="admin-form-label">Question Text</label>
                  <textarea 
                    required 
                    rows={2} 
                    className="admin-form-input admin-form-textarea" 
                    value={newQuestionData.text} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, text: e.target.value })} 
                  />
                </div>
                
                <div>
                  <label className="admin-form-label">Question Type</label>
                  <select 
                    className="admin-form-input" 
                    value={newQuestionData.question_type} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, question_type: e.target.value })}
                  >
                    <option value="regular">Regular (Preliminary)</option>
                    <option value="fff_1">Fastest Finger First (Batch 1)</option>
                    <option value="fff_2">Fastest Finger First (Batch 2)</option>
                    <option value="fff_3">Fastest Finger First (Batch 3)</option>
                    <option value="hotseat_1">Hotseat (Batch 1)</option>
                    <option value="hotseat_2">Hotseat (Batch 2)</option>
                    <option value="hotseat_3">Hotseat (Batch 3)</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">Category</label>
                  <input 
                    type="text" 
                    className="admin-form-input" 
                    value={newQuestionData.category} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, category: e.target.value })} 
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="admin-form-label">Trivia / Explanation</label>
                  <textarea 
                    rows={2} 
                    className="admin-form-input admin-form-textarea" 
                    value={newQuestionData.trivia} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, trivia: e.target.value })} 
                  />
                </div>

                {/* Choices Row */}
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <h5 style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--admin-text)' }}>Options & Correct Answer</h5>
                  {newQuestionData.choices.map((choice, index) => {
                    const isFFF = newQuestionData.question_type.startsWith('fff_');
                    return (
                      <div key={index} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '0.8rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>Option {String.fromCharCode(65 + index)}</span>
                        <input 
                          required 
                          type="text" 
                          placeholder="Option Text" 
                          className="admin-form-input" 
                          value={choice.text} 
                          onChange={e => {
                            const updatedChoices = [...newQuestionData.choices];
                            updatedChoices[index].text = e.target.value;
                            setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                          }} 
                        />
                        
                        {!isFFF ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--admin-text)', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="manual-correct-choice" 
                              checked={choice.is_correct} 
                              onChange={() => {
                                const updatedChoices = newQuestionData.choices.map((c, i) => ({
                                  ...c,
                                  is_correct: i === index
                                }));
                                setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                              }} 
                            />
                            Is Correct Option
                          </label>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text)' }}>Sequence Rank:</span>
                            <select 
                              className="admin-form-input" 
                              style={{ padding: '0.2rem 0.5rem', minWidth: '60px' }}
                              value={choice.correct_order || 1} 
                              onChange={e => {
                                const updatedChoices = [...newQuestionData.choices];
                                updatedChoices[index].correct_order = parseInt(e.target.value);
                                updatedChoices[index].is_correct = false;
                                setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                              }}
                            >
                              {newQuestionData.choices.map((_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {newQuestionData.question_type.startsWith('fff_') && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      {newQuestionData.choices.length < 15 && (
                        <button
                          type="button"
                          className="dash-chip-btn"
                          onClick={() => setNewQuestionData(prev => ({
                            ...prev,
                            choices: [...prev.choices, { text: '', is_correct: false, correct_order: prev.choices.length + 1 }]
                          }))}
                          style={{ borderColor: 'rgb(var(--admin-cyan-rgb))', color: 'rgb(var(--admin-cyan-rgb))' }}
                        >
                          + Add FFF Option ({newQuestionData.choices.length}/15)
                        </button>
                      )}
                      {newQuestionData.choices.length > 8 && (
                        <button
                          type="button"
                          className="dash-chip-btn"
                          onClick={() => setNewQuestionData(prev => ({
                            ...prev,
                            choices: prev.choices.slice(0, -1)
                          }))}
                          style={{ borderColor: 'rgb(255, 80, 80)', color: 'rgb(255, 80, 80)' }}
                        >
                          - Remove Last Option
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    className="admin-btn-cancel" 
                    onClick={() => setShowAddQuestionForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="dash-chip-btn" 
                    style={{ background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold' }}
                  >
                    Save Question
                  </button>
                </div>
              </form>
            )}

            {/* Questions List */}
            <h4 style={{ color: 'var(--admin-text)', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              📋 Loaded Questions ({manageQuestions.length})
            </h4>

            {manageQuestions.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: '2rem', fontStyle: 'italic' }}>
                No questions exist inside this quiz event yet.<br/>
                Add questions manually or upload an Excel sheet to seed them.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {manageQuestions.map((q, qIndex) => (
                  <div key={q.id} className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '0.8rem' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(212, 175, 55, 0.15)', borderColor: 'rgba(212, 175, 55, 0.3)', color: '#d4af37', padding: '0.2rem 0.5rem', border: '1px solid', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          {q.question_type.replace('_', ' ').toUpperCase()} • {q.category}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--admin-text)' }}>
                          {qIndex + 1}. {q.text}
                        </h4>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button" 
                          className="dash-chip-btn" 
                          onClick={() => handleEditQuestionClick(q)}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                        >
                          Edit
                        </button>
                        <button 
                          type="button" 
                          className="dash-chip-btn" 
                          onClick={() => handleDeleteQuestion(q.id)}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', color: '#ff5050', borderColor: 'rgba(255,80,80,0.3)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Choices render */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                      {q.choices.map((c, cIndex) => {
                        const correctHighlight = c.is_correct;
                        const correctSeq = c.correct_order;
                        return (
                          <div 
                            key={c.id} 
                            style={{
                              padding: '0.5rem 0.8rem',
                              borderRadius: '4px',
                              background: correctHighlight ? 'rgba(56, 176, 0, 0.08)' : (correctSeq ? 'rgba(212, 175, 55, 0.08)' : 'var(--admin-bg-deep)'),
                              border: correctHighlight ? '1px solid rgba(56, 176, 0, 0.3)' : (correctSeq ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid var(--admin-border)'),
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ color: correctHighlight ? '#38b000' : (correctSeq ? '#d4af37' : 'rgba(255,255,255,0.85)') }}>
                              <strong>{['A', 'B', 'C', 'D'][cIndex] || cIndex + 1}.</strong> {c.text}
                            </span>
                            {correctHighlight && <span style={{ color: '#38b000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ CORRECT</span>}
                            {correctSeq && <span style={{ color: '#d4af37', fontSize: '0.75rem', fontWeight: 'bold' }}>RANK {correctSeq}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.trivia && (
                      <p style={{ margin: '0.8rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--admin-border)' }}>
                        ℹ️ <strong>Explanation:</strong> {q.trivia}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
              <button 
                type="button" 
                className="admin-btn-cancel" 
                onClick={() => setSelectedManageQuiz(null)}
                style={{ padding: '0.6rem 3rem' }}
              >
                DISMISS CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <div className="admin-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="admin-modal-content" style={{ maxWidth: '650px', padding: '2.5rem' }}>
            <button className="admin-modal-close" onClick={() => setEditingQuestion(null)} type="button">&times;</button>
            <h3 style={{ color: 'var(--admin-text)', marginBottom: '1.5rem' }}>📝 Edit Question</h3>
            
            <form onSubmit={handleEditQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label className="admin-form-label">Question Text</label>
                <textarea 
                  required 
                  rows={2} 
                  className="admin-form-input admin-form-textarea" 
                  value={newQuestionData.text} 
                  onChange={e => setNewQuestionData({ ...newQuestionData, text: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="admin-form-label">Question Type</label>
                  <select 
                    className="admin-form-input" 
                    value={newQuestionData.question_type} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, question_type: e.target.value })}
                  >
                    <option value="regular">Regular (Preliminary)</option>
                    <option value="fff_1">Fastest Finger First (Batch 1)</option>
                    <option value="fff_2">Fastest Finger First (Batch 2)</option>
                    <option value="fff_3">Fastest Finger First (Batch 3)</option>
                    <option value="hotseat_1">Hotseat (Batch 1)</option>
                    <option value="hotseat_2">Hotseat (Batch 2)</option>
                    <option value="hotseat_3">Hotseat (Batch 3)</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">Category</label>
                  <input 
                    type="text" 
                    className="admin-form-input" 
                    value={newQuestionData.category} 
                    onChange={e => setNewQuestionData({ ...newQuestionData, category: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="admin-form-label">Trivia / Explanation</label>
                <textarea 
                  rows={2} 
                  className="admin-form-input admin-form-textarea" 
                  value={newQuestionData.trivia} 
                  onChange={e => setNewQuestionData({ ...newQuestionData, trivia: e.target.value })} 
                />
              </div>

              {/* Choices Rendering */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <h5 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0 0', color: 'var(--admin-text)' }}>Options & Correct Answer</h5>
                {newQuestionData.choices.map((choice, index) => {
                  const isFFF = newQuestionData.question_type.startsWith('fff_');
                  return (
                    <div key={index} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '0.8rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--admin-muted)' }}>Option {String.fromCharCode(65 + index)}</span>
                      <input 
                        required 
                        type="text" 
                        placeholder="Option Text" 
                        className="admin-form-input" 
                        value={choice.text} 
                        onChange={e => {
                          const updatedChoices = [...newQuestionData.choices];
                          updatedChoices[index].text = e.target.value;
                          setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                        }} 
                      />
                      
                      {!isFFF ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--admin-text)', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="edit-correct-choice" 
                            checked={choice.is_correct} 
                            onChange={() => {
                              const updatedChoices = newQuestionData.choices.map((c, i) => ({
                                ...c,
                                is_correct: i === index
                              }));
                              setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                            }} 
                          />
                          Is Correct Option
                        </label>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text)' }}>Sequence Rank:</span>
                          <select 
                            className="admin-form-input" 
                            style={{ padding: '0.2rem 0.5rem', minWidth: '60px' }}
                            value={choice.correct_order || 1} 
                            onChange={e => {
                              const updatedChoices = [...newQuestionData.choices];
                              updatedChoices[index].correct_order = parseInt(e.target.value);
                              updatedChoices[index].is_correct = false;
                              setNewQuestionData({ ...newQuestionData, choices: updatedChoices });
                            }}
                          >
                            {newQuestionData.choices.map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {newQuestionData.question_type.startsWith('fff_') && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    {newQuestionData.choices.length < 15 && (
                      <button
                        type="button"
                        className="dash-chip-btn"
                        onClick={() => setNewQuestionData(prev => ({
                          ...prev,
                          choices: [...prev.choices, { text: '', is_correct: false, correct_order: prev.choices.length + 1 }]
                        }))}
                        style={{ borderColor: 'rgb(var(--admin-cyan-rgb))', color: 'rgb(var(--admin-cyan-rgb))' }}
                      >
                        + Add FFF Option ({newQuestionData.choices.length}/15)
                      </button>
                    )}
                    {newQuestionData.choices.length > 8 && (
                      <button
                        type="button"
                        className="dash-chip-btn"
                        onClick={() => setNewQuestionData(prev => ({
                          ...prev,
                          choices: prev.choices.slice(0, -1)
                        }))}
                        style={{ borderColor: 'rgb(255, 80, 80)', color: 'rgb(255, 80, 80)' }}
                      >
                        - Remove Last Option
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="admin-btn-cancel" 
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="dash-chip-btn" 
                  style={{ background: 'rgb(var(--admin-cyan-rgb))', color: '#000', border: 'none', fontWeight: 'bold', padding: '0.6rem 2rem' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function AdminDashboardPage() {
  const [popupConfig, setPopupConfig] = useState(null);

  const showBeautifulPopup = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'OK', cancelText = 'Cancel') => {
    setPopupConfig({ title, message, type, onConfirm, onCancel, confirmText, cancelText });
  };

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      showBeautifulPopup("System Alert", message, 'info');
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <>
      <AdminDashboardInner showBeautifulPopup={showBeautifulPopup} />
      {popupConfig && (
        <div className="modal-overlay" style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className={`modal-content glass-card glow-${popupConfig.type === 'error' ? 'red' : popupConfig.type === 'success' ? 'green' : popupConfig.type === 'warning' ? 'yellow' : 'blue'}`} style={{ maxWidth: '450px', width: '90%', padding: '2rem', textAlign: 'center', animation: 'scaleUp 0.3s ease', borderRadius: '12px' }}>
            <h2 style={{
              color: popupConfig.type === 'error' ? 'var(--admin-red)' : popupConfig.type === 'success' ? '#4caf50' : popupConfig.type === 'warning' ? '#ff9800' : 'var(--admin-cyan)',
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.8rem',
              letterSpacing: '0.05em',
              fontWeight: '900'
            }}>
              {popupConfig.type === 'error' ? '🚨 ' : popupConfig.type === 'success' ? '🎉 ' : popupConfig.type === 'warning' ? '⚠️ ' : '💡 '}
              {popupConfig.title}
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.5', margin: '0 0 2rem 0', color: 'rgba(255, 255, 255, 0.95)', whiteSpace: 'pre-line' }}>
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
                      : popupConfig.type === 'warning'
                        ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
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

export default AdminDashboardPage;
