import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { SeatLockResponse, Booking } from '../../types';
import SeatLockTimer from './SeatLockTimer';
import QRCodePass from './QRCodePass';
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Lock,
  Camera,
} from 'lucide-react';

interface BookingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockData: SeatLockResponse | null;
  onLockExpired: () => void;
  photos?: string[];
}

const RAZORPAY_KEY = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_THFHFpRR2qfrt7';

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

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  isOpen,
  onClose,
  lockData,
  onLockExpired,
  photos,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  if (!isOpen || !lockData) return null;

  // 1. Official Razorpay Payment Flow
  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError(null);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      setError('Failed to load Razorpay payment gateway. Please check your internet connection.');
      toast.error('Razorpay gateway failed to load.');
      setLoading(false);
      return;
    }

    try {
      const amountInPaise = Math.round(lockData.pricing.totalAmount * 100);

      const options = {
        key: RAZORPAY_KEY,
        amount: amountInPaise,
        currency: 'INR',
        name: 'LibSpace Platform',
        description: `Desk ${lockData.seat.seatNumber} Booking - ${lockData.seat.libraryName}`,
        image: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
        prefill: {
          name: user?.name || 'Student Aspirant',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        notes: {
          libraryName: lockData.seat.libraryName,
          seatNumber: lockData.seat.seatNumber,
          date: (lockData.seat as any).date || '',
          lockToken: lockData.lockToken,
        },
        theme: {
          color: '#2563eb', // Matches LibSpace brand blue
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
              setConfirmedBooking(res.data.booking);
              toast.success(`Payment verified! (ID: ${response.razorpay_payment_id})`);
              try {
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch (_) {}
            }
          } catch (err: any) {
            toast.dismiss('rzp-confirm');
            const msg = err.response?.data?.message || 'Payment confirmation failed.';
            setError(msg);
            toast.error(msg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast('Payment window closed.', { icon: 'ℹ️' });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        setError(`Payment Failed: ${response.error.description}`);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay invocation error:', err);
      setError(err.message || 'Unable to open Razorpay gateway.');
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* If booking confirmed, show the digital pass! */}
        {confirmedBooking ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Payment Complete & Booking Confirmed!</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QRCodePass booking={confirmedBooking} />

            <button
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow transition text-center"
            >
              Done & Return to Library
            </button>
          </div>
        ) : (
          <div>
            {/* Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              lockData.bookingType === 'YEARLY'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
                : lockData.bookingType === 'MONTHLY'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700'
            }`}>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  {lockData.bookingType === 'MONTHLY'
                    ? '👑 Premium Monthly Pass Checkout'
                    : lockData.bookingType === 'YEARLY'
                    ? '👑 365-Day VIP Pass Checkout'
                    : 'Review & Pay with Razorpay'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Complete payment within 5 minutes to secure your desk.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 5-Min Timer Widget */}
              <SeatLockTimer
                initialSeconds={lockData.lockDurationSeconds || 300}
                onExpire={() => {
                  setError('Seat lock time expired. Please select your seat again.');
                  onLockExpired();
                }}
              />

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 3-Photo Library Preview Strip */}
              {photos && photos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lockData.seat.libraryName} (3 Views)</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                      Verified Study Space
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-1 shadow-2xs">
                    <div className="relative rounded-xl overflow-hidden group">
                      <img src={photos[0]} alt="Front" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-bold">1. Banner</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden group">
                      <img src={photos[1] || photos[0]} alt="Hall" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-bold">2. Study Hall</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden group">
                      <img src={photos[2] || photos[0]} alt="Amenities" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-bold">3. Amenities</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reserved Seat Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                      {lockData.seat.seatNumber}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Desk {lockData.seat.seatNumber} ({lockData.seat.zoneName})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {lockData.seat.libraryName}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                    lockData.bookingType === 'YEARLY'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : lockData.bookingType === 'MONTHLY'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {lockData.bookingType === 'YEARLY' ? '👑 YEARLY VIP' : lockData.bookingType === 'MONTHLY' ? '👑 MONTHLY PASS' : lockData.seat.seatType.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {lockData.bookingType === 'MONTHLY'
                        ? '30 Days Pass'
                        : lockData.bookingType === 'YEARLY'
                        ? '365 Days VIP'
                        : `${lockData.pricing.durationHours} Hours Session`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {lockData.bookingType === 'MONTHLY'
                        ? 'Monthly Rate'
                        : lockData.bookingType === 'YEARLY'
                        ? 'Annual Rate'
                        : `₹${lockData.pricing.hourlyRate}/hour rate`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Razorpay Gateway Badge & Features */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-extrabold text-blue-950">
                      Razorpay Payment Gateway
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    256-Bit SSL Encrypted
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug">
                  Pay securely using any method on Razorpay:
                </p>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-700">
                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    ⚡ UPI / QR
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    📱 Google Pay / PhonePe / Paytm
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    💳 Cards (Debit & Credit)
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    🏦 Net Banking (All Banks)
                  </span>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>
                    {lockData.bookingType === 'MONTHLY'
                      ? 'Monthly Pass Base Fee'
                      : lockData.bookingType === 'YEARLY'
                      ? 'Yearly VIP Pass Fee'
                      : `Seat Base Fee (${lockData.pricing.durationHours}h)`}
                  </span>
                  <span className="font-semibold text-slate-800">
                    ₹{lockData.pricing.seatAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & GST ({lockData.pricing.taxPercent ?? 0}%)</span>
                  <span className="font-semibold text-slate-800">
                    {lockData.pricing.taxAmount > 0 ? `₹${lockData.pricing.taxAmount}` : '₹0 (No Tax)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{lockData.pricing.serviceFeeDesc || 'Extra / Service Fee'}</span>
                  <span className="font-semibold text-slate-800">
                    {lockData.pricing.platformFee > 0 ? `₹${lockData.pricing.platformFee}` : '₹0 (No Extra Fee)'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>Total Payable Amount</span>
                  <span className="text-blue-600 text-base font-black">
                    ₹{lockData.pricing.totalAmount}
                  </span>
                </div>
              </div>

              {/* Cancellation & No-Show Policy Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Transparent Cancellation & Refund Protection:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                  <li><strong>50% Refund on Cancellation:</strong> Cancel anytime to receive a 50% refund.</li>
                  <li><strong>30% Auto-Refund on No-Show:</strong> If you don't check in before time ends, 30% is automatically refunded.</li>
                  <li><strong>Rebook / Extend:</strong> Extend your desk session 15 minutes before it ends.</li>
                </ul>
              </div>

              {/* Razorpay Primary Pay Button */}
              <button
                type="button"
                onClick={handleRazorpayPayment}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2 border border-blue-400/30 active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Opening Razorpay Gateway...
                  </span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{lockData.pricing.totalAmount} with Razorpay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCheckoutModal;
