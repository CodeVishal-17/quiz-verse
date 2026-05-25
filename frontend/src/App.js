import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import LoginPage from './components/LoginPage/LoginPage';
import RegistrationPage from './components/RegistrationPage/RegistrationPage';
import DashboardPage from './components/DashboardPage/DashboardPage';
import AdminDashboardPage from './components/AdminDashboardPage/AdminDashboardPage';
import QuizArenaPage from './components/QuizArenaPage/QuizArenaPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:id/play"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin']}>
            <QuizArenaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz-arena/:id"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin']}>
            <QuizArenaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
