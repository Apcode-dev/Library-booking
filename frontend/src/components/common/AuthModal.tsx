import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Check,
  KeyRound,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'USER',
  initialMode = 'login',
}) => {
  const navigate = useNavigate();
  const {
    login,
    register,
    sendRegisterOtp,
    verifyRegisterOtp,
    forgotPassword,
    resetPassword,
  } = useAuth();

  // Role is locked strictly to defaultRole (no switching tabs inside modal)
  const [targetRole, setTargetRole] = useState<UserRole>(defaultRole);
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // OTP Verification State
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Forgot Password Flow State
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // General Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ownerPendingNotice, setOwnerPendingNotice] = useState<boolean>(false);
  const [registrationCompleteNotice, setRegistrationCompleteNotice] = useState<boolean>(false);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Update role when defaultRole prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetRole(defaultRole);
      setAuthMode(initialMode);
      resetState();
    }
  }, [isOpen, defaultRole, initialMode]);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
    setOwnerPendingNotice(false);
    setRegistrationCompleteNotice(false);
    setRegOtpSent(false);
    setIsEmailVerified(false);
    setRegOtp('');
    setOtpCountdown(0);
    setForgotOtpSent(false);
    setForgotOtp('');
  };

  // 1. Password Login with STRICT Role Enforcement
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setLoading(true);

    try {
      await login(email, password, targetRole);
      toast.success(
        `Welcome back! Logged in as ${
          targetRole === 'USER' ? 'Student' : targetRole === 'OWNER' ? 'Library Owner' : 'Platform Admin'
        }.`
      );
      onClose();

      // Immediate redirect on login
      if (targetRole === 'ADMIN') {
        navigate('/admin');
      } else if (targetRole === 'OWNER') {
        navigate('/owner');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err.response?.data?.isPendingApproval) {
        setOwnerPendingNotice(true);
        setError(err.response?.data?.message);
        toast.error('Your Library Owner account is awaiting Admin approval.');
      } else if (err.response?.data?.roleMismatch) {
        const mismatchMsg = err.response?.data?.message || 'Role Mismatch';
        setError(mismatchMsg);
        toast.error(mismatchMsg, { duration: 6000 });
        if (mismatchMsg.includes('ADMIN')) {
          setTargetRole('ADMIN');
        } else if (mismatchMsg.includes('OWNER')) {
          setTargetRole('OWNER');
        } else if (mismatchMsg.includes('USER')) {
          setTargetRole('USER');
        }
      } else {
        const errorMsg = err.response?.data?.message || 'Login failed. Please verify your email and password.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Send Registration OTP Email
  const handleSendRegisterOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address to receive your OTP.');
      toast.error('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSendingOtp(true);

    try {
      const res = await sendRegisterOtp(email, name || 'User');
      setRegOtpSent(true);
      setOtpCountdown(60);
      const msg = res.message || 'OTP sent successfully to your email.';
      setSuccessMessage(msg);
      toast.success(msg);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP email.';
      setError(msg);
      toast.error(msg, { duration: 6000 });
    } finally {
      setSendingOtp(false);
    }
  };

  // 3. Verify Registration OTP -> Triggers GREEN TICK
  const handleVerifyRegisterOtp = async () => {
    if (!regOtp || regOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code received in your email.');
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }
    setError(null);
    setVerifyingOtp(true);

    try {
      const res = await verifyRegisterOtp(email, regOtp.trim());
      if (res.verified) {
        setIsEmailVerified(true);
        setSuccessMessage('Email verified successfully! ✅');
        toast.success('Email verified successfully! ✅');
        setError(null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 4. Complete Registration (Only enabled after Green Tick)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setError('Please verify your email with the 6-digit verification code first.');
      toast.error('Please verify your email via OTP before submitting.');
      return;
    }

    resetState();
    setLoading(true);

    try {
      const res = await register({
        name,
        email,
        password,
        role: targetRole,
      });

      if (res.requiresApproval) {
        setRegistrationCompleteNotice(true);
        setOwnerPendingNotice(true);
        toast.success('Owner account submitted! Awaiting Admin approval.');
      } else {
        toast.success(`Registration successful! Welcome to LibSpace.`);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 5. Send Forgot Password OTP
  const handleSendForgotOtp = async () => {
    if (!email) {
      setError('Please enter your registered email address.');
      toast.error('Please enter your registered email.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setForgotOtpSent(true);
      setSuccessMessage(res.message);
      toast.success(res.message);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send password reset code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 6. Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !newPassword) {
      setError('Please enter both the OTP code and your new password.');
      toast.error('Please fill in both OTP and new password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await resetPassword(email, forgotOtp, newPassword);
      setSuccessMessage(res.message || 'Password reset successfully. You can now sign in.');
      toast.success('Password updated successfully! Please sign in.');
      setAuthMode('login');
      setPassword(newPassword);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Role metadata configurations
  const roleConfig = {
    USER: {
      badge: '🎓 Student Portal',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      desktopGradient: 'from-blue-700 via-indigo-800 to-slate-900',
      desktopTitle: 'Your Study Sanctuary',
      desktopSubtitle: 'Book silent study desks with guaranteed Wi-Fi, AC, and 5-minute hold protection.',
      features: [
        'Instant Desk Booking by the hour or day',
        '5-Minute Hold Protection Engine',
        'Pincode-Verified Study Halls',
        'Digital QR Code Entry Passes',
      ],
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      roleTitle: 'Student',
    },
    OWNER: {
      badge: '🏢 Library Partner',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      desktopGradient: 'from-amber-600 via-orange-700 to-slate-950',
      desktopTitle: 'Monetize Study Spaces',
      desktopSubtitle: 'List up to 5 library branches, manage hourly rates, and track live occupancy.',
      features: [
        'Multi-Branch Management (Up to 5 Libraries)',
        '6-Digit Security PIN per Library Branch',
        'Interactive Visual Seat Map & Layouts',
        'Real-time Revenue & Booking Analytics',
      ],
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      roleTitle: 'Library Owner',
    },
    ADMIN: {
      badge: '🛡️ Platform Admin',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      desktopGradient: 'from-purple-800 via-indigo-900 to-slate-950',
      desktopTitle: 'Platform Oversight',
      desktopSubtitle: 'Centralized state-wise management, sub-admin delegation, and revenue audits.',
      features: [
        'State-Wise Sub-Admin Delegation',
        'Library Verification & Escalations',
        'Full User & Owner Account Audits',
        'Financial Auditing & Platform Metrics',
      ],
      buttonBg: 'bg-purple-700 hover:bg-purple-800 text-white',
      roleTitle: 'Administrator',
    },
  };

  const currentConfig = roleConfig[targetRole] || roleConfig.USER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn text-slate-900">
      {/* Responsive Card Container: On mobile it is compact and direct; on desktop it shows a 2-column layout */}
      <div className="relative w-full max-w-md md:max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col md:grid md:grid-cols-12 max-h-[92dvh] sm:max-h-[90vh]">

        {/* ======================================================== */}
        {/* DESKTOP-ONLY SIDEBAR (Hidden on mobile to save 100% space) */}
        {/* ======================================================== */}
        <div
          className={`hidden md:flex md:col-span-5 p-6 sm:p-8 text-white flex-col justify-between relative overflow-hidden bg-gradient-to-br ${currentConfig.desktopGradient}`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <img
                src="/images/libspace-logo.png"
                alt="LibSpace Official Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-md"
              />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 border border-white/20 text-white backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentConfig.badge}</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                {currentConfig.desktopTitle}
              </h2>
              <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
                {currentConfig.desktopSubtitle}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {currentConfig.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10 text-xs text-white/90"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-[11px] leading-tight">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span>LibSpace Network</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN FORM COLUMN (100% width on mobile, 7/12 on desktop) */}
        {/* ======================================================== */}
        <div className="w-full md:col-span-7 flex flex-col justify-between bg-white overflow-hidden max-h-[92dvh] sm:max-h-[90vh]">

          {/* Clean Top Header (Role badge + Title + Close Button) */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src="/images/libspace-logo.png"
                alt="LibSpace"
                className="w-6 h-6 rounded-lg object-contain shadow-2xs"
              />
              <span
                className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border ${currentConfig.badgeClass}`}
              >
                {currentConfig.badge}
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800">
                {authMode === 'login'
                  ? 'Sign In'
                  : authMode === 'register'
                  ? 'Create Account'
                  : 'Password Reset'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Quick Role Switcher Tabs */}
          <div className="px-4 pt-3 sm:px-6 sm:pt-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setTargetRole('USER');
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  targetRole === 'USER'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>🎓 Student</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('OWNER');
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  targetRole === 'OWNER'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>🏢 Owner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('ADMIN');
                  setAuthMode('login');
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  targetRole === 'ADMIN'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>🛡️ Admin</span>
              </button>
            </div>
          </div>

          {/* Segmented Mode Switcher: Sign In vs Create Account (Hidden for Admin & Forgot Pass) */}
          {targetRole !== 'ADMIN' && authMode !== 'forgot_password' && (
            <div className="px-4 pt-3 sm:px-6 sm:pt-4 flex-shrink-0">
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/80 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    resetState();
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'hover:text-slate-900 text-slate-500'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    resetState();
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'hover:text-slate-900 text-slate-500'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Notice */}
          {targetRole === 'ADMIN' && (
            <div className="px-4 pt-3 sm:px-6 sm:pt-4 flex-shrink-0">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>
                  Admin console requires verified credentials issued by Master Admin.
                </span>
              </div>
            </div>
          )}

          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1">

            {/* 1. Registration Submitted Notice for Owner */}
            {registrationCompleteNotice && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-2 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-amber-900">
                  Owner Application Submitted
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Your Library Owner account has been created and sent to the <strong>Platform Admin</strong> for approval.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationCompleteNotice(false);
                    setAuthMode('login');
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Go to Sign In
                </button>
              </div>
            )}

            {/* 2. Owner Pending Notice (When unapproved owner tries to log in) */}
            {ownerPendingNotice && !registrationCompleteNotice && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Awaiting Admin Approval</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your Library Owner account is under verification. You will be able to log in once approved.
                </p>
              </div>
            )}

            {/* Alerts */}
            {successMessage && !registrationCompleteNotice && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && !registrationCompleteNotice && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* 1. SIGN IN FORM */}
            {/* ======================================================== */}
            {authMode === 'login' && !registrationCompleteNotice && (
              <form onSubmit={handlePasswordLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        targetRole === 'ADMIN'
                          ? 'admin@libspace.com'
                          : targetRole === 'OWNER'
                          ? 'owner@studyhub.com'
                          : 'student@example.com'
                      }
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-800">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        resetState();
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer ${currentConfig.buttonBg}`}
                  >
                    {loading ? (
                      'Signing In...'
                    ) : (
                      <>
                        <span>Sign In as {currentConfig.roleTitle}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {targetRole !== 'ADMIN' && (
                  <div className="text-center pt-1">
                    <span className="text-[11px] text-slate-500">Need an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        resetState();
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Register here
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ======================================================== */}
            {/* 2. REGISTER NEW ACCOUNT (With Email OTP + Green Tick) */}
            {/* ======================================================== */}
            {authMode === 'register' && !registrationCompleteNotice && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* Email Address with Send OTP & Green Tick */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Email Address
                    </label>
                    {isEmailVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Verified ✅
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none ${
                        isEmailVerified ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    />
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsEmailVerified(false);
                        setRegOtpSent(false);
                      }}
                      placeholder="name@example.com"
                      className={`w-full pl-9 pr-24 py-2 text-xs rounded-xl focus:outline-none font-medium transition ${
                        isEmailVerified
                          ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold'
                          : 'border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 placeholder-slate-400'
                      }`}
                    />
                    {!isEmailVerified && (
                      <button
                        type="button"
                        onClick={handleSendRegisterOtp}
                        disabled={sendingOtp || !email || otpCountdown > 0}
                        className="absolute right-1 top-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-[10px] font-bold rounded-lg transition shadow-sm cursor-pointer"
                      >
                        {sendingOtp
                          ? 'Sending...'
                          : otpCountdown > 0
                          ? `Wait ${otpCountdown}s`
                          : regOtpSent
                          ? 'Resend'
                          : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact OTP Input Box */}
                {regOtpSent && !isEmailVerified && (
                  <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-950">
                      <span>Enter 6-Digit Email OTP:</span>
                      {otpCountdown > 0 && (
                        <span className="text-[10px] text-blue-700">Resend in {otpCountdown}s</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="flex-1 px-3 py-1.5 text-center font-mono font-bold text-sm tracking-widest text-slate-900 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyRegisterOtp}
                        disabled={verifyingOtp || regOtp.length !== 6}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>

                    <p className="text-[10px] text-blue-800 leading-tight">
                      📬 Code sent. Please also check your <strong>Spam / Junk</strong> folder if not in Inbox.
                    </p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* Role Note for Owner */}
                {targetRole === 'OWNER' && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Owner accounts require Admin verification after registration.</span>
                  </div>
                )}

                {/* Register Submit Button */}
                <div className="pt-1">
                  {!isEmailVerified && (
                    <p className="text-[10px] text-amber-600 font-semibold text-center mb-1 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Verify email via OTP to enable registration.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || !isEmailVerified}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer ${
                      !isEmailVerified
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : currentConfig.buttonBg
                    }`}
                  >
                    {loading
                      ? 'Creating Account...'
                      : targetRole === 'OWNER'
                      ? 'Submit Owner Registration'
                      : '✅ Complete Student Registration'}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-500">Already registered? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      resetState();
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* 3. FORGOT PASSWORD FLOW */}
            {/* ======================================================== */}
            {authMode === 'forgot_password' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Password Recovery</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Back to Sign In</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter registered email"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {!forgotOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={loading || !email}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    {loading ? 'Sending Code...' : 'Send Password Reset Code'}
                  </button>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-800 mb-1 block">
                        Enter 6-Digit Reset Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 text-center font-mono text-sm font-bold text-slate-900 bg-blue-50/40 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 6 characters)"
                          className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !newPassword}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
                    >
                      {loading ? 'Updating Password...' : 'Save Password & Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Compact Modal Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 flex-shrink-0">
            LibSpace Private Study Network &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
