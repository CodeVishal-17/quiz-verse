import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession, getCurrentUser, saveAuthSession } from '../../api/auth';
import './ProtectedRoute.css';

function ProtectedRoute({ allowedRoles, children }) {
  const [state, setState] = useState({ status: 'checking', session: null });

  useEffect(() => {
    let ignore = false;
    const storedSession = getAuthSession();

    if (!storedSession?.token) {
      setState({ status: 'unauthenticated', session: null });
      return () => {
        ignore = true;
      };
    }

    getCurrentUser(storedSession.token)
      .then((data) => {
        if (ignore) {
          return;
        }

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
        if (!ignore) {
          // Only clear session and logout if the token is explicitly rejected (401 or 403)
          if (error.status === 401 || error.status === 403) {
            clearAuthSession();
            setState({ status: 'unauthenticated', session: null });
          } else {
            // Otherwise, keep the session and assume authenticated so we don't log them out on 500/network errors
            setState({ status: 'authenticated', session: storedSession });
          }
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
