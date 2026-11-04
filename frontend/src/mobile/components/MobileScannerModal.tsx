import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';
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
  RotateCcw,
  Phone,
  Mail,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLibraryId?: string | null;
  onCheckInSuccess?: () => void;
}

type ScanMode = 'CAMERA' | 'DETAILS' | 'INVALID';

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({
  isOpen,
  onClose,
  selectedLibraryId,
  onCheckInSuccess,
}) => {
  const [scanMode, setScanMode] = useState<ScanMode>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [verifiedBooking, setVerifiedBooking] = useState<any>(null);
  const [verificationMeta, setVerificationMeta] = useState<any>(null);
  const [invalidMessage, setInvalidMessage] = useState<string>('');
  const [scannedCodeRaw, setScannedCodeRaw] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Stop camera tracks cleanly
  const stopCameraStream = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop().catch(() => {});
        }
        await html5QrCodeRef.current.clear().catch(() => {});
      }
    } catch (_) {
    } finally {
      html5QrCodeRef.current = null;
    }
  };

  const startScanner = async () => {
    try {
      setCameraError(null);
      isProcessingRef.current = false;
      const scannerId = 'mobile-qr-reader-container';

      await stopCameraStream();

      // Ensure container DOM exists
      const container = document.getElementById(scannerId);
      if (!container) return;

      const qrScanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
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

  const handleSafeClose = async () => {
    await stopCameraStream();
    setVerifiedBooking(null);
    setVerificationMeta(null);
    setInvalidMessage('');
    setScannedCodeRaw('');
    setCheckInDone(false);
    setCameraError(null);
    setScanMode('CAMERA');
    isProcessingRef.current = false;
    onClose();
  };

  // Restart scanner for scanning next pass
  const handleRestartScanner = async () => {
    setVerifiedBooking(null);
    setVerificationMeta(null);
    setInvalidMessage('');
    setScannedCodeRaw('');
    setCheckInDone(false);
    setManualCode('');
    setScanMode('CAMERA');
    isProcessingRef.current = false;
    setTimeout(startScanner, 250);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setVerifiedBooking(null);
      setVerificationMeta(null);
      setInvalidMessage('');
      setScannedCodeRaw('');
      setCheckInDone(false);
      setCameraError(null);
      setScanMode('CAMERA');
      isProcessingRef.current = false;
      return;
    }

    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      stopCameraStream();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Process and verify pass code (from QR or manual entry)
  const handleVerifyCode = async (code: string) => {
    if (!code) {
      isProcessingRef.current = false;
      return;
    }

    setScannedCodeRaw(code);
    setVerifying(true);

    // 1. Instantly turn off camera scanner so it stops scanning and frees the screen
    await stopCameraStream();

    try {
      const res = await api.post('/owner/verify-qr', {
        bookingCode: code,
        libraryId: selectedLibraryId || undefined,
      });

      if (res.data.success && res.data.booking) {
        if (res.data.valid === false || res.data.isExpired) {
          // Pass expired
          try { navigator.vibrate?.([200, 100, 200]); } catch (_) {}
          setInvalidMessage(`Pass Expired: Valid until ${res.data.booking?.validUntil ? new Date(res.data.booking.validUntil).toLocaleDateString() : 'earlier date'}.`);
          setScanMode('INVALID');
          toast.error('Pass is expired or invalid.');
        } else {
          // Valid Pass!
          try { navigator.vibrate?.(100); } catch (_) {}
          setVerifiedBooking(res.data.booking);
          setVerificationMeta(res.data);
          setCheckInDone(false);
          setScanMode('DETAILS');
          toast.success('Valid Pass Verified! ✅');
        }
      } else {
        try { navigator.vibrate?.([200, 100, 200]); } catch (_) {}
        setInvalidMessage(res.data?.message || 'Pass Not Valid: No matching booking record found.');
        setScanMode('INVALID');
        toast.error('Pass Not Valid.');
      }
    } catch (err: any) {
      try { navigator.vibrate?.([200, 100, 200]); } catch (_) {}
      const errMsg = err.response?.data?.message || 'Pass Not Valid: Invalid or unrecognized QR code.';
      setInvalidMessage(errMsg);
      setScanMode('INVALID');
      toast.error(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  // Punch attendance / Gate check-in
  const handleConfirmCheckIn = async () => {
    if (!verifiedBooking) return;
    setCheckingIn(true);
    try {
      const res = await api.post('/owner/check-in', {
        bookingId: verifiedBooking.id,
        bookingCode: verifiedBooking.bookingCode,
      });

      if (res.data.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (_) {}

        toast.success(res.data.message || 'Gate Check-in Confirmed & Attendance Punched! 🎟️');
        setCheckInDone(true);
        setVerificationMeta((prev: any) => ({
          ...prev,
          alreadyMarkedToday: true,
          todayAttendance: res.data.attendance || { checkInTime: new Date().toISOString() },
        }));
        onCheckInSuccess?.();
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
            <h3 className="text-sm font-extrabold text-white">Security Desk Attendance Scanner</h3>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* ================================================================= */}
          {/* STATE 1: CAMERA ACTIVE SCANNER                                    */}
          {/* ================================================================= */}
          {scanMode === 'CAMERA' && (
            <div className="space-y-4 animate-fade-in">
              {/* Camera Viewfinder */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-square max-w-[280px] mx-auto shadow-inner flex items-center justify-center">
                <div id="mobile-qr-reader-container" className="w-full h-full"></div>

                {verifying && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-20 space-y-2">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-white">Verifying Pass Details...</p>
                    <span className="text-[10px] text-slate-400">Stopping camera & fetching student record</span>
                  </div>
                )}

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

              <p className="text-center text-[11px] text-slate-400">
                Point camera at student's digital pass QR code. It will automatically scan and stop the camera.
              </p>

              {/* Manual Code Fallback */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or Enter Booking Pass Code Manually
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. LIB-221375-19"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyCode(manualCode.trim())}
                    disabled={verifying || !manualCode.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
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
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 2: VERIFIED STUDENT DETAILS & ATTENDANCE ACTION             */}
          {/* ================================================================= */}
          {scanMode === 'DETAILS' && verifiedBooking && (
            <div className="space-y-4 animate-slide-up">
              {/* Top Banner */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                      Pass Verified & Valid
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                      Camera OFF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Ready for Gate Entry & Attendance
                  </p>
                </div>
              </div>

              {/* Student Profile Card */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-950/40">
                      {(verifiedBooking.student?.name || verifiedBooking.user?.name || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white leading-tight">
                        {verifiedBooking.student?.name || verifiedBooking.user?.name || 'Registered Student'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        {verifiedBooking.student?.phone && (
                          <span className="flex items-center gap-0.5 font-mono">
                            <Phone className="w-2.5 h-2.5 text-slate-500" />
                            {verifiedBooking.student.phone}
                          </span>
                        )}
                        {verifiedBooking.student?.email && (
                          <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                            <Mail className="w-2.5 h-2.5 text-slate-500" />
                            {verifiedBooking.student.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-3 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-black text-xs inline-block">
                      Desk {verifiedBooking.seatNumber || verifiedBooking.seat?.seatNumber || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Booking & Timing Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Pass Plan</span>
                    <span className="font-bold text-white capitalize">
                      {verifiedBooking.bookingType || 'Hourly'} Pass
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Pass Code</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {verifiedBooking.bookingCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Valid Slot / Date</span>
                    <span className="font-medium text-slate-300">
                      {verifiedBooking.startTime && verifiedBooking.endTime
                        ? `${verifiedBooking.startTime} - ${verifiedBooking.endTime}`
                        : verifiedBooking.date || 'Today'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Library Branch</span>
                    <span className="font-medium text-slate-300 truncate block">
                      {verifiedBooking.libraryName || 'LibSpace'}
                    </span>
                  </div>
                </div>

                {/* Today's Attendance Status Indicator */}
                <div className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between transition-all bg-slate-900/80 border-slate-800">
                  <div className="flex items-center gap-2">
                    {verificationMeta?.alreadyMarkedToday || checkInDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold block text-white text-[11px]">
                        {verificationMeta?.alreadyMarkedToday || checkInDone
                          ? 'Attendance Marked for Today ✅'
                          : 'Attendance Not Marked Yet ⏳'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {verificationMeta?.alreadyMarkedToday || checkInDone
                          ? `Recorded at ${verificationMeta?.todayAttendance?.checkInTime ? new Date(verificationMeta.todayAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Gate Scanner'}`
                          : 'Student is at the security gate for entry'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {verificationMeta?.totalAttendances ?? 1} total logs
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {!(verificationMeta?.alreadyMarkedToday || checkInDone) ? (
                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={checkingIn}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {checkingIn ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Recording Attendance Punch...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Punch Attendance / Confirm Check-In</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                    <p className="text-xs font-extrabold text-emerald-300">
                      ✅ Check-In Completed Successfully!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleRestartScanner}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scan Next Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    className="py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 3: INVALID PASS NOTIFICATION POPUP CARD                     */}
          {/* ================================================================= */}
          {scanMode === 'INVALID' && (
            <div className="p-6 bg-slate-950 rounded-2xl border border-red-500/40 space-y-4 text-center animate-slide-up shadow-2xl shadow-red-950/20">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-white">Pass Not Valid ❌</h4>
                <p className="text-xs text-red-300 font-medium leading-relaxed">
                  {invalidMessage || 'No active or matching booking record found for this QR code.'}
                </p>
              </div>

              {scannedCodeRaw && (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 break-all text-left">
                  <span className="text-slate-500 block uppercase font-sans text-[9px] font-bold">
                    Scanned Content:
                  </span>
                  {scannedCodeRaw}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleRestartScanner}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/40 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>🔄 Scan Again (Turn Camera On)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSafeClose}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Close Scanner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileScannerModal;
