import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession, getCurrentUser, saveAuthSession } from '../../api/auth';
import './ProtectedRoute.css';

function ProtectedRoute({ allowedRoles, children }) {
  const storedSession = getAuthSession();
  
  // Instant entry: if they have a stored session with a valid matching role, let them in immediately
  // while we perform background validation! This guarantees zero loading freezes on refresh.
  const [state, setState] = useState(() => {
    if (!storedSession?.token) {
      return { status: 'unauthenticated', session: null };
    }
    if (allowedRoles.includes(storedSession.role)) {
      return { status: 'authenticated', session: storedSession };
    }
    return { status: 'checking', session: null };
  });

  useEffect(() => {
    if (!storedSession?.token) return;

    let ignore = false;
    getCurrentUser(storedSession.token)
      .then((data) => {
        if (ignore) return;

        const verifiedSession = {
          ...storedSession,
          role: data.role,
          user: data.user,
          student: data.user?.role === 'student' ? data.user : storedSession.student,
        };

        saveAuthSession(verifiedSession);
        setState({ status: 'authenticated', session: verifiedSession });
      })
      .catch((error) => {
        if (ignore) return;
        
        // Only kick them out if the server explicitly rejects the token as invalid (401/403)
        if (error.status === 401 || error.status === 403) {
          clearAuthSession();
          setState({ status: 'unauthenticated', session: null });
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (state.status === 'checking') {
    return (
      <main className="auth-check-page">
        <div className="auth-check-card">
          <span>QuizVerse</span>
          <p>Verifying access...</p>
        </div>
      </main>
    );
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(state.session.role)) {
    return <Navigate to={state.session.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />;
  }

  return children;
}

export default ProtectedRoute;
