import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
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
  Sparkles,
  Zap,
} from 'lucide-react';

interface MobileCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockData: SeatLockResponse;
  photos?: string[];
  onSuccess: (booking: any) => void;
}

const RAZORPAY_KEY =
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_THFHFpRR2qfrt7';

// Dynamically loads Razorpay checkout SDK if not already available
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const MobileCheckoutModal: React.FC<MobileCheckoutModalProps> = ({
  isOpen,
  onClose,
  lockData,
  photos = [],
  onSuccess,
}) => {
  const { user } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState(
    lockData?.lockDurationSeconds || 300
  );
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

  const libraryName = lockData.seat?.libraryName || 'LibSpace Library';
  const seatNumber = lockData.seat?.seatNumber || 'Standard';
  const zoneName = lockData.seat?.zoneName || 'Main Hall';
  const seatAmount = Number(lockData.pricing?.seatAmount ?? 0);
  const taxAmount = Number(lockData.pricing?.taxAmount ?? 0);
  const platformFee = Number(lockData.pricing?.platformFee ?? 0);
  const totalAmount = Number(
    lockData.pricing?.totalAmount ?? (seatAmount + taxAmount + platformFee)
  );
  const durationHours = lockData.pricing?.durationHours ?? 1;

  const handleCancelHold = async () => {
    try {
      if (lockData.lockToken) {
        await api.post('/bookings/release-lock', { lockToken: lockData.lockToken });
      }
    } catch (_) {}
    onClose();
  };

  // Official Razorpay Payment Flow
  const handleRazorpayPayment = async () => {
    if (!lockData?.lockToken) {
      toast.error('Session token missing. Please select desk again.');
      onClose();
      return;
    }

    setIsSubmitting(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      toast.error('Failed to load Razorpay payment gateway. Please check internet connection.');
      setIsSubmitting(false);
      return;
    }

    try {
      const amountInPaise = Math.round(totalAmount * 100);

      const options = {
        key: RAZORPAY_KEY,
        amount: amountInPaise,
        currency: 'INR',
        name: 'LibSpace Platform',
        description: `Desk ${seatNumber} Reservation - ${libraryName}`,
        image: '/images/libspace-logo.png',
        prefill: {
          name: user?.name || 'Student Aspirant',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        notes: {
          libraryName,
          seatNumber: String(seatNumber),
          lockToken: lockData.lockToken,
          bookingType: lockData.bookingType || 'HOURLY',
        },
        theme: {
          color: '#2563eb', // LibSpace brand blue
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            toast('Payment cancelled. Your 5-minute hold is still active.', { icon: '⏳' });
          },
        },
        handler: async function (response: any) {
          toast.loading('Verifying Razorpay payment & generating QR pass...', { id: 'rzp-confirm' });
          try {
            const res = await api.post('/bookings/confirm', {
              lockToken: lockData.lockToken,
              paymentMethod: 'RAZORPAY',
              bookingType: lockData.bookingType || 'HOURLY',
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.dismiss('rzp-confirm');
            if (res.data.success) {
              try {
                confetti({
                  particleCount: 90,
                  spread: 75,
                  origin: { y: 0.6 },
                  colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'],
                });
              } catch (_) {}

              toast.success(`Payment Verified! (ID: ${response.razorpay_payment_id}) 🎉`);
              onSuccess(res.data.booking);
            } else {
              toast.error(res.data.message || 'Payment confirmation failed.');
            }
          } catch (err: any) {
            toast.dismiss('rzp-confirm');
            toast.error(err.response?.data?.message || 'Error confirming booking payment.');
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsSubmitting(false);
        toast.error(`Payment Failed: ${resp.error?.description || 'Transaction unsuccessful'}`);
      });
      rzp.open();
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error('Could not initiate Razorpay checkout.');
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
            className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-sm cursor-pointer"
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
                  {libraryName}
                </span>
                <h3 className="text-base font-black text-white">
                  Desk {seatNumber} ({zoneName})
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
                Duration: <strong>{durationHours} Hours</strong> study session
              </p>
            )}
          </div>

          {/* Razorpay Verified Badge Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-950/80 via-slate-950 to-indigo-950/80 rounded-2xl border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Razorpay Secure Checkout</h4>
                  <p className="text-[10px] text-blue-300">Official Gateway • 256-Bit Encrypted</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase">
                Instant Pass
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Pay securely via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, or Net Banking. You will receive an official Razorpay Transaction ID for verified entry.
            </p>

            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-slate-300 border-t border-slate-800/80">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Google Pay</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">PhonePe</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Paytm</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">All Cards</span>
            </div>
          </div>

          {/* Transparent Price Breakdown */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Summary
            </h4>

            <div className="flex justify-between text-slate-300">
              <span>Desk Fee</span>
              <span>₹{seatAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Taxes & GST</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Platform & Maintenance</span>
              <span>₹{platformFee.toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
              <span>Total Payable</span>
              <span className="text-emerald-400">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
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
            onClick={handleRazorpayPayment}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-blue-600/30 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Connecting to Razorpay...</span>
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Pay ₹{totalAmount.toFixed(2)} via Razorpay</span>
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
