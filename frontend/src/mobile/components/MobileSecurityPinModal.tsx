import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { Lock, X, KeyRound, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

interface MobileSecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'VERIFY' | 'SETUP' | 'FORGOT_OTP';
  targetLibraryName?: string;
  onSuccess: () => void;
}

export const MobileSecurityPinModal: React.FC<MobileSecurityPinModalProps> = ({
  isOpen,
  onClose,
  mode = 'VERIFY',
  targetLibraryName,
  onSuccess,
}) => {
  const [currentMode, setCurrentMode] = useState<'VERIFY' | 'SETUP' | 'FORGOT_OTP'>(mode);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      toast.error('Please enter complete 6-digit PIN.');
      return;
    }

    setLoading(true);
    try {
      if (currentMode === 'VERIFY') {
        const res = await api.post('/owner/security-pin/verify', { pin });
        if (res.data.success) {
          toast.success('PIN Verified! Workspace Unlocked 🔓');
          onSuccess();
          onClose();
        } else {
          toast.error(res.data.message || 'Incorrect PIN.');
          setPin('');
        }
      } else if (currentMode === 'SETUP') {
        if (!confirmPin) {
          setConfirmPin(pin);
          setPin('');
          toast('Please re-enter PIN to confirm.');
          setLoading(false);
          return;
        }

        if (pin !== confirmPin) {
          toast.error('PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          setLoading(false);
          return;
        }

        const res = await api.post('/owner/security-pin/setup', { pin });
        if (res.data.success) {
          toast.success('6-Digit Security PIN configured successfully! ✅');
          onSuccess();
          onClose();
        } else {
          toast.error(res.data.message || 'Setup failed.');
        }
      } else if (currentMode === 'FORGOT_OTP') {
        const res = await api.post('/owner/security-pin/reset', {
          otp,
          newPin: pin,
        });
        if (res.data.success) {
          toast.success('Security PIN reset successfully! 🔐');
          onSuccess();
          onClose();
        } else {
          toast.error(res.data.message || 'Reset failed.');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Security PIN action failed.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post('/owner/security-pin/forgot');
      if (res.data.success) {
        toast.success('Reset OTP dispatched to your registered email! 📨');
        setCurrentMode('FORGOT_OTP');
      } else {
        toast.error(res.data.message || 'Failed to dispatch reset code.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col items-center space-y-4">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-base font-extrabold text-white">
            {currentMode === 'VERIFY'
              ? 'Unlock Branch Workspace'
              : currentMode === 'SETUP'
              ? confirmPin
                ? 'Confirm Security PIN'
                : 'Create 6-Digit Master PIN'
              : 'Reset Security PIN'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {targetLibraryName ? `Securing ${targetLibraryName}` : 'Enter your 6-digit owner passkey'}
          </p>
        </div>

        {/* FORGOT_OTP email code input */}
        {currentMode === 'FORGOT_OTP' && (
          <div className="w-full space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Enter 6-Digit Email Reset OTP
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* 6 Dots Indicator */}
        <div className="flex gap-3 my-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > index
                  ? 'bg-amber-400 scale-110 shadow-md shadow-amber-500/50'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Big Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-lg active:scale-95 transition shadow-sm"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-lg active:scale-95 transition shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs active:scale-95 transition"
          >
            ⌫
          </button>
        </div>

        {/* Submit & Recovery Links */}
        <div className="w-full space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || pin.length !== 6}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40 transition active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Verifying PIN...</span>
            ) : (
              <>
                <span>{currentMode === 'VERIFY' ? 'Unlock Workspace' : 'Submit PIN'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {currentMode === 'VERIFY' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleSendResetOtp}
                className="text-amber-400 hover:underline"
              >
                Forgot PIN?
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSecurityPinModal;
