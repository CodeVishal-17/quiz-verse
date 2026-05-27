let rawApiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;
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

export function updateUserCredentials(token, payload) {
  return request('/users/me/', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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

export function getAdminStudents(token) {
  return request('/users/admin/students/', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createAdminStudent(token, payload) {
  return request('/users/admin/students/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminStudent(token, studentId) {
  return request(`/users/admin/students/${studentId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function bulkUploadStudents(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const rawApiUrlLocal = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
  const baseUrl = rawApiUrlLocal.endsWith('/api') ? rawApiUrlLocal : `${rawApiUrlLocal.replace(/\/$/, '')}/api`;

  const response = await fetch(`${baseUrl}/users/admin/students/bulk-upload/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || 'Bulk upload failed.');
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function downloadStudentTemplate(token) {
  const rawApiUrlLocal = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
  const baseUrl = rawApiUrlLocal.endsWith('/api') ? rawApiUrlLocal : `${rawApiUrlLocal.replace(/\/$/, '')}/api`;

  const response = await fetch(`${baseUrl}/users/admin/students/download-template/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to download template.');
  }
  return response.blob();
}

export function updateAdminStudent(token, studentId, payload) {
  return request(`/users/admin/students/${studentId}/`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function changePassword(token, payload) {
  return request('/users/change-password/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
