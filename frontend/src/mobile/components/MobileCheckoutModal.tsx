import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { SeatLockResponse } from '../../types';
import {
  X,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

interface MobileCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockData: SeatLockResponse;
  photos?: string[];
  onSuccess: (booking: any) => void;
}

export const MobileCheckoutModal: React.FC<MobileCheckoutModalProps> = ({
  isOpen,
  onClose,
  lockData,
  photos = [],
  onSuccess,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(
    lockData.lockDurationSeconds || 300
  );
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [upiProvider, setUpiProvider] = useState<'GPAY' | 'PHONEPE' | 'PAYTM'>('GPAY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 5-minute countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('Reservation hold expired. The seat has been released.');
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !lockData) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCancelHold = async () => {
    try {
      await api.post('/bookings/release-lock', { lockToken: lockData.lockToken });
    } catch (_) {}
    onClose();
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/bookings/confirm', {
        lockToken: lockData.lockToken,
        paymentMethod,
      });

      if (res.data.success) {
        // Fire micro-celebration animation
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'],
          });
        } catch (_) {}

        toast.success('Desk Reserved Successfully! 🎉');
        onSuccess(res.data.booking);
      } else {
        toast.error(res.data.message || 'Payment confirmation failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing reservation payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3-Image showcase collage
  const collagePhotos = [
    photos[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
    photos[1] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
    photos[2] || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden"></div>

        {/* 3-Image Showcase Collage Banner */}
        <div className="relative h-28 bg-slate-950 overflow-hidden">
          <div className="grid grid-cols-3 h-full gap-0.5">
            <div className="relative overflow-hidden">
              <img
                src={collagePhotos[0]}
                alt="Exterior"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 bg-black/60 rounded text-white backdrop-blur-sm">
                Exterior
              </span>
            </div>
            <div className="relative overflow-hidden">
              <img
                src={collagePhotos[1]}
                alt="Study Hall"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 bg-black/60 rounded text-white backdrop-blur-sm">
                Hall
              </span>
            </div>
            <div className="relative overflow-hidden">
              <img
                src={collagePhotos[2]}
                alt="Amenities"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 bg-black/60 rounded text-white backdrop-blur-sm">
                Amenities
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelHold}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Minute Hold Alert Bar */}
        <div className="bg-amber-950/60 border-y border-amber-900/60 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Seat Locked Exclusively For You</span>
          </div>
          <span className="font-mono font-black text-amber-200 bg-amber-900/50 px-2 py-0.5 rounded-lg border border-amber-700/50">
            {timeFormatted}
          </span>
        </div>

        {/* Scrollable Checkout Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Desk Summary Card */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  {lockData.seat.libraryName}
                </span>
                <h3 className="text-base font-black text-white">
                  Desk {lockData.seat.seatNumber} ({lockData.seat.zoneName})
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold uppercase">
                {lockData.bookingType || 'Hourly'} Pass
              </span>
            </div>

            {lockData.validUntil ? (
              <p className="text-xs text-slate-400">
                Pass validity: Valid until <strong>{lockData.validUntil}</strong>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Duration: <strong>{lockData.pricing.durationHours} Hours</strong> study session
              </p>
            )}
          </div>

          {/* Transparent Price Breakdown */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Summary
            </h4>

            <div className="flex justify-between text-slate-300">
              <span>Desk Fee</span>
              <span>₹{lockData.pricing.seatAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Taxes & GST</span>
              <span>₹{lockData.pricing.taxAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Platform & Maintenance</span>
              <span>₹{lockData.pricing.platformFee.toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
              <span>Total Payable</span>
              <span className="text-emerald-400">
                ₹{lockData.pricing.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Payment Method
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Fast</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('NET_BANKING')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === 'NET_BANKING'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Net Banking</span>
              </button>
            </div>

            {/* UPI App Quick Toggles */}
            {paymentMethod === 'UPI' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-around gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setUpiProvider('GPAY')}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    upiProvider === 'GPAY'
                      ? 'bg-slate-800 text-white border-blue-500'
                      : 'text-slate-500 border-transparent'
                  }`}
                >
                  Google Pay
                </button>
                <button
                  type="button"
                  onClick={() => setUpiProvider('PHONEPE')}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    upiProvider === 'PHONEPE'
                      ? 'bg-slate-800 text-white border-purple-500'
                      : 'text-slate-500 border-transparent'
                  }`}
                >
                  PhonePe
                </button>
                <button
                  type="button"
                  onClick={() => setUpiProvider('PAYTM')}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    upiProvider === 'PAYTM'
                      ? 'bg-slate-800 text-white border-sky-500'
                      : 'text-slate-500 border-transparent'
                  }`}
                >
                  Paytm UPI
                </button>
              </div>
            )}
          </div>

          {/* Refund Notice Reminder */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Fair Booking Guarantee:</strong> 50% instant refund if cancelled before
              completion; 30% auto-refund if you are unable to check in.
            </span>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-950/40 transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Issuing Digital Pass...</span>
              </span>
            ) : (
              <>
                <span>Confirm & Pay ₹{lockData.pricing.totalAmount.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileCheckoutModal;
