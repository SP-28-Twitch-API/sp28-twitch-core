import { ApiError } from './errors';

// talks to the express backend --> session cookie goes along automatically
async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'NETWORK', "Can't reach the StreamPulse server. Is the backend running?");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `HTTP_${res.status}`, data?.message || 'Something went wrong. Please try again.');
  }
  return data;
}

export const realApi = {
  mode: 'live',
  loginUrl: '/auth/login',
  getMe: () => request('/api/me'),
  getOverlay: () => request('/api/overlay'),
  regenerateOverlay: () => request('/api/overlay/regenerate', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  disconnect: () => request('/api/account/disconnect', { method: 'POST' }),
  deleteAccount: () => request('/api/account', { method: 'DELETE' }),
  // channel stats arrive with the helix step, until then the dashboard says "not connected yet"
  getStats: async () => null
};