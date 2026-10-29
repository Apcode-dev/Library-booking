import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Library, User } from '../../types';
import MobileScannerModal from '../components/MobileScannerModal';
import MobileBranchModal from '../components/MobileBranchModal';
import MobileSecurityPinModal from '../components/MobileSecurityPinModal';
import {
  Building2,
  Lock,
  Unlock,
  Camera,
  Plus,
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
} from 'lucide-react';

interface MobileOwnerScreenProps {
  onOpenAuth: () => void;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const MobileOwnerScreen: React.FC<MobileOwnerScreenProps> = ({
  onOpenAuth,
  activeTab = 'owner_dashboard',
  onNavigateTab,
}) => {
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Security PIN states
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [unlockedBranchIds, setUnlockedBranchIds] = useState<string[]>([]);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetBranch, setPinTargetBranch] = useState<Library | null>(null);

  // Scanner modal & Add branch modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);

  // Branch Console Detailed View (when a branch is unlocked and selected)
  const [selectedBranch, setSelectedBranch] = useState<Library | null>(null);
  const [branchSubView, setBranchSubView] = useState<'metrics' | 'seats' | 'students'>('metrics');

  // Students & Attendance Records
  const [studentsData, setStudentsData] = useState<{
    dailyBookings: any[];
    premiumPasses: any[];
    attendanceLogs: any[];
  }>({
    dailyBookings: [],
    premiumPasses: [],
    attendanceLogs: [],
  });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Attendance Day-by-Day Accordion State (stores expanded dates)
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  // Search & Filter for Bookings Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilterBranch, setBookingFilterBranch] = useState<string>('ALL');
  const [bookingFilterType, setBookingFilterType] = useState<string>('ALL');

