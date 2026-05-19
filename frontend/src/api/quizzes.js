import { getAuthSession } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

async function request(path, options, tokenParam) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = tokenParam || getAuthSession()?.token;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // some responses might be empty
  }

  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Request failed.');
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getPublishedQuizzes(token) {
  return request('/quizzes/published/', { method: 'GET' }, token);
}

export function getQuizDetails(id, token) {
  return request(`/quizzes/${id}/`, { method: 'GET' }, token);
}

export function getMyRegistrations(token) {
  return request('/quizzes/my-registrations/', { method: 'GET' }, token);
}

export function registerForQuiz(id, token) {
  return request(`/quizzes/${id}/register/`, { method: 'POST' }, token);
}

export function processMockPayment(id, token) {
  return request(`/quizzes/${id}/mock-payment/`, { method: 'POST' }, token);
}

// Admin Methods
export function getAdminStats(token) {
  return request('/quizzes/admin-stats/', { method: 'GET' }, token);
}

export function getAdminQuizzes(token) {
  return request('/quizzes/', { method: 'GET' }, token);
}

export function createAdminQuiz(payload, token) {
  return request('/quizzes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateAdminQuiz(id, payload, token) {
  return request(`/quizzes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}
