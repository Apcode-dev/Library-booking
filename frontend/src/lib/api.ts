import axios from 'axios';

// Relative /api automatically routes through Vite dev proxy (local and Cloudflare tunnel)
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach stored JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('libspace_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle single-device session expiry & 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (localStorage.getItem('libspace_token')) {
        localStorage.removeItem('libspace_token');
        const isSessionExpired = error.response?.data?.sessionExpired;
        window.dispatchEvent(
          new CustomEvent('libspace:session_expired', {
            detail: {
              message:
                error.response?.data?.message ||
                'Session Expired: Logged out because account was accessed on another device.',
              sessionExpired: isSessionExpired,
            },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;