  // Manual QR / Pass Code Verification State
  const [manualCode, setManualCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const fetchOwnerData = async () => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [libsRes, metricsRes, pinRes, studentsRes] = await Promise.all([
        api.get('/owner/my-libraries'),
        api.get('/owner/dashboard'),
        api.get('/owner/pin-status'),
        api.get('/owner/students-and-attendance'),
      ]);

      if (libsRes.data.success) {
        setLibraries(libsRes.data.libraries || []);
      }
      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics || metricsRes.data);
      }
      if (pinRes.data.success) {
        setHasPin(pinRes.data.hasPin);
      }
      if (studentsRes.data.success) {
        setStudentsData({
          dailyBookings: studentsRes.data.dailyBookings || [],
          premiumPasses: studentsRes.data.premiumPasses || [],
          attendanceLogs: studentsRes.data.attendanceLogs || [],
        });
        // Auto-expand the most recent date
        if (studentsRes.data.attendanceLogs?.length > 0) {
          const firstDate = new Date(studentsRes.data.attendanceLogs[0].checkInTime).toLocaleDateString('en-GB');
          setExpandedDates([firstDate]);
        }
      }
    } catch (err) {
      console.error('Failed to load owner data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, [user]);

  // Group Attendance Logs by Date (Day-by-Day Folders)
  const groupedAttendance = useMemo(() => {
    const logs = studentsData.attendanceLogs || [];
    const groups: { [dateStr: string]: any[] } = {};

    logs.forEach((log) => {
      const dateKey = new Date(log.checkInTime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      count: items.length,
      items,
      isToday:
        date ===
        new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
    }));
  }, [studentsData.attendanceLogs]);

  // Consolidated Bookings List
  const allBookings = useMemo(() => {
    const daily = studentsData.dailyBookings || [];
    const premium = studentsData.premiumPasses || [];
    const combined = [...daily, ...premium];

    return combined.filter((b) => {
      const q = bookingSearch.toLowerCase();
      const matchesSearch =
        !q ||
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.phone?.toLowerCase().includes(q) ||
        b.bookingCode?.toLowerCase().includes(q) ||
        b.seat?.seatNumber?.toLowerCase().includes(q) ||
        b.library?.name?.toLowerCase().includes(q);

      const matchesBranch = bookingFilterBranch === 'ALL' || b.libraryId === bookingFilterBranch;
      const matchesType = bookingFilterType === 'ALL' || b.bookingType === bookingFilterType;

      return matchesSearch && matchesBranch && matchesType;
    });
  }, [studentsData, bookingSearch, bookingFilterBranch, bookingFilterType]);

  // Verification & Check-in Handler
  const handleVerifyAndCheckIn = async (codeToVerify: string) => {
    const code = codeToVerify.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter or scan a valid Booking Pass Code.');
      return;
    }

    setVerifyingCode(true);
    try {
      const verifyRes = await api.post('/owner/verify-qr', { bookingCode: code });
      if (verifyRes.data.success && verifyRes.data.booking) {
        // Automatically perform Check-in
        const checkInRes = await api.post('/owner/check-in', { bookingCode: code });
        if (checkInRes.data.success) {
          toast.success(`Check-In Recorded! ✅ ${verifyRes.data.booking.user?.name || 'Student'}`);
          setManualCode('');
          setIsScannerOpen(false);
          fetchOwnerData();
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

  const handleBranchClick = (branch: Library) => {
    if (unlockedBranchIds.includes(branch.id)) {
      setSelectedBranch(branch);
      setBranchSubView('metrics');
    } else {
      setPinTargetBranch(branch);
      setIsPinModalOpen(true);
    }
  };

  const handleToggleSeat = async (seatId: string) => {
    try {
      const res = await api.patch(`/owner/seats/${seatId}/toggle`);
      if (res.data.success) {
        toast.success('Desk status updated! ✅');
        fetchOwnerData();
      }
    } catch (_) {
      toast.error('Failed to toggle desk status.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image exceeds 4MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      try {
        const res = await updateProfile({ avatar: dataUrl });
        if (res.success) {
          toast.success('Owner profile photo updated! 📸');
        }
      } catch {
        toast.error('Error saving profile photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <Building2 className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Library Owner Portal</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Please sign in with your verified Library Owner account to manage study branches,
          configure desk zones, and operate the live QR entry gate.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
        >
          Sign In as Owner
        </button>
      </div>
    );
  }

  // =========================================================================
  // TAB 1: OWNER DASHBOARD
  // =========================================================================
  if (activeTab === 'owner_dashboard') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Network Console</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Owner Dashboard</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="p-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl shadow-lg shadow-amber-950/40 flex items-center gap-1.5 active:scale-95 transition font-bold"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[11px]">Scan QR</span>
          </button>
        </div>

        {/* 4 KPI Metrics Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Revenue
            </span>
            <div className="text-xl font-black text-emerald-400">
              ₹{metrics?.totalOwnerEarnings || 0}
            </div>
            <span className="text-[9px] text-slate-500 block">Across all branches</span>
          </div>

          {/* Card 2: Today's Payout */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Today's Payout
            </span>
            <div className="text-xl font-black text-white">
              ₹{metrics?.todayEarnings || 0}
            </div>
            <span className="text-[9px] text-emerald-500 font-semibold block">Live earnings</span>
          </div>

          {/* Card 3: Overall Occupancy */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Live Occupancy
            </span>
            <div className="text-xl font-black text-blue-400">
              {metrics?.occupancyRate || 0}%
            </div>
            <span className="text-[9px] text-slate-500 block">Active desks right now</span>
          </div>

          {/* Card 4: Network Desks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Network Desks
            </span>
            <div className="text-xl font-black text-white">
              {libraries.reduce((sum, l) => sum + (l.totalSeats || 0), 0)}
            </div>
            <span className="text-[9px] text-slate-500 block">
              {libraries.length} / 5 Branches added
            </span>
          </div>
        </div>

        {/* Quick Gate Validation Bar */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/30 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-white text-xs">Quick Gate Entry Pass</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Desk Gate Active
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. LIB-1741-98"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleVerifyAndCheckIn(manualCode)}
              disabled={verifyingCode}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-indigo-950/60 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {verifyingCode ? 'Checking...' : 'Check In'}
            </button>
          </div>
        </div>

        {/* Quick Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab?.('owner_branches')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left space-y-1 transition group cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            <span className="font-bold text-white block">Manage Branches</span>
            <span className="text-[10px] text-slate-400 block">{libraries.length} locations</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab?.('owner_attendance')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left space-y-1 transition group cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span className="font-bold text-white block">Day Attendance</span>
            <span className="text-[10px] text-slate-400 block">
              {studentsData.attendanceLogs?.length || 0} total logs
            </span>
          </button>
        </div>

        {/* Scanner Modal */}
        <MobileScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          selectedLibraryId={libraries[0]?.id}
          onCheckInSuccess={() => fetchOwnerData()}
        />
      </div>
    );
  }

  // =========================================================================
  // TAB 2: OWNER BOOKINGS CONSOLIDATED LIST
  // =========================================================================
  if (activeTab === 'owner_bookings') {
    return (
      <div className="space-y-3.5 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
            <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Reservations Roster</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Student Bookings</h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student name, phone, pass code, seat..."
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-2">
          {/* Branch Filter */}
          <select
            value={bookingFilterBranch}
            onChange={(e) => setBookingFilterBranch(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-[11px] focus:outline-none font-semibold"
          >
            <option value="ALL">All Branches ({libraries.length})</option>
            {libraries.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lid || 'LID'} • {l.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={bookingFilterType}
            onChange={(e) => setBookingFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-[11px] focus:outline-none font-semibold"
          >
            <option value="ALL">All Passes</option>
            <option value="HOURLY">Hourly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly VIP</option>
          </select>
        </div>

        {/* Bookings List */}
        <div className="space-y-2.5 pt-1">
          {allBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No bookings found</p>
              <p className="text-[11px] text-slate-400">
                No reservations match your current search or filters.
              </p>
            </div>
          ) : (
            allBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-md"
              >
                {/* Top Row: Branch & Pass Type */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-[10px]">
                      {b.library?.lid || 'LID'}
                    </span>
                    <span className="font-extrabold text-white text-xs truncate max-w-[150px]">
                      {b.library?.name}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      b.bookingType === 'YEARLY'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : b.bookingType === 'MONTHLY'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {b.bookingType}
                  </span>
                </div>

                {/* Student Info & Desk */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs">{b.user?.name || 'Student'}</h4>
                    <p className="text-[10px] text-slate-400">{b.user?.phone || b.user?.email}</p>
                    <span className="font-mono text-[10px] text-indigo-400 font-bold block mt-0.5">
                      Code: {b.bookingCode}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-black text-xs block">
                      {b.seat?.seatNumber || 'Desk #'}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-400 block mt-1">
                      ₹{b.totalAmount || b.payment?.amount || 0}
                    </span>
                  </div>
                </div>

                {/* Razorpay Transaction ID Verification */}
                {b.payment?.transactionId && (
                  <div className="flex items-center justify-between bg-slate-950/90 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-[10px]">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate max-w-[190px]">TXN: {b.payment.transactionId}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                      Razorpay
                    </span>
                  </div>
                )}

                {/* Timing & Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {b.date || 'Active'} • {b.startTime || ''} - {b.endTime || ''}
                    </span>
                  </span>

                  <span
                    className={`font-bold ${
                      b.status === 'CHECKED_IN'
                        ? 'text-emerald-400'
                        : b.status === 'CONFIRMED'
                        ? 'text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB 3: OWNER BRANCHES (MULTI-BRANCH MANAGEMENT)
  // =========================================================================
  if (activeTab === 'owner_branches') {
    // If a branch is selected, show that branch's dedicated full console
    if (selectedBranch) {
      return (
        <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
          {/* Branch Top Navigation Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setSelectedBranch(null)}
              className="text-amber-400 font-bold flex items-center gap-1 text-xs hover:underline cursor-pointer"
            >
              <span>← All Branches</span>
            </button>

            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[10px] flex items-center gap-1">
              <Unlock className="w-3 h-3 text-emerald-400" />
              <span>{selectedBranch.lid || 'LID'} Unlocked</span>
            </span>
          </div>

          {/* Branch Details Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
            <h2 className="text-lg font-black text-white">{selectedBranch.name}</h2>
            <p className="text-[11px] text-slate-400">
              📍 {selectedBranch.address}, {selectedBranch.city}, {selectedBranch.state}
            </p>
          </div>

          {/* Branch Sub-view Toggle */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-center font-bold text-[11px]">
            <button
              type="button"
              onClick={() => setBranchSubView('metrics')}
              className={`py-1.5 rounded-xl transition ${
                branchSubView === 'metrics' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setBranchSubView('seats')}
              className={`py-1.5 rounded-xl transition ${
                branchSubView === 'seats' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              Seat Map
            </button>
            <button
              type="button"
              onClick={() => setBranchSubView('students')}
              className={`py-1.5 rounded-xl transition ${
                branchSubView === 'students' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              Students
            </button>
          </div>

          {/* Sub-view 1: Branch Metrics */}
          {branchSubView === 'metrics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Net Earnings</span>
                  <div className="text-lg font-black text-emerald-400">
                    ₹{metrics?.totalOwnerEarnings || 0}
                  </div>
                  <span className="text-[9px] text-slate-500">This branch</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Today's Payout</span>
                  <div className="text-lg font-black text-white">₹{metrics?.todayEarnings || 0}</div>
                  <span className="text-[9px] text-slate-500">Live</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Live Occupancy</span>
                  <div className="text-lg font-black text-blue-400">
                    {metrics?.occupancyRate || 0}%
                  </div>
                  <span className="text-[9px] text-slate-500">Desks occupied</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Total Desks</span>
                  <div className="text-lg font-black text-white">{selectedBranch.totalSeats}</div>
                  <span className="text-[9px] text-slate-500">Capacity</span>
                </div>
              </div>

              {/* Pricing & Memberships Info */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="font-extrabold text-white text-xs block">Pricing Plans</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Hourly</span>
                    <span className="font-bold text-blue-400">₹{selectedBranch.hourlyRate}/h</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Monthly</span>
                    <span className="font-bold text-amber-400">
                      {selectedBranch.enableMembership !== false && selectedBranch.enableMonthly !== false
                        ? `₹${selectedBranch.monthlyRate || 1200}/m`
                        : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Yearly VIP</span>
                    <span className="font-bold text-purple-400">
                      {selectedBranch.enableMembership !== false && selectedBranch.enableYearly !== false
                        ? `₹${selectedBranch.yearlyRate || 12000}/y`
                        : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 2: Interactive Seat Map */}
          {branchSubView === 'seats' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Branch Visual Seat Map</span>
                <span className="text-[10px] text-slate-400">Tap desk to toggle active</span>
              </div>

              {selectedBranch.seatZones && selectedBranch.seatZones.length > 0 ? (
                selectedBranch.seatZones.map((zone) => (
                  <div key={zone.id} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <span className="font-bold text-white text-xs">{zone.name}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {zone.seats?.map((seat) => (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => handleToggleSeat(seat.id)}
                          className={`p-2 rounded-xl border text-center transition active:scale-95 cursor-pointer ${
                            seat.status === 'AVAILABLE'
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                              : seat.status === 'BOOKED'
                              ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="font-mono font-bold text-xs">{seat.seatNumber}</div>
                          <div className="text-[9px] mt-0.5 opacity-80">{seat.status}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                  <Armchair className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p>All {selectedBranch.totalSeats} desks are configured in standard grid layout.</p>
                </div>
              )}
            </div>
          )}

          {/* Sub-view 3: Student Directory */}
          {branchSubView === 'students' && (
            <div className="space-y-2.5">
              <span className="font-bold text-white text-xs block">
                Student Directory & Access Records • {selectedBranch.lid || 'LID'}
              </span>

              {allBookings.filter((b) => b.libraryId === selectedBranch.id).length === 0 ? (
                <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                  <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p>No active students registered at this branch yet.</p>
                </div>
              ) : (
                allBookings
                  .filter((b) => b.libraryId === selectedBranch.id)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-white">{b.user?.name}</h4>
                        <p className="text-[10px] text-slate-400">{b.user?.phone}</p>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">
                          {b.bookingCode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold text-xs">
                          {b.seat?.seatNumber}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          {b.bookingType}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      );
    }

    // Default: Show all 5 Branches Cards
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Locations Directory</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Your Libraries</h2>
          </div>

          {libraries.length < 5 && (
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-md shadow-blue-600/30 text-[11px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </button>
          )}
        </div>

        {/* 5-Branch Limit Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
          <span className="text-slate-400">Master Capacity:</span>
          <span className="font-bold text-amber-400">{libraries.length} / 5 Branches Added</span>
        </div>

        {/* Branches Cards */}
        <div className="space-y-3">
          {libraries.map((branch) => {
            const isUnlocked = unlockedBranchIds.includes(branch.id);
            return (
              <div
                key={branch.id}
                onClick={() => handleBranchClick(branch)}
                className={`p-4 rounded-3xl border bg-slate-900 shadow-xl space-y-3 cursor-pointer transition active:scale-[0.98] ${
                  isUnlocked ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-800'
                }`}
              >
                {/* Top Badge & Status */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-xs">
                    {branch.lid || 'LID-101'}
                  </span>

                  <span
                    className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      branch.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : branch.status === 'PENDING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {branch.status === 'APPROVED' ? 'Live & Approved' : branch.status || 'Pending'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white">{branch.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    📍 {branch.address}, {branch.city}
                  </p>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-slate-800/80">
                  <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Total Desks</span>
                    <span className="font-bold text-white">{branch.totalSeats}</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Hourly Rate</span>
                    <span className="font-bold text-blue-400">₹{branch.hourlyRate}/h</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Monthly</span>
                    <span className="font-bold text-amber-400">₹{branch.monthlyRate || 1200}</span>
                  </div>
                </div>

                {/* Lock Status Footer */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Console Unlocked</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Tap to unlock with 6-digit PIN</span>
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Security PIN Modal */}
        <MobileSecurityPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          mode={hasPin ? 'VERIFY' : 'SETUP'}
          targetLibraryName={pinTargetBranch?.name}
          onSuccess={() => {
            if (pinTargetBranch) {
              setUnlockedBranchIds((prev) => Array.from(new Set([...prev, pinTargetBranch.id])));
              setSelectedBranch(pinTargetBranch);
              setBranchSubView('metrics');
            }
            setHasPin(true);
            setIsPinModalOpen(false);
          }}
        />

        {/* Add Branch Modal */}
        <MobileBranchModal
          isOpen={isAddBranchOpen}
          onClose={() => setIsAddBranchOpen(false)}
          onSuccess={() => fetchOwnerData()}
        />
      </div>
    );
  }

  // =========================================================================
  // TAB 4: OWNER ATTENDANCE (DAY-BY-DAY GROUPED FOLDERS)
  // =========================================================================
  if (activeTab === 'owner_attendance') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Security Desk</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Daily Attendance</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Validate Pass</span>
          </button>
        </div>

        {/* Manual Pass Code Quick Verification Bar */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase block">
            Instant Pass Check-In (Code or Camera)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Enter Booking Pass Code..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleVerifyAndCheckIn(manualCode)}
              disabled={verifyingCode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {verifyingCode ? 'Recording...' : 'Record Entry'}
            </button>
          </div>
        </div>

        {/* Day-by-Day Folders List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-white text-xs">Attendance History by Date</span>
            <span className="text-[10px] text-slate-400">
              {groupedAttendance.length} recorded days
            </span>
          </div>

          {groupedAttendance.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No Attendance Records Yet</p>
              <p className="text-[11px] text-slate-400">
                When a student scans their QR code at the desk, today's attendance record will be
                automatically created here.
              </p>
            </div>
          ) : (
            groupedAttendance.map((group) => {
              const isExpanded = expandedDates.includes(group.date);

              return (
                <div
                  key={group.date}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition"
                >
                  {/* Date Folder Header */}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedDates((prev) =>
                        prev.includes(group.date)
                          ? prev.filter((d) => d !== group.date)
                          : [...prev, group.date]
                      );
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl border ${
                          group.isToday
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-xs">{group.date}</span>
                          {group.isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[9px] uppercase tracking-wider">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {group.count} student{group.count === 1 ? '' : 's'} checked in
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-xl bg-slate-950 text-white font-mono font-bold text-[10px] border border-slate-800">
                        {group.count} Present
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Student List */}
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                      {group.items.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                              {log.user?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <h5 className="font-bold text-white text-xs leading-tight">
                                {log.user?.name || 'Student'}
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                {log.user?.phone || log.library?.name}
                              </p>
                              <span className="text-[9px] text-indigo-400 font-mono">
                                Pass: {log.booking?.bookingCode || log.bookingId}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold text-[10px]">
                              {log.seatNumber || 'Desk'}
                            </span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end font-semibold mt-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              <span>
                                {new Date(log.checkInTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Scanner Modal */}
        <MobileScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          selectedLibraryId={libraries[0]?.id}
          onCheckInSuccess={() => fetchOwnerData()}
        />
      </div>
    );
  }

  // =========================================================================
  // TAB 5: OWNER PROFILE & PIN SETTINGS
  // =========================================================================
  return (
    <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
      {/* Hidden File Input for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Card Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          {/* Avatar with Camera Button */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-slate-800 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-md border border-slate-950 transition active:scale-90 cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800">
                Library Owner
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">{user.email}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{libraries.length} Branches Managed</p>
          </div>
        </div>

        {/* Master PIN Status */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2 text-slate-300">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>
              <strong>6-Digit Master PIN:</strong> {hasPin ? 'Configured & Active' : 'Not Set'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="text-amber-400 font-bold hover:underline"
          >
            {hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>

      {/* Account Details Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          Partner Account Details
        </h3>
        <div className="space-y-2 text-slate-300">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Business Name</span>
            <span className="font-semibold text-white">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Registered Email</span>
            <span className="font-semibold text-white">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Branches Limit</span>
            <span className="font-semibold text-amber-400">{libraries.length} of 5 Active</span>
          </div>
        </div>
      </div>

      {/* Navigation Actions Menu */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl divide-y divide-slate-800/80">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Update Profile Photo</span>
              <span className="text-[10px] text-slate-400">Change partner photo from device</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          type="button"
          onClick={() => setIsPinModalOpen(true)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Security PIN Configuration</span>
              <span className="text-[10px] text-slate-400">
                Setup or reset your 6-digit branch PIN
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to log out of the Owner Console?')) {
              logout();
              toast.success('Owner session signed out.');
            }
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-rose-950/20 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-rose-300 block">Log Out</span>
              <span className="text-[10px] text-slate-500">Sign out of owner console</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Security PIN Modal */}
      <MobileSecurityPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        mode={hasPin ? 'VERIFY' : 'SETUP'}
        targetLibraryName={libraries[0]?.name}
        onSuccess={() => {
          setHasPin(true);
          setIsPinModalOpen(false);
          toast.success('Security PIN verified / configured! 🔒');
        }}
      />
    </div>
  );
};

export default MobileOwnerScreen;
