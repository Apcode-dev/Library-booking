import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MobileAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'USER',
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, sendRegisterOtp, verifyRegisterOtp, forgotPassword, resetPassword } =
    useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP states for registration
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Reset password states
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setMode(initialMode);
    }
  }, [isOpen, initialRole, initialMode]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await sendRegisterOtp(email.trim().toLowerCase(), name.trim());
      if (res.success) {
        setOtpSent(true);
        toast.success(res.message || 'Verification OTP sent to your email!');
      } else {
        toast.error(res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error connecting to email service.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Please enter the 6-digit code received.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await verifyRegisterOtp(email.trim().toLowerCase(), otp.trim());
      if (res.success && res.verified) {
        setIsEmailVerified(true);
        toast.success('Email verified successfully! ✅');
      } else {
        toast.error(res.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email.trim().toLowerCase(), password, role);
        if (res.success) {
          toast.success(`Welcome back, ${res.user.name}!`);
          onClose();
          onSuccess?.();
        } else {
          toast.error(res.message || 'Login failed.');
        }
      } else if (mode === 'register') {
        if (!isEmailVerified) {
          toast.error('Please verify your email address using the OTP first.');
          setLoading(false);
          return;
        }

        const res = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
          role,
        });

        if (res.success) {
          if (role === 'OWNER') {
            toast.success(
              'Owner account registered! Admin will review and verify your account.',
              { duration: 5000 }
            );
          } else {
            toast.success('Account created successfully! 🎉');
          }
          onClose();
          onSuccess?.();
        } else {
          toast.error(res.message || 'Registration failed.');
        }
      } else if (mode === 'forgot') {
        const res = await forgotPassword(email.trim().toLowerCase());
        if (res.success) {
          toast.success('Password reset code sent to your email.');
          setMode('reset');
        } else {
          toast.error(res.message || 'Could not send reset OTP.');
        }
      } else if (mode === 'reset') {
        const res = await resetPassword(email.trim().toLowerCase(), resetOtp, newPassword);
        if (res.success) {
          toast.success('Password reset successfully! Please log in.');
          setMode('login');
        } else {
          toast.error(res.message || 'Failed to reset password.');
        }
      }
    } catch (err: any) {
      if (err.response?.data?.roleMismatch) {
        const mismatchMsg = err.response?.data?.message || 'Role Mismatch';
        toast.error(mismatchMsg, { duration: 5000 });
        if (mismatchMsg.includes('ADMIN')) setRole('ADMIN');
        else if (mismatchMsg.includes('OWNER')) setRole('OWNER');
        else if (mismatchMsg.includes('USER')) setRole('USER');
      } else {
        toast.error(err.response?.data?.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Drag handle for mobile feel */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden"></div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/libspace-logo.png"
              alt="LibSpace"
              className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-1 border border-slate-800"
            />
            <div>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'login'
                  ? 'Sign in to LibSpace'
                  : mode === 'register'
                  ? 'Create LibSpace Account'
                  : mode === 'forgot'
                  ? 'Forgot Password'
                  : 'Reset Password'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'login'
                  ? 'Access your desks, passes & bookings'
                  : mode === 'register'
                  ? 'Join India’s library study network'
                  : 'Verify email to recover your account'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs (Only on login or register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="px-5 pt-3">
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setRole('USER')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                  role === 'USER'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('OWNER')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                  role === 'OWNER'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Owner</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                  role === 'ADMIN'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Name field (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              {isEmailVerified && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Verified
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                disabled={isEmailVerified && mode === 'register'}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-24 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-60"
              />

              {/* Send OTP button on Register mode */}
              {mode === 'register' && !isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !email.includes('@')}
                  className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition shadow"
                >
                  {otpLoading ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                </button>
              )}
            </div>
          </div>

          {/* OTP Verification Input on Register mode */}
          {mode === 'register' && otpSent && !isEmailVerified && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-blue-500/30 space-y-2">
              <label className="block text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                Enter 6-Digit Email Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otp.length < 6}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                >
                  {otpLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Check your inbox (or spam) for the Brevo OTP code.
              </p>
            </div>
          )}

          {/* Phone field (optional, register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Reset password specific fields */}
          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Single device security alert */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Single-Device Session:</strong> LibSpace enforces active single-device
              security. Logging in on a new device gracefully expires previous sessions.
            </span>
          </div>

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${
              role === 'OWNER'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400'
                : role === 'ADMIN'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Processing...</span>
              </span>
            ) : (
              <>
                <span>
                  {mode === 'login'
                    ? `Sign in as ${role === 'USER' ? 'Student' : role === 'OWNER' ? 'Owner' : 'Admin'}`
                    : mode === 'register'
                    ? `Register as ${role === 'USER' ? 'Student' : 'Library Owner'}`
                    : mode === 'forgot'
                    ? 'Send Reset Code'
                    : 'Update Password'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Mode Switcher */}
          <div className="text-center pt-1 text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-blue-400 font-bold hover:underline"
                >
                  Create Account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-400 font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-400 font-bold hover:underline"
              >
                Back to Sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobileAuthModal;
