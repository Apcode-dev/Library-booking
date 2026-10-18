import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Booking, Attendance } from '../types';
import { useAuth } from '../context/AuthContext';
import QRCodePass from '../components/booking/QRCodePass';
import {
  CalendarCheck,
  Clock,
  MapPin,
  QrCode,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  Armchair,
  CheckCircle2,
  XCircle,
  Crown,
  ShieldCheck,
  UserCheck,
  Calendar,
  History,
  RotateCcw,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import AuthModal from '../components/common/AuthModal';

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);
  const [selectedAttendanceBooking, setSelectedAttendanceBooking] = useState<Booking | null>(null);
  const [rebookModalBooking, setRebookModalBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);

  // Rebook State
  const [extendHours, setExtendHours] = useState(1);
  const [extending, setExtending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'attendance' | 'history'>('active');

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/bookings/my-bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
      // Poll every 30 seconds for live countdown and status updates
      const interval = setInterval(fetchBookings, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle Seat Extension / Rebook
  const handleConfirmExtend = async () => {
    if (!rebookModalBooking) return;
    setExtending(true);
    try {
      const res = await api.post(`/bookings/${rebookModalBooking.id}/extend`, {
        additionalHours: extendHours,
      });

      if (res.data.success) {
        alert(`✅ Seat ${rebookModalBooking.seat?.seatNumber} successfully extended by ${extendHours} hour(s) until ${res.data.extension.newEndTime}!`);
        setRebookModalBooking(null);
        if (selectedPassBooking && selectedPassBooking.id === rebookModalBooking.id) {
          setSelectedPassBooking(res.data.booking);
        }
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to extend seat time');
    } finally {
      setExtending(false);
    }
  };

  // Handle 50% Refund Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);
    try {
      const res = await api.post(`/bookings/${cancelModalBooking.id}/cancel`);
      if (res.data.success) {
        alert(`✅ ${res.data.message}`);
        setCancelModalBooking(null);
        if (selectedPassBooking && selectedPassBooking.id === cancelModalBooking.id) {
          setSelectedPassBooking(null);
        }
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Active bookings include both CONFIRMED and CHECKED_IN
  const activeBookings = bookings.filter(
    (b) => b.isActive && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
  );
  // Past bookings include completed, expired no-show, cancelled, or past-due
  const pastBookings = bookings.filter(
    (b) => !b.isActive || (b.status !== 'CONFIRMED' && b.status !== 'CHECKED_IN')
  );

  // Collect all attendances across all bookings for the dedicated attendance tab
  const allAttendances: Array<Attendance & { libraryName?: string; seatNumber?: string }> = [];
  bookings.forEach((b) => {
    if (b.attendances && b.attendances.length > 0) {
      b.attendances.forEach((att) => {
        allAttendances.push({
          ...att,
          libraryName: b.library?.name,
          seatNumber: b.seat?.seatNumber || att.seatNumber,
        });
      });
    }
  });

  allAttendances.sort(
    (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

  const getDaysRemaining = (validUntil?: string) => {
    if (!validUntil) return 0;
    const diff = new Date(validUntil).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Sign in to View Your Passes</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Login as a student to view your digital QR passes, live remaining seat time, rebooking extension, and attendance history logs.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <span>🔑 Sign In / Register</span>
            </button>
            <Link
              to="/"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-xl text-xs font-bold transition text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultRole="USER"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-blue-600" />
              My Bookings & Digital Passes
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live QR passes, real-time extension, automatic no-show refund protection, and daily attendance logs
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition"
          >
            Explore Libraries
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Transparency Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-3xl border border-blue-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Smart Seat Protection Active:</strong> 50% refund on voluntary cancellation • 30% auto-refund if session expires without check-in • Rebook seat 15 mins before end.
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Active Passes</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-full">
              {activeBookings.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Attendance Log</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">
              {allAttendances.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past History ({pastBookings.length})</span>
          </button>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500">Loading your reservations & passes...</p>
          </div>
        ) : activeTab === 'attendance' ? (
          /* TAB 2: ATTENDANCE LOG VIEW */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Check-Ins</span>
                  <span className="text-lg font-extrabold text-slate-900">{allAttendances.length} Days</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Active Passes</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {activeBookings.filter((b) => b.bookingType === 'MONTHLY' || b.bookingType === 'YEARLY').length} Passes
                  </span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Attendance Policy</span>
                  <span className="text-xs font-bold text-slate-800">1 Check-in / Day Max</span>
                </div>
              </div>
            </div>

            {allAttendances.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Attendance Recorded Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you visit your library, show your QR Entry Pass at the gate scanner to record your daily attendance!
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">Official Daily Attendance Records</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Auto-recorded via QR Scanner</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {allAttendances.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0">
                          <span>{att.seatNumber || 'DESK'}</span>
                          <span className="text-[8px] uppercase">Seat</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{att.libraryName || 'Library'}</h4>
                            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                              {att.passType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Gate Check-in Time: {new Date(att.checkInTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(att.checkInTime).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 1 & 3: BOOKINGS & PASSES LIST */
          <div className="space-y-4">
            {(activeTab === 'active' ? activeBookings : pastBookings).length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
                <Armchair className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {activeTab === 'active' ? 'No active bookings or passes right now' : 'No past bookings yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Ready to focus? Reserve an hourly seat or subscribe to a monthly/yearly premium pass.
                </p>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow hover:bg-blue-700 transition"
                >
                  Explore Libraries Now
                </Link>
              </div>
            ) : (
              (activeTab === 'active' ? activeBookings : pastBookings).map((booking) => {
                const isPremium = booking.bookingType === 'MONTHLY' || booking.bookingType === 'YEARLY';
                const daysRemaining = getDaysRemaining(booking.validUntil);
                const isCheckedIn = Boolean(booking.checkInTime || booking.status === 'CHECKED_IN');

                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4 relative overflow-hidden ${
                      isPremium
                        ? booking.bookingType === 'YEARLY'
                          ? 'border-amber-300 bg-gradient-to-r from-amber-50/30 via-white to-white'
                          : 'border-purple-300 bg-gradient-to-r from-purple-50/30 via-white to-white'
                        : booking.isExpiringSoon
                        ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/30'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Urgent 15-Minute Rebook Alert Banner */}
                    {booking.isExpiringSoon && (
                      <div className="p-2.5 rounded-2xl bg-amber-500 text-white text-xs font-extrabold flex items-center justify-between gap-2 shadow-sm animate-pulse">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
                          <span>
                            ⏰ Time Running Out: Desk session ends in {booking.minutesToEnd} minutes! Rebook now to keep your desk.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRebookModalBooking(booking)}
                          className="px-3 py-1 bg-white text-amber-700 rounded-xl font-black text-xs hover:bg-amber-50 transition shadow"
                        >
                          🔄 Rebook / Extend Now
                        </button>
                      </div>
                    )}

                    {/* Unchecked-in Alert Banner */}
                    {booking.isActive && !isCheckedIn && !booking.isExpiringSoon && (
                      <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>
                            🔔 <strong>Check-in Required:</strong> Please scan your pass at the entrance desk. (If session expires without check-in, 30% auto-refund applies).
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPassBooking(booking)}
                          className="text-blue-700 hover:text-blue-900 underline text-xs font-bold"
                        >
                          View QR Pass
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Seat Badge */}
                        <div
                          className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black text-sm border ${
                            booking.bookingType === 'YEARLY'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : booking.bookingType === 'MONTHLY'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}
                        >
                          <span className="text-base leading-none">{booking.seat?.seatNumber || 'A-01'}</span>
                          <span className="text-[9px] font-bold uppercase opacity-80 mt-0.5">Desk</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-base">
                              {booking.library?.name}
                            </h3>

                            {/* Pass Type Badge */}
                            {booking.bookingType === 'YEARLY' && (
                              <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <Crown className="w-3 h-3" />
                                YEARLY VIP PASS (365 DAYS)
                              </span>
                            )}
                            {booking.bookingType === 'MONTHLY' && (
                              <span className="text-[10px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <Crown className="w-3 h-3" />
                                MONTHLY PREMIUM PASS (30 DAYS)
                              </span>
                            )}
                            {!isPremium && (
                              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                HOURLY SLOT
                              </span>
                            )}

                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                booking.status === 'CONFIRMED'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : booking.status === 'CHECKED_IN'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : booking.status === 'EXPIRED_NOSHOW'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : booking.status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {booking.status === 'EXPIRED_NOSHOW'
                                ? 'EXPIRED (NO-SHOW • 30% REFUND)'
                                : booking.status === 'CHECKED_IN'
                                ? 'CHECKED IN'
                                : booking.status}
                            </span>

                            {/* Check-in Pill */}
                            {isCheckedIn && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Attended
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {booking.library?.address}, {booking.library?.city}
                          </p>

                          {/* Validity & Time Info */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                            {isPremium ? (
                              <>
                                <span className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                  Valid Until:{' '}
                                  {booking.validUntil
                                    ? new Date(booking.validUntil).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : 'N/A'}
                                </span>
                                {booking.isActive && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px]">
                                    ⚡ {daysRemaining} Days Left
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                {booking.date} • {booking.startTime} - {booking.endTime} ({booking.durationHours}h)
                              </span>
                            )}

                            <span className="font-bold text-slate-900">
                              Total Paid: ₹{booking.totalAmount}
                            </span>

                            {/* Refund Note */}
                            {booking.status === 'EXPIRED_NOSHOW' && (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                💵 30% Auto-Refund (₹{(booking.refundAmount || booking.totalAmount * 0.3).toFixed(2)}) Credited
                              </span>
                            )}

                            {booking.status === 'CANCELLED' && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                💵 50% Refund (₹{(booking.refundAmount || booking.totalAmount * 0.5).toFixed(2)}) Credited
                              </span>
                            )}

                            {/* Attendance Count */}
                            {booking.attendances && booking.attendances.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                <UserCheck className="w-3 h-3" />
                                {booking.attendances.length} Check-ins
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {booking.isActive && (
                          <>
                            {/* Rebook / Extend Time Button for Hourly */}
                            {booking.canRebook && (
                              <button
                                type="button"
                                onClick={() => setRebookModalBooking(booking)}
                                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                                  booking.isExpiringSoon
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/30'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Rebook / Extend Time</span>
                              </button>
                            )}

                            {/* View Digital Pass Button */}
                            <button
                              onClick={() => setSelectedPassBooking(booking)}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow transition flex items-center gap-1.5"
                            >
                              <QrCode className="w-4 h-4 text-cyan-400" />
                              <span>Digital Entry Pass</span>
                            </button>

                            {/* Cancel Button */}
                            <button
                              onClick={() => setCancelModalBooking(booking)}
                              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                            >
                              Cancel (50% Refund)
                            </button>
                          </>
                        )}

                        {booking.attendances && booking.attendances.length > 0 && (
                          <button
                            onClick={() => setSelectedAttendanceBooking(booking)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Logs ({booking.attendances.length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* QR Code Pass Modal */}
      {selectedPassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-transparent">
            <button
              onClick={() => setSelectedPassBooking(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <QRCodePass
              booking={selectedPassBooking}
              onExtend={
                selectedPassBooking.canRebook
                  ? () => {
                      setRebookModalBooking(selectedPassBooking);
                    }
                  : undefined
              }
              onCancel={
                selectedPassBooking.isActive
                  ? () => {
                      setCancelModalBooking(selectedPassBooking);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Rebook / Time Extension Modal */}
      {rebookModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Rebook / Extend Desk {rebookModalBooking.seat?.seatNumber}
                </h3>
              </div>
              <button
                onClick={() => setRebookModalBooking(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Library:</span>
                <strong className="text-slate-900">{rebookModalBooking.library?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Current End Time:</span>
                <strong className="text-blue-600 font-bold">{rebookModalBooking.endTime}</strong>
              </div>
              <div className="flex justify-between">
                <span>Hourly Rate:</span>
                <strong className="text-slate-900">₹{rebookModalBooking.hourlyRate}/hour</strong>
              </div>
            </div>

            {/* Select Additional Hours */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Select Additional Duration to Add:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setExtendHours(hrs)}
                    className={`py-2 text-xs font-extrabold rounded-xl border transition ${
                      extendHours === hrs
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    +{hrs} Hour{hrs > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Additional Time Charge ({extendHours}h × ₹{rebookModalBooking.hourlyRate}):</span>
                <span className="font-semibold">₹{(extendHours * rebookModalBooking.hourlyRate).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-blue-900 pt-1 border-t border-blue-200">
                <span>Total Extension Payable:</span>
                <span className="text-sm">₹{(extendHours * rebookModalBooking.hourlyRate).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 Your desk reservation will be instantly extended, allowing you to stay focused without interruption. If no extension is made, the desk automatically becomes available to other students once time ends.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRebookModalBooking(null)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={extending}
                onClick={handleConfirmExtend}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow transition disabled:opacity-50"
              >
                {extending ? 'Processing...' : `Confirm & Extend (+₹${(extendHours * rebookModalBooking.hourlyRate).toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation with 50% Refund Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Cancel Booking & Refund Details
                </h3>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel your reservation for <strong>Desk {cancelModalBooking.seat?.seatNumber}</strong> at <strong>{cancelModalBooking.library?.name}</strong>?
            </p>

            {/* 50% Refund Calculation Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Amount Paid:</span>
                <span className="font-semibold text-slate-900">₹{cancelModalBooking.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Cancellation Fee (50%):</span>
                <span className="font-bold">- ₹{(cancelModalBooking.totalAmount * 0.5).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Refund to Your Account (50%):</span>
                <span>₹{(cancelModalBooking.totalAmount * 0.5).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <strong>Notice:</strong>
              <p>Upon cancellation, your desk will be immediately freed up on the portal for other students to book. The 50% refund will be credited to your original payment method.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : `Confirm & Refund ₹${(cancelModalBooking.totalAmount * 0.5).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specific Booking Attendance History Modal */}
      {selectedAttendanceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  Attendance History for Desk {selectedAttendanceBooking.seat?.seatNumber}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedAttendanceBooking.library?.name} • {selectedAttendanceBooking.bookingType} PASS
                </p>
              </div>
              <button
                onClick={() => setSelectedAttendanceBooking(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Total Days Attended</span>
                <span className="text-sm font-black">{selectedAttendanceBooking.attendances?.length || 0} Days</span>
              </div>

              <div className="divide-y divide-slate-100">
                {selectedAttendanceBooking.attendances?.map((att) => (
                  <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {new Date(att.checkInTime).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Scan Time: {new Date(att.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
