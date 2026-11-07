import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import MobileQRPassModal from '../components/MobileQRPassModal';
import {
  Ticket,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Armchair,
  Trash2,
} from 'lucide-react';

interface SwipeableItemProps {
  id: string;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ id, onDelete, children }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const isHorizontalRef = React.useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalRef.current) {
      const clamped = Math.max(-160, Math.min(160, diffX));
      setTranslateX(clamped);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (Math.abs(translateX) > 80) {
      setIsDeleted(true);
      const exitTarget = translateX > 0 ? 380 : -380;
      setTranslateX(exitTarget);
      setTimeout(() => {
        onDelete(id);
      }, 220);
    } else {
      setTranslateX(0);
    }
    isHorizontalRef.current = null;
  };

  if (isDeleted) {
    return null;
  }

  const isLeftSwipe = translateX < -20;
  const isRightSwipe = translateX > 20;

  return (
    <div className="relative overflow-hidden rounded-2xl my-1.5 select-none touch-pan-y">
      {/* Background red delete container revealing on swipe left or right */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-600 rounded-2xl flex items-center justify-between px-4 text-white font-bold text-xs">
        <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isRightSwipe ? 'opacity-100 scale-105' : 'opacity-40'}`}>
          <Trash2 className="w-4 h-4 text-white" />
          <span>Swipe to Clear</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isLeftSwipe ? 'opacity-100 scale-105' : 'opacity-40'}`}>
          <span>Swipe to Clear</span>
          <Trash2 className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Draggable Card Layer */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.2, 1)',
        }}
        className="relative z-10 will-change-transform"
      >
        {children}
      </div>
    </div>
  );
};

interface MobilePassesScreenProps {
  onOpenAuth: () => void;
  onExplore: () => void;
}

