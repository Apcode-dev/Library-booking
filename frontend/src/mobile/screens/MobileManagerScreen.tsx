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
  Crown,
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
  onLogout?: () => void;
}

export const MobileManagerScreen: React.FC<MobileManagerScreenProps> = ({
  onOpenAuth,
  activeTab = 'manager_dashboard',
  onNavigateTab,
  onLogout,
}) => {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<any>(null);
  const [managerInfo, setManagerInfo] = useState<any>(null);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [isOldRecordsModalOpen, setIsOldRecordsModalOpen] = useState(false);

  // Old Bookings Archive State
  const [isOldBookingsModalOpen, setIsOldBookingsModalOpen] = useState(false);
  const [oldBookingsDays, setOldBookingsDays] = useState<any[]>([]);
  const [loadingOldBookings, setLoadingOldBookings] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // PIN Unlock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Sub-view in dashboard
  const [branchSubView, setBranchSubView] = useState<'metrics' | 'seats' | 'students'>('metrics');

  // Bookings Tab state (Strictly today's daily bookings)
  const [bookings, setBookings] = useState<any[]>([]);
  const [allBookingsList, setAllBookingsList] = useState<any[]>([]);
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
        api.get('/manager/bookings/daily').catch(() => ({ data: { success: false, bookings: [] } })),
        api.get('/manager/users').catch(() => ({ data: { success: false, students: [] } })),
      ]);

      if (dashRes.data.success) {
        setLibrary(dashRes.data.library);
        setManagerInfo(dashRes.data.manager);
        setTodayCheckIns(dashRes.data.todayCheckIns || 0);
        setRecentAttendance(dashRes.data.recentAttendance || []);
        setActiveBookingsCount(dashRes.data.activeBookings || 0);
        setDashboardMetrics(dashRes.data.metrics || null);
        setAllBookingsList(dashRes.data.allBookings || []);
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

  const fetchOldBookings = async () => {
    setLoadingOldBookings(true);
    try {
      const res = await api.get('/manager/bookings/old');
      if (res.data?.success) {
        setOldBookingsDays(res.data.days || []);
        if (res.data.days?.length > 0) {
          setExpandedDate(res.data.days[0].date);
        }
      } else {
        toast.error(res.data?.message || 'Failed to load archived bookings.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load archived bookings.');
    } finally {
      setLoadingOldBookings(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
      fetchManagerData();
    }
  }, [user]);

  // Reset open modals whenever switching tabs to prevent unwanted popups
  useEffect(() => {
    setIsOldBookingsModalOpen(false);
    setIsPinModalOpen(false);
    setIsOldRecordsModalOpen(false);
    setSelectedStudent(null);
  }, [activeTab]);

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
        fetchManagerData();
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
    const raw = codeToVerify.trim();
    if (!raw) {
      toast.error('Please enter a valid Booking Pass Code.');
      return;
    }

    let code = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.code) code = parsed.code.trim();
      else if (parsed.bookingCode) code = parsed.bookingCode.trim();
      else if (parsed.id) code = parsed.id.trim();
    } catch (_) {}

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

  // Dedicated Branch Metrics for Manager's Console (Matching Owner Console Dynamic Metrics)
  const branchMetrics = useMemo(() => {
    if (!library) return dashboardMetrics || null;
    const branchBookings = (allBookingsList && allBookingsList.length > 0) ? allBookingsList : bookings;
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const now = new Date();
    const currentMonthKey = todayStr.slice(0, 7);

    let currentMonthRevenue = 0;
    let todayRevenue = 0;
    let activeNow = 0;

    branchBookings.forEach((b: any) => {
      const amount = b.payment?.amount || b.totalAmount || 0;
      const bDateStr = b.date || (b.createdAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(b.createdAt)) : '');
      const bMonthKey = bDateStr ? bDateStr.slice(0, 7) : currentMonthKey;

      if (bDateStr === todayStr) {
        todayRevenue += amount;
      }
      if (bMonthKey === currentMonthKey) {
        currentMonthRevenue += amount;
      }

      if (b.status === 'CHECKED_IN' || b.status === 'CONFIRMED' || b.status === 'ACTIVE') {
        const start = b.startDateTime ? new Date(b.startDateTime) : null;
        const end = b.endDateTime ? new Date(b.endDateTime) : null;
        if (start && end && start <= now && end >= now) {
          activeNow += 1;
        } else if (b.status === 'CHECKED_IN' || b.date === todayStr) {
          activeNow += 1;
        }
      }
    });

    const totalSeats = library.seats?.length || library.totalSeats || 0;
    const occupiedSeats = activeNow > 0 ? activeNow : (dashboardMetrics?.occupiedSeats ?? activeBookingsCount ?? 0);
    const occupancyRate = totalSeats > 0 ? Math.min(100, Math.round((occupiedSeats / totalSeats) * 100)) : 0;

    return {
      currentMonthRevenue: currentMonthRevenue > 0 ? currentMonthRevenue : (dashboardMetrics?.currentMonthRevenue || 0),
      todayRevenue: todayRevenue > 0 ? todayRevenue : (dashboardMetrics?.todayRevenue || 0),
      activeNow: occupiedSeats,
      occupancyRate: occupancyRate > 0 ? occupancyRate : (dashboardMetrics?.occupancyRate || 0),
      totalSeats,
      currentMonthName: dashboardMetrics?.currentMonthName,
    };
  }, [library, allBookingsList, bookings, dashboardMetrics, activeBookingsCount]);

  // Categorized seats (Divided into Hourly Study Desks, Monthly Pass Desks, and Yearly VIP Desks like Owner side)
  const seatCategories = useMemo(() => {
    if (!library) return [];

    // Check if library has seatZones with populated seats
    if (library.seatZones && library.seatZones.some((z: any) => (z.seats?.length || 0) > 0)) {
      return library.seatZones
        .filter((z: any) => (z.seats?.length || 0) > 0)
        .map((zone: any) => {
          let icon = 'clock';
          let tag = 'HOURLY';
          const nameLower = (zone.name || '').toLowerCase();
          if (nameLower.includes('yearly') || nameLower.includes('vip')) {
            icon = 'crown_yearly';
            tag = 'YEARLY VIP';
          } else if (nameLower.includes('monthly') || nameLower.includes('pass')) {
            icon = 'crown_monthly';
            tag = 'MONTHLY PASS';
          }
          return {
            id: zone.id,
            name: zone.name,
            icon,
            tag,
            seats: zone.seats || [],
          };
        });
    }

    // Fallback: Group seats by category or prefix (H-, M-, Y-) from library.seats
    const allSeats = library.seats || [];
    if (allSeats.length === 0) return [];

    const hourlySeats = allSeats.filter((s: any) => {
      const cat = (s.category || '').toUpperCase();
      const num = s.seatNumber || '';
      return (
        cat === 'HOURLY' ||
        num.startsWith('H-') ||
        (!num.startsWith('M-') && !num.startsWith('Y-') && cat !== 'MONTHLY' && cat !== 'YEARLY')
      );
    });

    const monthlySeats = allSeats.filter((s: any) => {
      const cat = (s.category || '').toUpperCase();
      const num = s.seatNumber || '';
      return cat === 'MONTHLY' || num.startsWith('M-');
    });

    const yearlySeats = allSeats.filter((s: any) => {
      const cat = (s.category || '').toUpperCase();
      const num = s.seatNumber || '';
      return cat === 'YEARLY' || num.startsWith('Y-');
    });

    const groups: any[] = [];
    if (hourlySeats.length > 0) {
      groups.push({
        id: 'cat_hourly',
        name: '⏱️ Hourly Study Desks',
        icon: 'clock',
        tag: 'HOURLY',
        seats: hourlySeats,
      });
    }
    if (monthlySeats.length > 0) {
      groups.push({
        id: 'cat_monthly',
        name: '👑 Monthly Pass Desks',
        icon: 'crown_monthly',
        tag: 'MONTHLY PASS',
        seats: monthlySeats,
      });
    }
    if (yearlySeats.length > 0) {
      groups.push({
        id: 'cat_yearly',
        name: '👑 Yearly VIP Desks',
        icon: 'crown_yearly',
        tag: 'YEARLY VIP',
        seats: yearlySeats,
      });
    }

    return groups.length > 0
      ? groups
      : [
          {
            id: 'cat_default',
            name: 'Standard Seating Desks',
            icon: 'clock',
            tag: 'STANDARD',
            seats: allSeats,
          },
        ];
  }, [library]);

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
            onLogout?.();
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
  const renderDashboardTab = () => (
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
            {/* Branch Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setIsUnlocked(false)}
                className="text-amber-400 font-bold flex items-center gap-1.5 text-xs hover:underline cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Console</span>
              </button>

              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[10px] flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-400" />
                <span>{library.lid || 'LID'} Unlocked</span>
              </span>
            </div>

            {/* Branch Details Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
              <h2 className="text-lg font-black text-white">{library.name}</h2>
              <p className="text-[11px] text-slate-400">
                📍 {library.address}, {library.city}, {library.state}
              </p>
            </div>

            {/* Branch Sub-view Toggle */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-center font-bold text-[11px]">
              <button
                type="button"
                onClick={() => setBranchSubView('metrics')}
                className={`py-1.5 rounded-xl transition cursor-pointer ${
                  branchSubView === 'metrics' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setBranchSubView('seats')}
                className={`py-1.5 rounded-xl transition cursor-pointer ${
                  branchSubView === 'seats' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Seat Map
              </button>
              <button
                type="button"
                onClick={() => setBranchSubView('students')}
                className={`py-1.5 rounded-xl transition cursor-pointer ${
                  branchSubView === 'students' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Students
              </button>
            </div>

            {/* Sub-view 1: Branch Metrics & Overview */}
            {branchSubView === 'metrics' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Net Earnings</span>
                    <div className="text-lg font-black text-emerald-400">
                      ₹{(branchMetrics?.currentMonthRevenue ?? dashboardMetrics?.currentMonthRevenue ?? 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] text-slate-500">This branch ({branchMetrics?.currentMonthName || dashboardMetrics?.currentMonthName || 'Month'})</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Today's Payout</span>
                    <div className="text-lg font-black text-white">
                      ₹{(branchMetrics?.todayRevenue ?? dashboardMetrics?.todayRevenue ?? 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] text-slate-500">Live Collection</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Live Occupancy</span>
                    <div className="text-lg font-black text-blue-400">
                      {branchMetrics?.occupancyRate ?? dashboardMetrics?.occupancyRate ?? 0}%
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {branchMetrics?.activeNow ?? dashboardMetrics?.occupiedSeats ?? activeBookingsCount} / {library.seats?.length || library.totalSeats || 0} occupied
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Total Desks</span>
                    <div className="text-lg font-black text-white">
                      {library.totalSeats || library.seats?.length || 0}
                    </div>
                    <span className="text-[9px] text-slate-500">Capacity</span>
                  </div>
                </div>

                {/* Pricing & Memberships Info */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <span className="font-extrabold text-white text-xs block">Pricing Plans</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Hourly</span>
                      <span className="font-bold text-blue-400">₹{library.hourlyRate}/h</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Monthly</span>
                      <span className="font-bold text-amber-400">
                        {library.enableMembership !== false && library.enableMonthly !== false
                          ? `₹${library.monthlyRate || 1200}/m`
                          : 'Disabled'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Yearly VIP</span>
                      <span className="font-bold text-purple-400">
                        {library.enableMembership !== false && library.enableYearly !== false
                          ? `₹${library.yearlyRate || 12000}/y`
                          : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operating Hours & Address */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <span className="font-extrabold text-white text-xs block">Operating Hours & Address</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Timings</span>
                      <span className="font-bold text-white">{library.openingTime} - {library.closingTime}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Active Desks</span>
                      <span className="font-bold text-emerald-400">
                        {library.seats?.filter((s: any) => s.isAvailable).length || 0} Online
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 inline mr-1" />
                    {library.address}, {library.city}, {library.state}
                  </p>
                </div>

                {/* Archived Bookings Shortcut */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-white text-xs block">Old Bookings History</span>
                    <span className="text-[10px] text-slate-400">Day-by-day past reservations archive</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      fetchOldBookings();
                      setIsOldBookingsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Archive</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view 2: Interactive Visual Seat Map */}
            {branchSubView === 'seats' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">Branch Visual Seat Map</span>
                    <span className="text-[10px] text-slate-400">Divided by Plan Category • Tap to toggle active</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-bold">
                    {library.seats?.filter((s: any) => s.isAvailable !== false).length || 0} / {library.seats?.length || library.totalSeats || 0} Active
                  </span>
                </div>

                {/* Color Legend Banner (Matching Owner Console) */}
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-[9px] font-bold">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Booked
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Checked-In
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    5m Hold
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Maint.
                  </span>
                </div>

                {seatCategories.map((categoryGroup: any) => (
                  <div key={categoryGroup.id} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        {categoryGroup.icon === 'crown_monthly' ? (
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                        ) : categoryGroup.icon === 'crown_yearly' ? (
                          <Crown className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{categoryGroup.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
                        {categoryGroup.seats.length} Desks
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {categoryGroup.seats.map((seat: any) => {
                        const seatBooking = (allBookingsList || bookings || []).find(
                          (b: any) =>
                            (b.seatId === seat.id || String(b.seat?.seatNumber || '').toUpperCase() === String(seat.seatNumber || '').toUpperCase()) &&
                            (b.status === 'CONFIRMED' || b.status === 'ACTIVE' || b.status === 'CHECKED_IN')
                        );

                        const isMaint = seat.status === 'MAINTENANCE' || seat.isAvailable === false;
                        const isCheckedIn = !isMaint && (seat.status === 'CHECKED_IN' || seatBooking?.status === 'CHECKED_IN');
                        const isBooked = !isMaint && !isCheckedIn && (seat.status === 'BOOKED' || Boolean(seatBooking));
                        const isLocked = !isMaint && !isCheckedIn && !isBooked && seat.status === 'LOCKED';

                        let seatBg = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
                        let statusText = 'AVAILABLE';

                        if (isMaint) {
                          seatBg = 'bg-rose-950/40 border-rose-500/40 text-rose-300';
                          statusText = 'MAINT.';
                        } else if (isCheckedIn) {
                          seatBg = 'bg-purple-950/60 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/40';
                          const name = seat.activeStudentName || seatBooking?.user?.name;
                          statusText = name ? `${name.split(' ')[0]} (IN)` : 'IN';
                        } else if (isBooked) {
                          seatBg = 'bg-blue-950/60 border-blue-500/60 text-blue-300';
                          const name = seat.activeStudentName || seatBooking?.user?.name;
                          statusText = name ? name.split(' ')[0] : 'BOOKED';
                        } else if (isLocked) {
                          seatBg = 'bg-amber-950/60 border-amber-500/60 text-amber-300';
                          statusText = 'HOLD';
                        }

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            onClick={() => handleToggleSeat(seat.id)}
                            className={`p-2 rounded-xl border text-center transition active:scale-95 cursor-pointer relative ${seatBg}`}
                            title={`Desk ${seat.seatNumber} (${categoryGroup.tag}) - Click to toggle maintenance`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs">{seat.seatNumber}</span>
                              <span className="text-[8px] font-extrabold px-1 rounded bg-black/40 opacity-80">
                                {categoryGroup.tag === 'YEARLY VIP' ? 'VIP' : categoryGroup.tag === 'MONTHLY PASS' ? 'PASS' : 'HR'}
                              </span>
                            </div>
                            <div className="text-[8.5px] mt-1 font-bold truncate opacity-90 uppercase">
                              {statusText}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-view 3: Student Directory */}
            {branchSubView === 'students' && (
              <div className="space-y-2.5">
                <span className="font-bold text-white text-xs block">
                  Student Directory & Access Records • {library.lid || 'LID'}
                </span>

                {usersList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p>No active students registered at this branch yet.</p>
                  </div>
                ) : (
                  usersList.map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {st.name ? st.name[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{st.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {st.studentId || st.phone || st.email}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold">
                        {st.totalBookings || 1} Bookings
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
  );

  // Global PIN Verification Modal
  const renderPinModal = () => isPinModalOpen && (
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
  );

  // Global Old Records (Monthly Historical Archive) Modal
  const renderOldRecordsModal = () => isOldRecordsModalOpen && (
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
  );

  // =========================================================================
  // TAB 2: MANAGER BOOKINGS (Strictly Daily / Today's Bookings)
  // =========================================================================
  const renderBookingsTab = () => (
    <div className="space-y-3.5 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Today's Daily Bookings</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Active Reservations</h2>
            <span className="text-[10px] text-slate-400">
              Strictly showing students booked for today in {library.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchOldBookings();
              setIsOldBookingsModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition cursor-pointer"
          >
            <History className="w-3 h-3" />
            <span>Old Bookings</span>
          </button>
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

        {/* Daily Bookings List */}
        <div className="space-y-2.5">
          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No Daily Bookings for Today</p>
              <p className="text-[11px] text-slate-400">
                When students reserve desks today in {library.name}, their bookings will appear here.
              </p>
              <button
                type="button"
                onClick={() => {
                  fetchOldBookings();
                  setIsOldBookingsModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Browse Old Bookings Archive</span>
              </button>
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

  // =========================================================================
  // TAB 3: MANAGER ATTENDANCE (Security Gate Scanner & Validate Pass)
  // =========================================================================
  const renderAttendanceTab = () => (
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

        {/* Gate Attendance Register (Live Punches) */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-white text-xs">Gate Attendance Register</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              {recentAttendance.length} Records
            </span>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="p-6 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
              <Calendar className="w-7 h-7 text-slate-600 mx-auto" />
              <p className="text-white font-bold text-xs">No Punches Recorded Yet</p>
              <p className="text-[10px] text-slate-400">
                Punches will appear here in real-time when students scan passes or check out.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        {log.user?.name || 'Student'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Desk {log.seatNumber || log.booking?.seat?.seatNumber || 'Assigned'} • {log.booking?.bookingType || 'Pass'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {log.checkOutType === 'MANUAL' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                          Manual Exit
                        </span>
                      )}
                      {log.checkOutType === 'AUTO_EXPIRED' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                          Auto Exit
                        </span>
                      )}
                      {!log.checkOutTime ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Inside
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-[9px] font-bold">
                          {log.checkOutType === 'AUTO_EXPIRED' ? 'Auto Exited' : 'Exited'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Date</span>
                      <span className="text-white font-mono">{log.date}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Check-In</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {new Date(log.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Check-Out</span>
                      <span className={`font-mono font-bold ${log.checkOutTime ? 'text-amber-400' : 'text-slate-500'}`}>
                        {log.checkOutTime
                          ? new Date(log.checkOutTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'In Hall'}
                      </span>
                    </div>
                  </div>

                  {(log.durationMinutes !== null && log.durationMinutes !== undefined && log.durationMinutes > 0) && (
                    <div className="text-[10px] text-slate-400 px-0.5">
                      Total Time: <strong className="text-white">{Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m</strong>
                    </div>
                  )}

                  {log.manualExitNotes && (
                    <div className="text-[10px] text-slate-400 italic bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800/60">
                      📝 {log.manualExitNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

  // =========================================================================
  // TAB 4: USERS (Students who have booked this library)
  // =========================================================================
  const renderUsersTab = () => (
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
                  {stu.avatar ? (
                    <img
                      src={stu.avatar}
                      alt={stu.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-purple-500/30 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                      {stu.name ? stu.name[0].toUpperCase() : 'S'}
                    </div>
                  )}
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
                {selectedStudent.avatar ? (
                  <img
                    src={selectedStudent.avatar}
                    alt={selectedStudent.name}
                    className="w-12 h-12 rounded-2xl object-cover shadow-md border border-purple-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
                    {selectedStudent.name ? selectedStudent.name[0].toUpperCase() : 'S'}
                  </div>
                )}
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

  // =========================================================================
  // TAB 5: MANAGER PROFILE
  // =========================================================================
  const renderProfileTab = () => (
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
        {/* Navigation to Old Bookings Day-by-Day Archive */}
        <button
          type="button"
          onClick={() => {
            fetchOldBookings();
            setIsOldBookingsModalOpen(true);
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Old Bookings History</span>
              <span className="text-[10px] text-slate-400">
                Day-by-day past reservations & collection records
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

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
            onLogout?.();
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

  // Global Old Bookings Day-by-Day Historical Archive Modal
  const renderOldBookingsModal = () => isOldBookingsModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in text-xs">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Old Bookings History</h3>
              <span className="text-[10px] text-slate-400">Day-by-Day Past Records • {library.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOldBookingsModalOpen(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          💡 <strong>Auto-Archive:</strong> Har din complete hote hi us din ki saari bookings date ke sath database me automatically archive ho jati hain. Kisi bhi din par tap karke us din ki saari bookings dekhein.
        </div>

        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          {loadingOldBookings ? (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
              <p className="text-slate-400 text-xs">Loading archived days from database...</p>
            </div>
          ) : oldBookingsDays.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <Archive className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold text-xs">No Past Days Archived Yet</p>
              <p className="text-[10px] text-slate-400">
                Jaise hi aaj ka din over hoga, us din ki saari bookings date ke sath yahan auto-archive ho jayengi.
              </p>
            </div>
          ) : (
            oldBookingsDays.map((day: any) => {
              const isExpanded = expandedDate === day.date;
              return (
                <div
                  key={day.date}
                  className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden transition"
                >
                  {/* Day summary row */}
                  <button
                    type="button"
                    onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-900/60 transition cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-extrabold text-white text-xs">{day.formattedDate || day.date}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {day.totalBookings} {day.totalBookings === 1 ? 'Booking' : 'Bookings'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-emerald-400">
                        ₹{(day.totalRevenue || 0).toLocaleString('en-IN')}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Day's Detailed Bookings */}
                  {isExpanded && (
                    <div className="p-3 border-t border-slate-900 bg-slate-900/40 space-y-2">
                      {(!day.bookings || day.bookings.length === 0) ? (
                        <p className="text-[10px] text-slate-500 italic">No bookings recorded for this day.</p>
                      ) : (
                        day.bookings.map((b: any) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{b.user?.name || 'Student'}</span>
                                <span className="font-mono text-[9px] text-slate-400">({b.bookingCode})</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 font-bold text-[9px]">
                                Desk {b.seat?.seatNumber || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                {b.bookingType || 'Hourly'} Pass • {b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : b.date}
                              </span>
                              <span className="font-bold text-emerald-400">
                                ₹{b.totalAmount || 0} ({b.payment?.paymentStatus || 'PAID'})
                              </span>
                            </div>

                            {b.user?.phone && (
                              <div className="text-[9px] text-slate-500">
                                📞 {b.user.phone}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsOldBookingsModalOpen(false)}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition active:scale-95"
          >
            Close Old Bookings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {activeTab === 'manager_dashboard' && renderDashboardTab()}
      {activeTab === 'manager_bookings' && renderBookingsTab()}
      {activeTab === 'manager_attendance' && renderAttendanceTab()}
      {activeTab === 'manager_users' && renderUsersTab()}
      {activeTab === 'manager_profile' && renderProfileTab()}

      {/* Global Shared Modals */}
      {renderPinModal()}
      {renderOldRecordsModal()}
      {renderOldBookingsModal()}
    </>
  );
};

export default MobileManagerScreen;
