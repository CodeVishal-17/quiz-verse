import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [loginData, setLoginData] = useState({ collegeId: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <main className="login-page">
      <div className="login-background">
        <div className="bg-shape shape-mint" />
        <div className="bg-particles" />
      </div>

      <div className="login-container">
        <div className="login-header">
          <div className="header-icon">△</div>
          <h1 className="login-title">PLAYER ACCESS</h1>
          <p className="login-subtitle">Enter your credentials to resume your run in the arena.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="collegeId">COLLEGE ID</label>
            <input 
              id="collegeId" 
              name="collegeId" 
              type="text" 
              placeholder="e.g. 123456" 
              value={loginData.collegeId} 
              onChange={handleChange} 
              required
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
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              value={loginData.password} 
              onChange={handleChange} 
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">VERIFY IDENTITY</button>
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
