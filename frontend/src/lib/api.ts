import axios from 'axios';

// Detect whether we are running in an installed native mobile app (Capacitor WebView)
const isNative =
  typeof window !== 'undefined' &&
  (Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    window.location.hostname === 'localhost' && navigator.userAgent.includes('Android'));

// Stored custom API URL (allows dynamic configuration from in-app settings if needed)
const storedApiUrl = typeof window !== 'undefined' ? localStorage.getItem('libspace_custom_api_url') : null;

// Official Render production backend URL
export const PRODUCTION_API_URL = 'https://library-booking-49tt.onrender.com/api';

// On Web: use VITE_API_URL or relative /api. On Native Android: use configured or production backend.
const rawUrl =
  storedApiUrl ||
  (import.meta as any).env?.VITE_API_URL ||
  (isNative ? PRODUCTION_API_URL : '/api');

export const API_BASE_URL = (rawUrl || '').trim();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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