export const MobilePassesScreen: React.FC<MobilePassesScreenProps> = ({
  onOpenAuth,
  onExplore,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'attendance' | 'history'>('active');

  const [bookings, setBookings] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPass, setSelectedBookingForPass] = useState<any | null>(null);

  const fetchBookingsAndAttendance = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bookingsRes, attendanceRes] = await Promise.all([
        api.get('/bookings/my-bookings'),
        api.get('/bookings/my-attendance'),
      ]);

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.bookings || []);
      }
      if (attendanceRes.data.success) {
        setAttendanceLogs(attendanceRes.data.attendances || attendanceRes.data.attendance || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsAndAttendance();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <Ticket className="w-12 h-12 text-blue-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Sign In to View Passes</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Please log in to access your digital QR tickets, check-in history, and active study
          passes.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
        >
          Sign in to Account
        </button>
      </div>
    );
  }

  const activeBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'EXPIRED_NOSHOW'
  );

  const handleDeleteAttendance = async (attendanceId: string) => {
    const previous = [...attendanceLogs];
    setAttendanceLogs((prev) => prev.filter((a) => a.id !== attendanceId));
    try {
      const res = await api.delete(`/bookings/my-attendance/${attendanceId}`);
      if (res.data?.success) {
        toast.success('Attendance record deleted! 🗑️');
      } else {
        setAttendanceLogs(previous);
        toast.error(res.data?.message || 'Failed to delete attendance');
      }
    } catch (err: any) {
      setAttendanceLogs(previous);
      toast.error(err.response?.data?.message || 'Failed to delete attendance record.');
    }
  };

  const handleDeleteHistory = async (bookingId: string) => {
    const previous = [...bookings];
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    try {
      const res = await api.delete(`/bookings/my-history/${bookingId}`);
      if (res.data?.success) {
        toast.success('Past session removed from history! 🗑️');
      } else {
        setBookings(previous);
        toast.error(res.data?.message || 'Failed to remove session history');
      }
    } catch (err: any) {
      setBookings(previous);
      toast.error(err.response?.data?.message || 'Failed to delete session history.');
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Tab Switcher */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Active ({activeBookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Tab 1: Active Passes */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          {activeBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Active Passes</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                You don't have any active study passes right now.
              </p>
              <button
                onClick={onExplore}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Browse Nearby Libraries
              </button>
            </div>
          ) : (
            activeBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-4 shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      {b.library?.name || 'Library'}
                    </span>
                    <h4 className="text-base font-black text-white">
                      Desk {b.seat?.seatNumber} ({b.bookingType} Pass)
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    {b.status === 'CHECKED_IN' ? 'Checked In' : 'Active Pass'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Date & Slot</span>
                    <span className="font-bold">
                      {b.date} ({b.startTime} - {b.endTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pass Code</span>
                    <span className="font-mono font-bold text-blue-400">{b.bookingCode}</span>
                  </div>
                </div>

                {/* 1-Hour Extension Status: Pending vs Completed */}
                {(b.extensionPaymentStatus === 'PENDING' || (Number(b.pendingExtensionHours) > 0 && b.extensionPaymentStatus !== 'PAID')) && (
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>+{b.pendingExtensionHours || 1}hr Ext. (Payment Due)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForPass(b)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black tracking-wide cursor-pointer transition active:scale-95 shadow-md shadow-amber-500/20"
                    >
                      Pay ₹{b.pendingExtensionAmount || b.hourlyRate || 20}
                    </button>
                  </div>
                )}

                {b.extensionPaymentStatus === 'PAID' && (
                  <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+1hr Extension Paid (Complete)</span>
                    </div>
                    <span className="font-mono text-[10px]">{b.extensionPaymentId ? `TXN: ${b.extensionPaymentId.slice(-6)}` : 'PAID'}</span>
                  </div>
                )}

                {/* Show QR Ticket Action */}
                <button
                  type="button"
                  onClick={() => setSelectedBookingForPass(b)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Display QR Code Ticket</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Attendance Punch Calendar */}
      {activeTab === 'attendance' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1x Daily Gate Scan Policy</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every time you enter the study hall, the owner scans your QR pass to record physical
              attendance in the digital gate register.
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>👈 Swipe left or right to clear 👉</span>
            <span className="text-slate-500 font-mono">{attendanceLogs.length} Records</span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Attendance Recorded</h4>
              <p className="text-xs text-slate-400">
                Attendance punches will appear here once verified at the library front desk.
              </p>
            </div>
          ) : (
            attendanceLogs.map((att) => (
              <SwipeableItem key={att.id} id={att.id} onDelete={handleDeleteAttendance}>
                <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{att.library?.name || 'Library'}</div>
                    <div className="text-[10px] text-slate-400">
                      Desk {att.seatNumber || 'Standard'} • {att.passType} Pass
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">{att.date}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(att.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAttendance(att.id);
                      }}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </SwipeableItem>
            ))
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>👈 Swipe left or right to clear 👉</span>
            <span className="text-slate-500 font-mono">{pastBookings.length} Sessions</span>
          </div>

          {pastBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Past Sessions</h4>
              <p className="text-xs text-slate-400">Completed study passes will be archived here.</p>
            </div>
          ) : (
            pastBookings.map((b) => (
              <SwipeableItem key={b.id} id={b.id} onDelete={handleDeleteHistory}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{b.library?.name}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          b.status === 'COMPLETED'
                            ? 'bg-blue-950 text-blue-300'
                            : b.status === 'EXPIRED_NOSHOW'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(b.id);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete past session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>
                      {b.date} • Desk {b.seat?.seatNumber}
                    </span>
                    <span>Paid: ₹{b.totalAmount}</span>
                  </div>

                  {b.refundAmount > 0 && (
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-[10px]">
                      Refund of ₹{b.refundAmount} was processed ({b.refundStatus}).
                    </div>
                  )}
                </div>
              </SwipeableItem>
            ))
          )}
        </div>
      )}

      {/* QR Pass Modal */}
      {selectedBookingForPass && (
        <MobileQRPassModal
          booking={selectedBookingForPass}
          onClose={() => setSelectedBookingForPass(null)}
          onBookingUpdated={fetchBookingsAndAttendance}
        />
      )}
    </div>
  );
};

export default MobilePassesScreen;
