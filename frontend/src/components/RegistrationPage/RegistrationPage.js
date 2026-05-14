import { useState } from 'react';
import './RegistrationPage.css';

const initialFormState = {
  fullName: '',
  collegeId: '',
  email: '',
  school: '',
  branch: '',
  year: '',
  password: '',
  confirmPassword: '',
};

const schools = ['SOET', 'SOSC', 'SOP', 'SOM'];

const branches = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence',
  'Data Science',
];

const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

function RegistrationPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isRegistered, setIsRegistered] = useState(false);

  const validateForm = () => {
    const nextErrors = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        nextErrors[key] = 'This field is required.';
      }
    });

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (formData.password && formData.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }));
    setIsRegistered(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (validateForm()) {
      setIsRegistered(true);
      setFormData(initialFormState);
    }
  };

  return (
    <main className="registration-page">
      <div className="background-symbols" aria-hidden="true">
        <span className="symbol-card symbol-question">?</span>
        <span className="symbol-card symbol-buzzer">Q</span>
        <span className="symbol-card symbol-controller">
          <span className="controller-body">
            <span className="controller-pad" />
            <span className="controller-buttons" />
          </span>
        </span>
        <span className="symbol-card symbol-spark">A+</span>
        <span className="symbol-card symbol-ring">01</span>
        <span className="symbol-card symbol-vs">VS</span>
      </div>

      <section className="registration-shell" aria-labelledby="registration-title">
        <div className="registration-copy">
          <div className="arena-orbit" aria-hidden="true">
            <span className="orbit-core">QV</span>
            <span className="orbit-chip chip-top">?</span>
            <span className="orbit-chip chip-right">A</span>
            <span className="orbit-chip chip-bottom">3R</span>
          </div>

          <p className="event-label"> QuizVerse Campus League</p>
          <h1 id="registration-title">Compete. Qualify. Conquer.</h1>
          <p className="subtitle">
            Register your profile and step into a high-stakes arena of campus quiz battles.
          </p>

          <div className="stats-row" aria-label="QuizVerse highlights">
            <div>
              <span>3</span>
              <p>Rounds</p>
            </div>
            <div>
              <span>2</span>
              <p>Qualifier Zones</p>
            </div>
            <div>
              <span>1</span>
              <p>Champion Title</p>
            </div>
          </div>

          <div className="arena-strip" aria-hidden="true">
            <span>Live Leaderboard</span>
            <span>Speed Round</span>
            <span>Final Buzzer</span>
          </div>
        </div>

        <form className="registration-card" onSubmit={handleSubmit} noValidate>
          <div className="form-header">
            <p>Student Access</p>
            <h2>Create your contender profile</h2>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your Name"
                value={formData.fullName}
                onChange={handleChange}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="collegeId">College ID</label>
              <input
                id="collegeId"
                name="collegeId"
                type="text"
                placeholder="College ID"
                value={formData.collegeId}
                onChange={handleChange}
                aria-invalid={Boolean(errors.collegeId)}
              />
              {errors.collegeId && <span className="error-message">{errors.collegeId}</span>}
            </div>

            <div className="field-group full-width">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="xyz@gmail.com"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="compact-select-row">
              <div className="field-group">
                <label htmlFor="school">School</label>
                <select
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.school)}
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
                {errors.school && <span className="error-message">{errors.school}</span>}
              </div>

              <div className="field-group">
                <label htmlFor="branch">Branch</label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.branch)}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {errors.branch && <span className="error-message">{errors.branch}</span>}
              </div>

              <div className="field-group">
                <label htmlFor="year">Year</label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.year)}
                >
                  <option value="">Select year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && <span className="error-message">{errors.year}</span>}
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          <button className="register-button" type="submit">
            Register
          </button>

          {isRegistered && (
            <p className="success-message" role="status">
              Registration saved locally. Backend connection can come next.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default RegistrationPage;
