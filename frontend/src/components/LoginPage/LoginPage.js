import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginStudent, saveAuthSession } from '../../api/auth';
import KbcStageFx from '../KbcStageFx/KbcStageFx';
import './LoginPage.css';

function LoginPage() {
  const [loginData, setLoginData] = useState({ collegeId: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await loginStudent({
        identifier: loginData.collegeId || loginData.email,
        password: loginData.password,
      });

      saveAuthSession(session);

      if (session.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (requestError) {
      const detail = requestError.data || {};
      const message =
        detail.detail ||
        detail.message ||
        Object.values(detail).flat().join(' ') ||
        'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page kbc-broadcast">
      <div className="login-background">
        <KbcStageFx />
      </div>

      <div className="login-container kbc-frame-panel">
        <div className="login-header">
          <div className="header-icon">₹</div>
          <h1 className="login-title kbc-title-shimmer">Player Access</h1>
          <p className="login-subtitle">Enter your credentials to resume your run in the arena.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="form-group">
            <label htmlFor="collegeId">COLLEGE ID</label>
            <input
              id="collegeId"
              name="collegeId"
              type="text"
              placeholder="e.g. 123456"
              value={loginData.collegeId}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">STUDENT EMAIL</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="player@university.edu"
              value={loginData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              value={loginData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'VERIFYING...' : 'VERIFY IDENTITY'}
            </button>
          </div>
        </form>

        <div className="login-footer">
          <Link to="/register" className="link-secondary">NEW PLAYER? REGISTER HERE</Link>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
