import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getBranchesByProgram,
  getProgramsBySchool,
  getSchools,
  registerStudent,
  saveAuthSession,
} from '../../api/auth';
import './RegistrationPage.css';

function RegistrationPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    collegeId: '',
    email: '',
    school: '',
    program: '',
    branch: '',
    year: '',
    password: '',
    confirmPassword: '',
  });
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    setIsLoadingSchools(true);

    getSchools()
      .then((data) => {
        if (!ignore) {
          setSchools(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSchools([]);
          setError('Unable to load schools. Please try again.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingSchools(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!formData.school) {
      setPrograms([]);
      setBranches([]);
      return;
    }

    let ignore = false;
    setPrograms([]);
    setBranches([]);
    setIsLoadingPrograms(true);

    getProgramsBySchool(formData.school)
      .then((data) => {
        if (!ignore) {
          setPrograms(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setPrograms([]);
          setError('Unable to load programs for the selected school.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingPrograms(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [formData.school]);

  useEffect(() => {
    if (!formData.program) {
      setBranches([]);
      return;
    }

    let ignore = false;
    setBranches([]);
    setIsLoadingBranches(true);

    getBranchesByProgram(formData.program)
      .then((data) => {
        if (!ignore) {
          setBranches(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setBranches([]);
          setError('Unable to load branches for the selected program.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingBranches(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [formData.program]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setError('');
    setFormData((current) => {
      const next = { ...current, [name]: value };

      if (name === 'school') {
        next.program = '';
        next.branch = '';
      }

      if (name === 'program') {
        next.branch = '';
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await registerStudent({
        fullName: formData.fullName,
        collegeId: formData.collegeId,
        email: formData.email,
        school: formData.school,
        program: formData.program,
        branch: formData.branch,
        year: formData.year,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      saveAuthSession(session);
      navigate('/dashboard');
    } catch (requestError) {
      const detail = requestError.data || {};
      const message =
        detail.detail ||
        detail.message ||
        Object.values(detail).flat().join(' ') ||
        'Registration failed. Please check your details.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="header-icon">O</div>
          <h1 className="registration-title">PARTICIPANT REGISTRATION</h1>
          <p className="registration-subtitle">Enter your official details to be verified for the arena.</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

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

          <div className="form-row four-col">
            <div className="form-group">
              <label htmlFor="school">SCHOOL</label>
              <select id="school" name="school" value={formData.school} onChange={handleChange} required disabled={isLoadingSchools}>
                <option value="">{isLoadingSchools ? 'LOADING...' : 'SELECT'}</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.school_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="program">PROGRAM</label>
              <select
                id="program"
                name="program"
                value={formData.program}
                onChange={handleChange}
                required
                disabled={!formData.school || isLoadingPrograms}
              >
                <option value="">{isLoadingPrograms ? 'LOADING...' : 'SELECT'}</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.program_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="branch">BRANCH</label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                required
                disabled={!formData.program || isLoadingBranches}
              >
                <option value="">{isLoadingBranches ? 'LOADING...' : 'SELECT'}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_code}
                  </option>
                ))}
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
                placeholder="********"
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
                placeholder="********"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit btn-pink" disabled={isSubmitting}>
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
            </button>
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
