import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../lib/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<any>;
  register: (data: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => Promise<any>;
  sendRegisterOtp: (email: string, name?: string) => Promise<any>;
  verifyRegisterOtp: (email: string, otp: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('libspace_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('libspace_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        if (res.data.user?.id) {
          localStorage.setItem('libspace_user_id', res.data.user.id);
        }
      }
    } catch (err) {
      localStorage.removeItem('libspace_token');
      localStorage.removeItem('libspace_user_id');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // 1. Cross-tab storage change listener (syncs login/logout across open tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'libspace_token') {
        if (!e.newValue) {
          setToken(null);
          setUser(null);
        } else {
          setToken(e.newValue);
          refreshUser();
        }
      }
    };

    // 2. Single active session expiry listener (triggered when logged in elsewhere)
    const handleSessionExpired = (e: any) => {
      const msg = e.detail?.message || 'Session Expired: You have logged in on another device.';
      toast.error(msg, { id: 'session_expired_toast', duration: 6000 });
      setToken(null);
      setUser(null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('libspace:session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('libspace:session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string, expectedRole?: UserRole) => {
    const res = await api.post('/auth/login', { email, password, expectedRole });
    if (res.data.success && res.data.token) {
      localStorage.setItem('libspace_token', res.data.token);
      if (res.data.user?.id) {
        localStorage.setItem('libspace_user_id', res.data.user.id);
      }
      setToken(res.data.token);
      setUser(res.data.user);
      window.dispatchEvent(new Event('libspace_favorites_updated'));
    }
    return res.data;
  };

  const sendRegisterOtp = async (email: string, name?: string) => {
    const res = await api.post('/auth/register-otp/send', { email, name });
    return res.data;
  };

  const verifyRegisterOtp = async (email: string, otp: string) => {
    const res = await api.post('/auth/register-otp/verify', { email, otp });
    return res.data;
  };

  const register = async (data: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success && res.data.token) {
      localStorage.setItem('libspace_token', res.data.token);
      if (res.data.user?.id) {
        localStorage.setItem('libspace_user_id', res.data.user.id);
      }
      setToken(res.data.token);
      setUser(res.data.user);
      window.dispatchEvent(new Event('libspace_favorites_updated'));
    }
    return res.data;
  };

  const forgotPassword = async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  };

  const updateProfile = async (data: { name?: string; phone?: string; avatar?: string }) => {
    const res = await api.patch('/auth/profile', data);
    if (res.data.success && res.data.user) {
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('libspace_token');
    localStorage.removeItem('libspace_user_id');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('libspace_favorites_updated'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        sendRegisterOtp,
        verifyRegisterOtp,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
