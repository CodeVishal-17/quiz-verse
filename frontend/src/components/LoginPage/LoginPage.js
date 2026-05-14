import { useState } from 'react';
import './LoginPage.css';

const initialLoginState = {
  collegeId: '',
  password: '',
  rememberMe: false,
};

function LoginPage() {
  const [loginData, setLoginData] = useState(initialLoginState);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setLoginData((currentLoginData) => ({
      ...currentLoginData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <main className="login-page">
      <div className="login-particles" aria-hidden="true">
        <span className="particle particle-one" />
        <span className="particle particle-two" />
        <span className="particle particle-three" />
        <span className="particle particle-four" />
      </div>

      <div className="login-symbols" aria-hidden="true">
        <span className="login-symbol symbol-quiz">?</span>
        <span className="login-symbol symbol-bolt">Q</span>
        <span className="login-symbol symbol-score">99</span>
        <span className="login-symbol symbol-pad">
          <span className="mini-controller">
            <span className="mini-cross" />
            <span className="mini-buttons" />
          </span>
        </span>
      </div>

      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-hero">
          <div className="login-orbit" aria-hidden="true">
            <span className="login-core">QV</span>
            <span className="login-chip chip-question">?</span>
            <span className="login-chip chip-rank">#1</span>
            <span className="login-chip chip-timer">60s</span>
          </div>

          <p className="login-label">QuizVerse Campus League</p>
          <h1 id="login-title">Enter The Arena.</h1>
          <p className="login-subtitle">
            Log in and continue your journey through the ultimate campus quiz battleground.
          </p>

          <div className="login-arena-tags" aria-hidden="true">
            <span>Live Rank</span>
            <span>Power Round</span>
            <span>Final Buzzer</span>
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <p>Player Access</p>
            <h2>Resume your run</h2>
          </div>

          <div className="login-field">
            <label htmlFor="collegeId">College ID</label>
            <input
              id="collegeId"
              name="collegeId"
              type="text"
              placeholder="College ID"
              value={loginData.collegeId}
              onChange={handleChange}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={loginData.password}
              onChange={handleChange}
            />
          </div>

          <div className="login-options">
            <label className="remember-check" htmlFor="rememberMe">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={loginData.rememberMe}
                onChange={handleChange}
              />
              <span>Remember Me</span>
            </label>

            <a href="#forgot-password">Forgot Password?</a>
          </div>

          <button className="login-button" type="submit">
            Login
          </button>

          <div className="create-account-panel">
            <p>New to QuizVerse?</p>
            <button className="create-account-button" type="button">
              Create Account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
