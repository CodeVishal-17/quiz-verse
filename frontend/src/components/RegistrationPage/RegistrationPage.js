import { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegistrationPage.css';

function RegistrationPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    collegeId: '',
    email: '',
    school: '',
    branch: '',
    year: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle registration
  };

  return (
    <main className="registration-page">
      <div className="registration-background">
        <div className="bg-shape shape-pink-large" />
        <div className="bg-shape shape-mint-square" />
        <div className="bg-particles" />
      </div>

      <div className="registration-container">
        <div className="registration-header">
          <div className="header-icon">○</div>
          <h1 className="registration-title">PARTICIPANT REGISTRATION</h1>
          <p className="registration-subtitle">Enter your official details to be verified for the arena.</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">FULL NAME</label>
              <input 
                id="fullName" 
                name="fullName" 
                type="text" 
                placeholder="e.g. Aria Sharma" 
                value={formData.fullName} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="collegeId">COLLEGE ID</label>
              <input 
                id="collegeId" 
                name="collegeId" 
                type="text" 
                placeholder="e.g. 123456" 
                value={formData.collegeId} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="email">STUDENT EMAIL</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="player@university.edu" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-row three-col">
            <div className="form-group">
              <label htmlFor="school">SCHOOL</label>
              <select id="school" name="school" value={formData.school} onChange={handleChange} required>
                <option value="">SELECT</option>
                <option value="SOET">SOET</option>
                <option value="SOSC">SOSC</option>
                <option value="SOP">SOP</option>
                <option value="SOM">SOM</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="branch">BRANCH</label>
              <select id="branch" name="branch" value={formData.branch} onChange={handleChange} required>
                <option value="">SELECT</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="year">YEAR</label>
              <select id="year" name="year" value={formData.year} onChange={handleChange} required>
                <option value="">SELECT</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">PASSWORD</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit btn-pink">SUBMIT REGISTRATION</button>
          </div>
        </form>

        <div className="registration-footer">
          <Link to="/login" className="link-secondary">ALREADY REGISTERED? ENTER SYSTEM</Link>
        </div>
      </div>
    </main>
  );
}

export default RegistrationPage;
