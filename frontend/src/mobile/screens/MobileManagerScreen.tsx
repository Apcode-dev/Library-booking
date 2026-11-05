import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Library } from '../../types';
import MobileScannerModal from '../components/MobileScannerModal';
import {
  Building2,
  Lock,
  Unlock,
  Camera,
  TrendingUp,
  Armchair,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  CalendarCheck,
  QrCode,
  ChevronDown,
  ChevronUp,
  UserCheck,
  KeyRound,
  Edit2,
  LogOut,
  HelpCircle,
  ChevronRight,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  IdCard,
  X,
  MapPin,
  IndianRupee,
  Wallet,
  History,
  Archive,
} from 'lucide-react';

interface MobileManagerScreenProps {
  onOpenAuth: () => void;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const MobileManagerScreen: React.FC<MobileManagerScreenProps> = ({
  onOpenAuth,
  activeTab = 'manager_dashboard',
  onNavigateTab,
}) => {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<any>(null);
  const [managerInfo, setManagerInfo] = useState<any>(null);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [isOldRecordsModalOpen, setIsOldRecordsModalOpen] = useState(false);

  // PIN Unlock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Sub-view in dashboard
  const [branchSubView, setBranchSubView] = useState<'metrics' | 'seats' | 'students'>('metrics');

  // Bookings Tab state
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilterType, setBookingFilterType] = useState('ALL');

