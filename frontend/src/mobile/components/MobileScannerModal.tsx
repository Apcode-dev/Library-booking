import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Search,
  User,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLibraryId?: string | null;
  onCheckInSuccess?: () => void;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({
  isOpen,
  onClose,
  selectedLibraryId,
  onCheckInSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [verifiedBooking, setVerifiedBooking] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    try {
      setCameraError(null);
      const scannerId = 'mobile-qr-reader-container';
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }
      const qrScanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          handleVerifyCode(decodedText.trim());
        },
        () => {}
      );
    } catch (err: any) {
      setCameraError(
        'Camera access not available. Please allow camera permissions in App Settings or enter the pass code manually below.'
      );
    }
  };

  const handleRetryCamera = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
    } catch (_) {}
    startScanner();
  };

  useEffect(() => {
    if (!isOpen) {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      setVerifiedBooking(null);
      setCameraError(null);
      return;
    }

    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyCode = async (code: string) => {
    if (!code) return;
    setVerifying(true);
    try {
      const res = await api.post('/owner/verify-qr', {
        bookingCode: code,
        libraryId: selectedLibraryId || undefined,
      });

      if (res.data.success) {
        setVerifiedBooking(res.data.booking);
        toast.success('Valid Pass Detected! ✅');
      } else {
        toast.error(res.data.message || 'Pass verification failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired QR pass.');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!verifiedBooking) return;
    setCheckingIn(true);
    try {
      const res = await api.post('/owner/check-in', {
        bookingId: verifiedBooking.id,
      });

      if (res.data.success) {
        toast.success('Gate Check-in Confirmed & Attendance Punched! 🎟️');
        onCheckInSuccess?.();
        onClose();
      } else {
        toast.error(res.data.message || 'Check-in failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in error.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">Live Gate Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Camera Viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-square max-w-[280px] mx-auto shadow-inner flex items-center justify-center">
            <div id="mobile-qr-reader-container" className="w-full h-full"></div>

            {cameraError && (
              <div className="absolute inset-0 p-4 bg-slate-950/95 flex flex-col items-center justify-center text-center space-y-2.5 z-10">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-300 leading-tight">{cameraError}</p>
                <button
                  type="button"
                  onClick={handleRetryCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold active:scale-95 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  Enable / Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Manual Code Fallback */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Or Enter Booking Pass Code Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. LIB-2026-X89"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 uppercase focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleVerifyCode(manualCode.trim())}
                disabled={verifying || !manualCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {verifying ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Verify</span>
              </button>
            </div>
          </div>

          {/* Verified Student Pass Card */}
          {verifiedBooking && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/50 space-y-3 animate-slide-up shadow-xl shadow-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">
                      {verifiedBooking.user?.name || 'Verified Student'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {verifiedBooking.bookingCode}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                  Desk {verifiedBooking.seat?.seatNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-slate-500 block text-[9px]">Pass Plan:</span>
                  <span className="font-bold capitalize">{verifiedBooking.bookingType} Pass</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Attendance Today:</span>
                  <span className="font-bold text-emerald-400">Not Scanned Yet</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={checkingIn}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {checkingIn ? (
                  <span>Recording Gate Punch...</span>
                ) : (
                  <>
                    <span>Confirm Student Check-In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileScannerModal;
