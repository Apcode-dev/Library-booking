import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import {
  X,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  CreditCard,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface MobileQRPassModalProps {
  booking: any;
  onClose: () => void;
  onBookingUpdated?: () => void;
}

const RAZORPAY_KEY =
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_THFHFpRR2qfrt7';

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

export const MobileQRPassModal: React.FC<MobileQRPassModalProps> = ({
  booking: initialBooking,
  onClose,
  onBookingUpdated,
}) => {
  const [booking, setBooking] = useState<any>(initialBooking);
  const [cancelling, setCancelling] = useState(false);
  const [extending, setExtending] = useState(false);
  const [payingExtension, setPayingExtension] = useState(false);

  if (!booking) return null;

  const isCheckedIn = Boolean(booking.checkInTime);
  const isCancelled = booking.status === 'CANCELLED';
  const isCompleted = booking.status === 'COMPLETED' || booking.status === 'EXPIRED_NOSHOW';
  const isActive = booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN';
  const isExtensionPending = booking.extensionPaymentStatus === 'PENDING';
  const isExtensionPaid = booking.extensionPaymentStatus === 'PAID';
  const pendingAmount = Number(booking.pendingExtensionAmount || booking.hourlyRate || 50);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel? You will receive an immediate 50% refund.')) {
      return;
    }

    setCancelling(true);
    try {
      const res = await api.post(`/bookings/${booking.id}/cancel`, {
        reason: 'Cancelled by user via mobile app',
      });
      if (res.data.success) {
        toast.success(`Booking cancelled. ₹${res.data.refundAmount || 0} refund processed!`);
        onBookingUpdated?.();
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to cancel booking.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing cancellation.');
    } finally {
      setCancelling(false);
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    try {
      const res = await api.post(`/bookings/${booking.id}/extend`, {
        additionalHours: 1,
      });
      if (res.data.success) {
        toast.success(`Session extended by 1 hour until ${res.data.extension?.newEndTime}! Please pay the ₹${res.data.extension?.additionalAmount} extension fee.`);
        setBooking(res.data.booking);
        onBookingUpdated?.();
      } else {
        toast.error(res.data.message || 'Could not extend booking.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Desk may be reserved by someone else for the next hour.');
    } finally {
      setExtending(false);
    }
  };

  const handlePayExtension = async (useSimulation = false) => {
    if (useSimulation) {
      setPayingExtension(true);
      const simulatedId = `pay_test_ext_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      try {
        const res = await api.post(`/bookings/${booking.id}/pay-extension`, {
          razorpayPaymentId: simulatedId,
        });
        if (res.data.success) {
          toast.success('1-Hour Extension Payment Completed! ✅');
          setBooking(res.data.booking);
          onBookingUpdated?.();
        } else {
          toast.error(res.data.message || 'Payment recording failed.');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error confirming extension payment.');
      } finally {
        setPayingExtension(false);
      }
      return;
    }

    // Razorpay standard checkout
    setPayingExtension(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      toast.error('Failed to load Razorpay payment gateway.');
      setPayingExtension(false);
      return;
    }

    try {
      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(pendingAmount * 100),
        currency: 'INR',
        name: 'LibSpace 1-Hour Extension',
        description: `Desk ${booking.seat?.seatNumber} 1hr Extension`,
        prefill: {
          name: booking.user?.name || '',
          email: booking.user?.email || '',
        },
        handler: async function (response: any) {
          try {
            const res = await api.post(`/bookings/${booking.id}/pay-extension`, {
              razorpayPaymentId: response.razorpay_payment_id,
            });
            if (res.data.success) {
              toast.success('1-Hour Extension Payment Verified! ✅');
              setBooking(res.data.booking);
              onBookingUpdated?.();
            }
          } catch (_) {
            toast.error('Failed to record extension payment.');
          } finally {
            setPayingExtension(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingExtension(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (_) {
      setPayingExtension(false);
      toast.error('Could not initiate checkout.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <QrCode className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Digital Entry Pass</h3>
              <p className="text-[10px] font-mono text-slate-400">{booking.bookingCode}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Ticket Card Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Main QR Code Box */}
          <div className="bg-white p-4 rounded-3xl shadow-xl text-center space-y-2">
            <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 p-2">
              {booking.qrCode ? (
                <img
                  src={booking.qrCode}
                  alt="QR Ticket"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-32 h-32 text-slate-800" />
              )}
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                Pass Signature Code
              </span>
              <span className="text-lg font-mono font-black text-slate-950 tracking-wider">
                {booking.bookingCode}
              </span>
            </div>

            <div className="pt-1 text-[11px] text-slate-600 font-medium">
              📲 Scan this QR at the library front desk to record attendance.
            </div>
          </div>

          {/* Booking Summary Details */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Library:</span>
              <strong className="text-white text-right max-w-[200px] truncate">
                {booking.library?.name || 'Library'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Reserved Desk:</span>
              <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 font-black border border-blue-500/30">
                Desk {booking.seat?.seatNumber || 'Assigned'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pass Category:</span>
              <span className="font-bold text-white capitalize">
                {booking.bookingType?.toLowerCase()} Pass
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Schedule:</span>
              <span className="text-white">
                {booking.date} ({booking.startTime} - {booking.endTime})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gate Check-in Status:</span>
              {isCheckedIn ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Checked In
                </span>
              ) : (
                <span className="text-amber-400 font-bold">Pending Arrival</span>
              )}
            </div>

            {booking.payment?.transactionId && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-emerald-400 font-bold truncate max-w-[170px]">
                  {booking.payment.transactionId}
                </span>
              </div>
            )}
          </div>

          {/* 1-Hour Extension Status Alert & Pay Section */}
          {isExtensionPending && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>1-Hour Extension Added (Payment Due)</span>
                </div>
                <span className="text-xs font-black text-amber-400">₹{pendingAmount}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                Your study session has been reserved until <strong className="text-white">{booking.endTime}</strong>. Please complete the pending extension payment.
              </p>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePayExtension(false)}
                  disabled={payingExtension}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay ₹{pendingAmount} (Razorpay)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePayExtension(true)}
                  disabled={payingExtension}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>🧪 Demo Pay ₹{pendingAmount} (1-Click Test Mode)</span>
                </button>
              </div>
            </div>
          )}

          {isExtensionPaid && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>1-Hour Extension Completed & Paid</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold text-[10px]">
                {booking.extensionPaymentId ? `TXN: ${booking.extensionPaymentId.slice(-8)}` : 'COMPLETED'}
              </span>
            </div>
          )}

          {/* Action Buttons for Active Bookings */}
          {isActive && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExtend}
                disabled={extending}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <span>{extending ? 'Extending...' : 'Extend 1 Hr'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{cancelling ? 'Cancelling...' : 'Cancel (50%)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileQRPassModal;