  // Attendance Tab state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Users Tab state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      const [dashRes, bookingsRes, usersRes] = await Promise.all([
        api.get('/manager/dashboard').catch(() => ({ data: { success: false } })),
        api.get('/manager/bookings').catch(() => ({ data: { success: false, bookings: [] } })),
        api.get('/manager/users').catch(() => ({ data: { success: false, students: [] } })),
      ]);

      if (dashRes.data.success) {
        setLibrary(dashRes.data.library);
        setManagerInfo(dashRes.data.manager);
        setTodayCheckIns(dashRes.data.todayCheckIns || 0);
        setActiveBookingsCount(dashRes.data.activeBookings || 0);
        setDashboardMetrics(dashRes.data.metrics || null);
      } else if (dashRes.data.message) {
        toast.error(dashRes.data.message);
      }

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.bookings || []);
      }

      if (usersRes.data.success) {
        setUsersList(usersRes.data.students || []);
      }
    } catch (err: any) {
      toast.error('Failed to load manager portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
      fetchManagerData();
    }
  }, [user]);

  // Handle PIN Unlock
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length !== 6) {
      toast.error('PIN must be exactly 6 digits.');
      return;
    }

    setVerifyingPin(true);
    try {
      const res = await api.post('/manager/verify-pin', { pin: pinInput.trim() });
      if (res.data.success) {
        toast.success('Branch console unlocked! 🔓');
        setIsUnlocked(true);
        setIsPinModalOpen(false);
        setPinInput('');
      } else {
        toast.error(res.data.message || 'Incorrect PIN');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Incorrect PIN.');
    } finally {
      setVerifyingPin(false);
    }
  };

  // Toggle seat availability
  const handleToggleSeat = async (seatId: string) => {
    try {
      const res = await api.patch(`/manager/seats/${seatId}/toggle`);
      if (res.data.success) {
        toast.success(res.data.message || 'Desk status updated! ✅');
        fetchManagerData();
      } else {
        toast.error(res.data.message || 'Failed to toggle desk');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating desk status.');
    }
  };

  // Manual Check-In from attendance bar
  const handleVerifyAndCheckIn = async (codeToVerify: string) => {
    const code = codeToVerify.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a valid Booking Pass Code.');
      return;
    }

    setVerifyingCode(true);
    try {
      const verifyRes = await api.post('/manager/verify-qr', { bookingCode: code });
      if (verifyRes.data.success && verifyRes.data.booking) {
        const checkInRes = await api.post('/manager/check-in', { bookingCode: code });
        if (checkInRes.data.success) {
          toast.success(`Check-In Recorded! ✅ ${verifyRes.data.booking.student?.name || 'Student'}`);
          setManualCode('');
          fetchManagerData();
        } else {
          toast.error(checkInRes.data.message || 'Check-in failed');
        }
      } else {
        toast.error(verifyRes.data.message || 'Invalid Pass Code');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification or Check-In failed.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = bookingSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        b.bookingCode?.toLowerCase().includes(q) ||
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.phone?.includes(q) ||
        String(b.seat?.seatNumber || '').toLowerCase().includes(q);

      const matchesType =
        bookingFilterType === 'ALL' ||
        (b.bookingType || 'HOURLY').toUpperCase() === bookingFilterType;

      return matchesQuery && matchesType;
    });
  }, [bookings, bookingSearch, bookingFilterType]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = userSearch.trim().toLowerCase();
      return (
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q)
      );
    });
  }, [usersList, userSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400">Loading Manager Console...</p>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4 text-xs">
        <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-extrabold text-white">No Library Assigned</h3>
        <p className="text-slate-400 leading-relaxed">
          Your manager account does not have an assigned library branch yet. Please contact the library owner to assign a branch to your account.
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer transition active:scale-95"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // =========================================================================
  // TAB 1: MANAGER DASHBOARD (Assigned Branch with PIN Unlock & Desks)
  // =========================================================================
  if (activeTab === 'manager_dashboard') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Manager Header Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                  Assigned Branch Console
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  Manager Portal
                </span>
              </div>
              <h2 className="text-base font-black text-white">{library.name}</h2>
              <span className="text-[10px] text-slate-400">{library.city}, {library.state}</span>
            </div>
          </div>
        </div>

        {/* Branch Card (Locked / Unlocked) */}
        {!isUnlocked ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">{library.name} is Locked 🔒</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed max-w-xs mx-auto">
                Enter your 6-digit Manager Security PIN to view live desks layout, toggle seating availability, and manage desk operations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Enter 6-Digit PIN to Unlock Branch</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* 4-Card Revenue & Occupancy Analytics */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Total Revenue (Current Month) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-1 relative overflow-hidden shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                    Total Revenue
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-0.5">
                  <span className="text-lg font-black text-white block">
                    ₹{(dashboardMetrics?.currentMonthRevenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-semibold block">
                    {dashboardMetrics?.currentMonthName || 'Current Month'} Collection
                  </span>
                </div>
              </div>

              {/* Card 2: Today's Payout / Collection */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-950 border border-blue-500/30 space-y-1 relative overflow-hidden shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                    Today's Payout
                  </span>
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-0.5">
                  <span className="text-lg font-black text-white block">
                    ₹{(dashboardMetrics?.todayRevenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-blue-400 font-semibold block">
                    Today's Collection
                  </span>
                </div>
              </div>

              {/* Card 3: Live Occupancy */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 space-y-1 relative overflow-hidden shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    Live Occupancy
                  </span>
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Armchair className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-white">
                      {dashboardMetrics?.occupiedSeats ?? activeBookingsCount}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      / {dashboardMetrics?.totalSeats ?? (library.seats?.length || library.totalSeats || 0)} Desks
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, dashboardMetrics?.occupancyRate || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-black text-purple-300 font-mono">
                      {dashboardMetrics?.occupancyRate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Old Records (Monthly Historical Archive) */}
              <button
                type="button"
                onClick={() => setIsOldRecordsModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/30 space-y-1 relative overflow-hidden text-left hover:border-amber-500/60 transition active:scale-95 cursor-pointer shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    Old Records
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <History className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-0.5">
                  <span className="text-lg font-black text-white block">
                    {dashboardMetrics?.oldRecords?.length || 0} Months
                  </span>
                  <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                    <span>View Archive</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            </div>

            {/* Sub-views Selector */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setBranchSubView('metrics')}
                className={`flex-1 py-2 text-center rounded-xl font-bold transition cursor-pointer ${
                  branchSubView === 'metrics'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setBranchSubView('seats')}
                className={`flex-1 py-2 text-center rounded-xl font-bold transition cursor-pointer ${
                  branchSubView === 'seats'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Desks Grid ({library.seats?.length || 0})
              </button>
            </div>

            {/* Sub-view: OVERVIEW */}
            {branchSubView === 'metrics' && (
              <div className="space-y-3">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                  <span className="font-extrabold text-white text-xs block">Operating Hours & Address</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Timings</span>
                      <span className="font-bold text-white">{library.openingTime} - {library.closingTime}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Hourly Fee</span>
                      <span className="font-bold text-emerald-400">₹{library.hourlyRate}/hr</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 inline mr-1" />
                    {library.address}, {library.city}, {library.state}
                  </p>
                </div>
              </div>
            )}

            {/* Sub-view: LIVE DESKS GRID */}
            {branchSubView === 'seats' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs">Live Seating Layout</span>
                  <span className="text-[10px] text-slate-400">Tap desk to toggle availability</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                  {library.seats?.map((seat: any) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleToggleSeat(seat.id)}
                      className={`p-2.5 rounded-xl border text-center transition active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        seat.isAvailable
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-300 hover:bg-rose-900/50'
                      }`}
                      title={seat.isAvailable ? 'Desk is Active (Tap to put in maintenance)' : 'Under Maintenance (Tap to enable)'}
                    >
                      <Armchair className="w-4 h-4" />
                      <span className="font-mono font-black text-xs">{seat.seatNumber}</span>
                      <span className="text-[8px] uppercase font-bold">
                        {seat.isAvailable ? 'Active' : 'Maint.'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIN Verification Modal */}
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-white">Unlock Branch Console</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <p className="text-[11px] text-slate-300 leading-tight">
                  Enter your 6-digit Manager PIN assigned by the owner to access branch operations.
                </p>

                <input
                  type="password"
                  required
                  maxLength={6}
                  autoFocus
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-xl font-mono text-white tracking-widest focus:outline-none focus:border-emerald-500"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={verifyingPin || pinInput.length !== 6}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-emerald-950/40 active:scale-95 transition"
                  >
                    {verifyingPin ? 'Verifying...' : 'Unlock Console'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Old Records (Monthly Historical Archive) Modal */}
        {isOldRecordsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in text-xs">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Old Records & Past Months</h3>
                    <span className="text-[10px] text-slate-400">Archived Monthly Revenue • {library.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOldRecordsModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>Auto-Archive:</strong> Current month ({dashboardMetrics?.currentMonthName || 'This Month'}) complete hote hi uska total revenue aur bookings data yahan automatically archive ho jata hai.
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {(!dashboardMetrics?.oldRecords || dashboardMetrics.oldRecords.length === 0) ? (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <Archive className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-white font-bold text-xs">No Past Months Archived Yet</p>
                    <p className="text-[10px] text-slate-400">
                      Jab yeh maheena ({dashboardMetrics?.currentMonthName || 'Current Month'}) pura hoga, tab uska revenue yahan auto-archive ho jayega.
                    </p>
                  </div>
                ) : (
                  dashboardMetrics.oldRecords.map((rec: any) => (
                    <div
                      key={rec.monthKey}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-emerald-500/40 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-extrabold text-white text-xs">{rec.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {rec.bookingsCount} Completed Bookings
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-emerald-400 block">
                          ₹{rec.totalRevenue.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold inline-block">
                          Archived
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOldRecordsModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition active:scale-95"
                >
                  Close Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 2: MANAGER BOOKINGS (Consolidated strictly for this library)
  // =========================================================================
  if (activeTab === 'manager_bookings') {
    return (
      <div className="space-y-3.5 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
            <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Branch Reservations</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Student Bookings</h2>
          <span className="text-[10px] text-slate-400">
            Strictly showing students who booked in {library.name}
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              placeholder="Search by student, desk, pass code..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={bookingFilterType}
            onChange={(e) => setBookingFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Plans</option>
            <option value="HOURLY">Hourly</option>
            <option value="FULL_DAY">Full Day</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>

        {/* Bookings List */}
        <div className="space-y-2.5">
          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No Bookings Found</p>
              <p className="text-[11px] text-slate-400">
                When students reserve desks in {library.name}, their bookings will appear here.
              </p>
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                      {b.user?.name ? b.user.name[0].toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-xs">{b.user?.name || 'Student'}</h4>
                      <span className="font-mono text-[10px] text-slate-400">{b.bookingCode}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-black text-[10px]">
                    Desk {b.seat?.seatNumber || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[10px] text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Plan</span>
                    <span className="font-bold capitalize text-white">{b.bookingType || 'Hourly'} Pass</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Slot</span>
                    <span className="font-medium text-slate-300">
                      {b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : b.date || 'Today'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <span className="text-slate-400">{b.user?.phone || 'No phone'}</span>
                  <span className="font-bold text-emerald-400">₹{b.totalAmount} • {b.payment?.paymentStatus || 'PAID'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB 3: MANAGER ATTENDANCE (Security Gate Scanner & Validate Pass)
  // =========================================================================
  if (activeTab === 'manager_attendance') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gate Security</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Validate Pass</h2>
            <span className="text-[10px] text-slate-400">Strictly validates passes for {library.name}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Camera</span>
          </button>
        </div>

        {/* Manual Pass Code Quick Verification Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md">
          <label className="text-[10px] font-bold text-slate-400 uppercase block">
            Instant Pass Check-In (Code or Camera)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Enter Booking Pass Code..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 uppercase"
            />
            <button
              type="button"
              onClick={() => handleVerifyAndCheckIn(manualCode)}
              disabled={verifyingCode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {verifyingCode ? 'Recording...' : 'Punch Entry'}
            </button>
          </div>
        </div>

        {/* Quick Tips Box */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 text-slate-400 text-[11px]">
          <span className="font-bold text-white block">Gate Pass Validation Rule:</span>
          <p>
            • Only QR passes booked specifically for <strong>{library.name}</strong> can be punched here.
          </p>
          <p>
            • If a student scans a pass from another branch, an instant <strong>"Pass Not Valid ❌"</strong> alert will be triggered.
          </p>
        </div>

        {/* Scanner Modal */}
        <MobileScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          selectedLibraryId={library.id}
          onCheckInSuccess={() => fetchManagerData()}
        />
      </div>
    );
  }

  // =========================================================================
  // TAB 4: USERS (Students who have booked this library)
  // =========================================================================
  if (activeTab === 'manager_users') {
    return (
      <div className="space-y-3.5 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Branch Community</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Registered Students</h2>
          <span className="text-[10px] text-slate-400">
            Automatically added when students book seats in {library.name}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search students by name, ID, phone..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Students List */}
        <div className="space-y-2.5">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No Students Yet</p>
              <p className="text-[11px] text-slate-400">
                Students who make reservations in this library will automatically appear in this directory.
              </p>
            </div>
          ) : (
            filteredUsers.map((stu) => (
              <div
                key={stu.id}
                onClick={() => setSelectedStudent(stu)}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md hover:border-purple-500/40 transition cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {stu.name ? stu.name[0].toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-xs truncate">{stu.name}</h4>
                    <span className="text-[10px] font-mono text-purple-400 block truncate">
                      {stu.studentId || 'LIB-STU-AUTO'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{stu.phone || 'No phone'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] block">
                    {stu.totalBookings} Bookings
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Tap to view</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Student Profile</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {selectedStudent.name ? selectedStudent.name[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{selectedStudent.name}</h3>
                  <span className="font-mono text-xs text-purple-400 font-bold block">
                    {selectedStudent.studentId || 'LIB-STU-AUTO'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">{selectedStudent.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-white font-mono">{selectedStudent.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-white">
                    {selectedStudent.city && selectedStudent.state
                      ? `${selectedStudent.city}, ${selectedStudent.state}`
                      : 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">Branch Bookings:</span>
                  <span className="font-bold text-emerald-400">{selectedStudent.totalBookings} Total Reservations</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 5: MANAGER PROFILE
  // =========================================================================
  return (
    <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
      {/* Profile Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-slate-800 overflow-hidden">
            <span>{user.name.charAt(0).toUpperCase()}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                Staff Manager
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">{user.email}</p>
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
              Assigned to: {library.name}
            </p>
          </div>
        </div>

        {/* Single Device Session Secured Banner */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Single-Device Security:</strong> Manager authenticated on this device.
          </span>
        </div>
      </div>

      {/* Account Details Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          Manager Staff Credentials
        </h3>
        <div className="space-y-2 text-slate-300">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Manager Name</span>
            <span className="font-semibold text-white">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Manager ID / Email</span>
            <span className="font-semibold text-white font-mono">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Mobile Phone</span>
            <span className="font-semibold text-white">{user.phone || 'Not added'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Assigned Branch</span>
            <span className="font-bold text-emerald-400">{library.name} ({library.city})</span>
          </div>
        </div>
      </div>

      {/* Navigation Actions Menu */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl divide-y divide-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setIsUnlocked(false);
            setIsPinModalOpen(true);
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Unlock Branch with PIN</span>
              <span className="text-[10px] text-slate-400">Enter PIN to access seating controls</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            toast.success('Manager session signed out successfully.');
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-rose-950/20 transition cursor-pointer active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-rose-300 block">Log Out</span>
              <span className="text-[10px] text-slate-500">Sign out and return to Info Gateway</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
};

export default MobileManagerScreen;
