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
  BookOpen,
  Sparkles,
  Shield,
  Zap,
  Check,
  KeyRound,
  RotateCcw,
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

  // Role is locked strictly to defaultRole (no switching tabs inside the modal)
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

  // Countdown interval effect for Resend OTP
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
        setError(err.response?.data?.message);
        toast.error(err.response?.data?.message, { duration: 6000 });
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

  // Config mapping for each role
  const roleConfig = {
    USER: {
      badge: 'STUDENT PORTAL',
      badgeClass: 'bg-blue-400/20 text-blue-100 border border-blue-300/30',
      title: 'Your Dedicated Study Sanctuary',
      subtitle: 'Book silent study desks, reserve guaranteed air-conditioned spaces, and enjoy 5-minute transactional hold protection.',
      gradient: 'from-blue-700 via-indigo-700 to-slate-900',
      accentColor: 'blue',
      glowColor: 'bg-blue-500/20',
      icon: BookOpen,
      iconBg: 'bg-blue-500/30 text-blue-200 border border-blue-400/30',
      features: [
        { title: 'Instant Desk Booking', desc: 'Reserve guaranteed quiet study desks by the hour or full day' },
        { title: '5-Min Hold Engine', desc: 'Protected checkout timer so you never lose your selected seat' },
        { title: 'Pincode Verified', desc: 'Fast neighborhood search across 6 major regions' },
        { title: 'Digital QR Passes', desc: 'Contactless instant check-in at any partner library' },
      ],
      trustText: 'Verified Students & Aspirants',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    OWNER: {
      badge: 'PARTNER ECOSYSTEM',
      badgeClass: 'bg-amber-400/20 text-amber-100 border border-amber-300/30',
      title: 'Grow & Monetize Your Study Spaces',
      subtitle: 'List up to 5 library branches, manage hourly rates, track live occupancy on visual seat maps, and protect each branch with a 6-digit master PIN.',
      gradient: 'from-amber-600 via-orange-600 to-slate-950',
      accentColor: 'amber',
      glowColor: 'bg-amber-500/20',
      icon: Building2,
      iconBg: 'bg-amber-500/30 text-amber-200 border border-amber-400/30',
      features: [
        { title: 'Up to 5 Branches', desc: 'Add and manage multiple library spaces under one master account' },
        { title: '6-Digit PIN Security', desc: 'Independent PIN lock per library with OTP email reset recovery' },
        { title: 'Visual Seat Map', desc: 'Configure interactive desk grids & dynamic hourly rates' },
        { title: 'Branch Analytics', desc: 'Real-time revenue, occupancy rates & booking breakdown' },
      ],
      trustText: 'Verified Library Partners',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    ADMIN: {
      badge: 'PLATFORM GOVERNANCE',
      badgeClass: 'bg-purple-400/20 text-purple-100 border border-purple-300/30',
      title: 'Platform Administration & Oversight',
      subtitle: 'Centralized state-wise management, sub-admin delegation, owner verification pipelines, and platform-wide revenue audits.',
      gradient: 'from-purple-800 via-indigo-900 to-slate-950',
      accentColor: 'purple',
      glowColor: 'bg-purple-500/20',
      icon: ShieldCheck,
      iconBg: 'bg-purple-500/30 text-purple-200 border border-purple-400/30',
      features: [
        { title: 'State-Wise Delegation', desc: 'Assign sub-admins to supervise specific states & territories' },
        { title: 'Library Verification', desc: 'Review, approve, or escalate new library listing requests' },
        { title: 'Account Governance', desc: 'Full user & owner management with audit trails & status control' },
        { title: 'Revenue Auditing', desc: 'Track platform-wide revenue and state-wise performance' },
      ],
      trustText: 'Enterprise Admin Security',
      buttonBg: 'bg-purple-700 hover:bg-purple-800 text-white',
    },
  };

  const currentConfig = roleConfig[targetRole] || roleConfig.USER;
  const PortalIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn text-slate-900">
      {/* Wide 2-Column Responsive Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto grid grid-cols-1 md:grid-cols-12 max-h-[92vh]">

        {/* ======================================================== */}
        {/* LEFT COLUMN: BRANDING, ROLE INFO & VALUE PROPOSITION */}
        {/* ======================================================== */}
        <div
          className={`md:col-span-5 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden bg-gradient-to-br ${currentConfig.gradient}`}
        >
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-black/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top: Logo & Role Badge */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-inner font-black text-sm tracking-tight">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-black tracking-tight text-white block leading-none">
                    Lib<span className="text-amber-300">Space</span>
                  </span>
                  <span className="text-[10px] text-white/70 font-semibold tracking-wider uppercase block mt-0.5">
                    Private Study Network
                  </span>
                </div>
              </div>

              <span
                className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md ${currentConfig.badgeClass}`}
              >
                {currentConfig.badge}
              </span>
            </div>

            {/* Portal Title & Headline */}
            <div className="pt-2">
              <div className="inline-flex p-2.5 rounded-2xl mb-3 shadow-inner bg-white/15 border border-white/20">
                <PortalIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {currentConfig.title}
              </h2>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                {currentConfig.subtitle}
              </p>
            </div>

            {/* Role Features List (Hidden on very tiny mobile, visible sm+) */}
            <div className="hidden sm:flex flex-col gap-2.5 pt-3">
              {currentConfig.features.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-white/10 hover:bg-white/15 p-2.5 rounded-xl border border-white/15 backdrop-blur-sm transition"
                >
                  <div className="w-5 h-5 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-400/30">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Security / Trust Notice */}
          <div className="relative z-10 pt-4 mt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/75">
            <div className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span className="text-[10px] text-white/60 font-semibold">
              {currentConfig.trustText}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: AUTHENTICATION FORMS & ACTIONS */}
        {/* ======================================================== */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white overflow-y-auto max-h-[92vh]">
          {/* Header Bar */}
          <div className="p-6 sm:p-7 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {targetRole === 'USER'
                    ? 'Student Access'
                    : targetRole === 'OWNER'
                    ? 'Library Partner Access'
                    : 'System Administrator'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {authMode === 'login'
                  ? `Sign In to ${targetRole === 'USER' ? 'LibSpace' : targetRole === 'OWNER' ? 'Partner Portal' : 'Admin Console'}`
                  : authMode === 'register'
                  ? `Create ${targetRole === 'USER' ? 'Student' : 'Owner'} Account`
                  : 'Reset Account Password'}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Pills (Sign In vs Register - Hidden for Admin) */}
          {targetRole !== 'ADMIN' && authMode !== 'forgot_password' && (
            <div className="px-6 sm:px-7 pt-4">
              <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    resetState();
                  }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200/60'
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
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200/60'
                      : 'hover:text-slate-900 text-slate-500'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Fixed Mode Indicator */}
          {targetRole === 'ADMIN' && (
            <div className="px-6 sm:px-7 pt-4">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>
                  Admin authentication is strictly secured. Sub-admins must use credentials issued by Master Admin.
                </span>
              </div>
            </div>
          )}

          {/* Form Area with Scrolling */}
          <div className="p-6 sm:p-7 space-y-4 flex-1">

            {/* 1. Owner Registration Submitted Success Screen */}
            {registrationCompleteNotice && (
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl text-center space-y-3 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <h3 className="text-base font-black text-amber-900 tracking-tight">
                  Owner Registration Submitted!
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed max-w-sm mx-auto">
                  Your Library Owner account has been created and securely forwarded to the <strong>Platform Administrator</strong> for approval.
                </p>
                <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-700 font-medium">
                  🛡️ You will be able to log in to your Owner Dashboard as soon as the Admin approves your request.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationCompleteNotice(false);
                    setAuthMode('login');
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* 2. Owner Pending Notice (When unapproved owner tries to log in) */}
            {ownerPendingNotice && !registrationCompleteNotice && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Account Awaiting Admin Approval</span>
                </div>
                <p className="text-xs leading-relaxed">
                  As an enterprise security policy, all Library Owner accounts require Platform Admin approval before dashboard access is granted.
                </p>
                <div className="pt-1 text-[11px] text-amber-700 font-medium">
                  Please wait for the administrator to review and activate your account.
                </div>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && !registrationCompleteNotice && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Notification */}
            {error && !registrationCompleteNotice && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* 1. SIGN IN FORM */}
            {/* ======================================================== */}
            {authMode === 'login' && !registrationCompleteNotice && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
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
                      className="w-full pl-10 pr-3.5 py-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        resetState();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${currentConfig.buttonBg}`}
                  >
                    {loading ? (
                      'Authenticating...'
                    ) : (
                      <>
                        <span>Sign In as {targetRole === 'USER' ? 'Student' : targetRole === 'OWNER' ? 'Library Owner' : 'Administrator'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {targetRole !== 'ADMIN' && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">Don't have an account yet? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        resetState();
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Create one now
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ======================================================== */}
            {/* 2. REGISTER NEW ACCOUNT (With Email OTP + Green Tick) */}
            {/* ======================================================== */}
            {authMode === 'register' && !registrationCompleteNotice && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* Email Address with OTP Verification & Green Tick */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Email Address
                    </label>
                    {isEmailVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Email Verified ✅
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3.5 top-3.5 pointer-events-none ${
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
                      className={`w-full pl-10 pr-24 py-2.5 text-xs rounded-2xl focus:outline-none font-medium transition ${
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
                        className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-[10px] font-bold rounded-xl transition shadow-sm cursor-pointer"
                      >
                        {sendingOtp
                          ? 'Sending...'
                          : otpCountdown > 0
                          ? `Resend (${otpCountdown}s)`
                          : regOtpSent
                          ? 'Resend OTP'
                          : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {/* OTP Input Box (Shows when OTP has been sent and email not yet verified) */}
                {regOtpSent && !isEmailVerified && (
                  <div className="p-3.5 bg-blue-50/95 border border-blue-200 rounded-2xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-blue-950">
                        Enter 6-Digit OTP received in Email:
                      </label>
                      {otpCountdown > 0 && (
                        <span className="text-[10px] text-blue-700 font-bold">
                          Resend in {otpCountdown}s
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="flex-1 px-3 py-2 text-center font-mono font-bold text-base tracking-widest text-slate-900 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyRegisterOtp}
                        disabled={verifyingOtp || regOtp.length !== 6}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>

                    <div className="p-2.5 bg-white/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-snug space-y-1">
                      <div className="font-bold flex items-center gap-1 text-blue-800">
                        📬 Email Inbox / Spam Folder:
                      </div>
                      <p>
                        A 6-digit verification code has been sent. If not visible in your Primary Inbox, please also check your <strong>Spam / Junk</strong> folder.
                      </p>
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Set Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* Role Explanatory Info Card */}
                {targetRole === 'OWNER' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <Building2 className="w-3.5 h-3.5" /> Notice for Library Owners:
                    </span>
                    <p>
                      After registration, your account is submitted for Admin verification. You will be approved before accessing your owner dashboard.
                    </p>
                  </div>
                )}

                {/* Registration Submit Button (Only active when Green Tick Verified) */}
                <div className="pt-2">
                  {!isEmailVerified && (
                    <p className="text-[11px] text-amber-600 font-semibold text-center mb-2 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Please verify your email via OTP to enable registration.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || !isEmailVerified}
                    className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                      !isEmailVerified
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : currentConfig.buttonBg
                    }`}
                  >
                    {loading
                      ? 'Creating Account...'
                      : targetRole === 'OWNER'
                      ? 'Submit Owner Registration (Sends to Admin)'
                      : '✅ Complete Student Registration (Instant Access)'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Already registered? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      resetState();
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Sign In instead
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* 3. FORGOT PASSWORD FLOW */}
            {/* ======================================================== */}
            {authMode === 'forgot_password' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Password Recovery</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Back to Sign In</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered account email"
                      className="w-full pl-10 pr-3.5 py-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium transition"
                    />
                  </div>
                </div>

                {!forgotOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={loading || !email}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    {loading ? 'Sending Code...' : 'Send Password Reset Code'}
                  </button>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                        Enter 6-Digit Reset Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="e.g. 123456"
                        className="w-full px-3.5 py-3 text-center font-mono text-base font-bold text-slate-900 bg-blue-50/40 border border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Set New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full pl-10 pr-3.5 py-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !newPassword}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
                    >
                      {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Note */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
            LibSpace Private Study Network &copy; {new Date().getFullYear()} • Safe & Secure
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
