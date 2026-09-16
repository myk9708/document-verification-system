const BASE_URL = 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('userData', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
}

export function getSession() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — force logout
    clearSession();
    window.location.reload();
    throw new Error("Session expired, reloading...");
  }

  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    throw new Error(data.error || 'Access denied');
  }

  return res;
}