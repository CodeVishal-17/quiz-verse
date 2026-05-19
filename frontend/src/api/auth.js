const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const AUTH_STORAGE_KEY = 'quizverse_auth';

async function request(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optionHeaders || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Request failed.');
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

export function registerStudent(payload) {
  return request('/users/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginStudent(payload) {
  return request('/users/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser(token) {
  return request('/users/me/', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getSchools() {
  return request('/schools/', {
    method: 'GET',
  });
}

export function getProgramsBySchool(schoolId) {
  return request(`/programs/?school_id=${schoolId}`, {
    method: 'GET',
  });
}

export function getBranchesByProgram(programId) {
  return request(`/branches/?program_id=${programId}`, {
    method: 'GET',
  });
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getAuthSession() {
  const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch (_error) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
