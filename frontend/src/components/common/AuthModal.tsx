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

  // General Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ownerPendingNotice, setOwnerPendingNotice] = useState<boolean>(false);
  const [registrationCompleteNotice, setRegistrationCompleteNotice] = useState<boolean>(false);

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
      // Pass targetRole to ensure user can only log in under their registered role
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
        setSuccessMessage('Email verified successfully! (Green Tick)');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn text-slate-900">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 transition-all text-slate-900">
        {/* Header with Role Themes */}
        <div
          className={`p-6 text-white text-center relative ${
            targetRole === 'OWNER'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600'
              : targetRole === 'ADMIN'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-800'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-2 shadow-inner">
            {targetRole === 'OWNER' ? (
              <Building2 className="w-6 h-6 text-yellow-200" />
            ) : targetRole === 'ADMIN' ? (
              <ShieldCheck className="w-6 h-6 text-purple-200" />
            ) : (
              <UserIcon className="w-6 h-6 text-blue-100" />
            )}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {targetRole === 'OWNER'
              ? 'Library Owner Portal'
              : targetRole === 'ADMIN'
              ? 'Platform Administration'
              : 'Student / Aspirant Portal'}
          </h2>
          <p className="text-xs text-white/80 mt-0.5">
            {targetRole === 'OWNER'
              ? 'Manage study halls, seats, hourly pricing & view revenue'
              : targetRole === 'ADMIN'
              ? 'Verify owners, approve libraries & oversee platform'
              : 'Book silent study seats with 5-minute hold protection'}
          </p>
        </div>

        {/* 1. Target Role Tabs */}
        <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200 text-xs font-bold text-slate-700">
          <button
            type="button"
            onClick={() => {
              setTargetRole('USER');
              resetState();
            }}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              targetRole === 'USER'
                ? 'bg-white text-blue-600 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetRole('OWNER');
              resetState();
            }}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              targetRole === 'OWNER'
                ? 'bg-white text-amber-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 Library Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetRole('ADMIN');
              setAuthMode('login');
              resetState();
            }}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              targetRole === 'ADMIN'
                ? 'bg-white text-purple-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛡️ Admin
          </button>
        </div>

        {/* 2. Mode Selector: Sign In vs Register */}
        <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              resetState();
            }}
            className={`flex-1 py-2.5 border-b-2 transition ${
              authMode === 'login'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                : 'border-transparent hover:bg-slate-50'
            }`}
          >
            Sign In ({targetRole === 'USER' ? 'Student' : targetRole === 'OWNER' ? 'Owner' : 'Admin'})
          </button>
          {targetRole !== 'ADMIN' && (
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                resetState();
              }}
              className={`flex-1 py-2.5 border-b-2 transition ${
                authMode === 'register'
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              Register ({targetRole === 'USER' ? 'Student' : 'Owner'})
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-slate-900">

          {/* Owner Registration Submitted Success Screen */}
          {registrationCompleteNotice && (
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-center space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-amber-900">
                Owner Registration Submitted!
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Your Library Owner account has been created and sent to the <strong>Platform Administrator</strong> for approval.
              </p>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-700">
                🛡️ You will be able to log in to your Owner Dashboard as soon as the Admin approves your request.
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegistrationCompleteNotice(false);
                  setAuthMode('login');
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* Owner Approval Notice (When unapproved owner tries to log in) */}
          {ownerPendingNotice && !registrationCompleteNotice && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Account Awaiting Admin Approval</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                As a security policy, all Library Owner accounts require Platform Admin approval before dashboard access is granted.
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

          {/* FORM: 1. Sign In */}
          {authMode === 'login' && !registrationCompleteNotice && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      targetRole === 'ADMIN'
                        ? 'admin@example.com'
                        : targetRole === 'OWNER'
                        ? 'owner@studyhub.com'
                        : 'student@example.com'
                    }
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium"
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
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 mt-2 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  targetRole === 'OWNER'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : targetRole === 'ADMIN'
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading
                  ? 'Signing In...'
                  : `Sign In as ${targetRole === 'USER' ? 'Student' : targetRole === 'OWNER' ? 'Owner' : 'Admin'}`}
              </button>
            </form>
          )}

          {/* FORM: 2. Register New Account (With Email OTP + Green Tick) */}
          {authMode === 'register' && !registrationCompleteNotice && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Email Address with OTP Verification & Green Tick */}
              <div>
                <div className="flex items-center justify-between mb-1">
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
                    className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${
                      isEmailVerified ? 'text-emerald-500' : 'text-slate-500'
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
                    className={`w-full pl-9 pr-24 py-2.5 text-xs rounded-xl focus:outline-none font-medium ${
                      isEmailVerified
                        ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold'
                        : 'border border-slate-300 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 placeholder-slate-400'
                    }`}
                  />
                  {!isEmailVerified && (
                    <button
                      type="button"
                      onClick={handleSendRegisterOtp}
                      disabled={sendingOtp || !email || otpCountdown > 0}
                      className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-[10px] font-bold rounded-lg transition shadow-sm"
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
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-snug space-y-1">
                    <div className="font-bold flex items-center gap-1 text-blue-800">
                      📬 Email Inbox / Spam Folder:
                    </div>
                    <p>
                      A 6-digit verification code has been sent to your email. If not visible in your Primary Inbox, please also check your <strong>Spam / Junk</strong> folder.
                    </p>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Set Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Role Explanatory Info Card */}
              {targetRole === 'OWNER' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-amber-800">
                    <Building2 className="w-3.5 h-3.5" /> Notice for Library Owners:
                  </span>
                  <p>
                    After registration, your account is submitted for Admin verification. You will be approved before accessing your owner dashboard.
                  </p>
                </div>
              )}

              {targetRole === 'ADMIN' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-purple-800">
                    <ShieldCheck className="w-3.5 h-3.5" /> Platform Admin Registration:
                  </span>
                  <p>
                    Admin accounts gain platform-wide moderation, owner verification, and revenue management access.
                  </p>
                </div>
              )}

              {/* Registration Submit Button (Only active when Green Tick Verified) */}
              <div className="pt-2">
                {!isEmailVerified && (
                  <p className="text-[11px] text-amber-600 font-semibold text-center mb-1.5 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please verify your email via OTP to enable registration.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !isEmailVerified}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                    !isEmailVerified
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : targetRole === 'OWNER'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : targetRole === 'ADMIN'
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {loading
                    ? 'Creating Account...'
                    : targetRole === 'OWNER'
                    ? 'Submit Owner Registration (Sends to Admin)'
                    : targetRole === 'ADMIN'
                    ? 'Register Platform Admin'
                    : '✅ Complete Student Registration (Instant Access)'}
                </button>
              </div>
            </form>
          )}

          {/* FORM: 3. Forgot Password Flow */}
          {authMode === 'forgot_password' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Password Recovery</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered account email"
                  className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 font-medium"
                />
              </div>

              {!forgotOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendForgotOtp}
                  disabled={loading || !email}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition"
                >
                  {loading ? 'Sending Code...' : 'Send Password Reset Code'}
                </button>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 mb-1 block">
                      Enter 6-Digit Reset Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2.5 text-center font-mono text-base font-bold text-slate-900 bg-blue-50/40 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Set New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
