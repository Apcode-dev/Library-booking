import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Library, User } from '../types';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Building,
  AlertCircle,
  Check,
  X,
  Send,
  UserPlus,
  MapPin,
  Trash2,
  ShieldAlert,
  FileText,
  BadgeAlert,
  Search,
  ExternalLink,
  Filter,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  UserX,
} from 'lucide-react';

import AuthModal from '../components/common/AuthModal';
import ProfileModal from '../components/common/ProfileModal';

const SUPPORTED_STATES = [
  'Uttar Pradesh',
  'Rajasthan',
  'Delhi',
  'Bihar',
  'Maharashtra',
  'Haryana',
];

interface SubAdminRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assignedState: string;
  createdAt: string;
  librariesCount: number;
  pendingCount: number;
  totalRevenue: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Core Data States
  const [stats, setStats] = useState<any>(null);
  const [pendingLibraries, setPendingLibraries] = useState<Library[]>([]);
  const [forwardedLibraries, setForwardedLibraries] = useState<Library[]>([]);
  const [allLibraries, setAllLibraries] = useState<Library[]>([]);
  const [subAdmins, setSubAdmins] = useState<SubAdminRecord[]>([]);
  const [perLibraryStats, setPerLibraryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ========================================================
  // USER MANAGEMENT STATE
  // ========================================================
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });
  const [userSearch, setUserSearch] = useState('');
  const [userActivityFilter, setUserActivityFilter] = useState<'ALL' | 'WITH_BOOKINGS' | 'NO_BOOKINGS'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [usersLoading, setUsersLoading] = useState(false);

  // User Booking History Modal
  const [selectedUserForBookings, setSelectedUserForBookings] = useState<User | null>(null);
  const [userBookingsModalOpen, setUserBookingsModalOpen] = useState(false);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userBookingsLoading, setUserBookingsLoading] = useState(false);

  // ========================================================
  // OWNER MANAGEMENT STATE
  // ========================================================
  const [ownersList, setOwnersList] = useState<User[]>([]);
  const [ownersPagination, setOwnersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerStatusFilter, setOwnerStatusFilter] = useState('ALL');
  const [ownerLibrariesFilter, setOwnerLibrariesFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerLimit, setOwnerLimit] = useState(10);
  const [ownersLoading, setOwnersLoading] = useState(false);

  // Owner's Libraries Modal
  const [selectedOwnerForLibraries, setSelectedOwnerForLibraries] = useState<User | null>(null);
  const [ownerLibrariesModalOpen, setOwnerLibrariesModalOpen] = useState(false);

  // State Sub-Admin vs Master Admin detection
  const isSubAdmin = user?.adminType === 'SUB_ADMIN';
  const assignedState = user?.assignedState || '';

  // Tab State: default to 'queue'
  const [activeTab, setActiveTab] = useState<string>('queue');

  // Search / Filter for Libraries Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Forward Modal State (For Sub-Admin escalating to Master)
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [libraryToForward, setLibraryToForward] = useState<Library | null>(null);
  const [forwardReason, setForwardReason] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);

  // Create Sub-Admin Modal State (For Master Admin)
  const [isCreateSubAdminModalOpen, setIsCreateSubAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminState, setNewAdminState] = useState(SUPPORTED_STATES[0]);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');

  // Fetch Core Admin Data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (isSubAdmin) {
        // Sub-Admin API calls (state-scoped by backend)
        const [statsRes, pendingRes, allLibsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/libraries?status=PENDING'),
          api.get('/admin/libraries?status=ALL'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
          if (statsRes.data.perLibraryStats) {
            setPerLibraryStats(statsRes.data.perLibraryStats);
          }
        }
        if (pendingRes.data.success) setPendingLibraries(pendingRes.data.libraries);
        if (allLibsRes.data.success) setAllLibraries(allLibsRes.data.libraries);
      } else {
        // Master Admin API calls (Pan-India)
        const [statsRes, pendingRes, forwardedRes, allLibsRes, subAdminsRes] =
          await Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/libraries?status=PENDING'),
            api.get('/admin/libraries?status=FORWARDED_TO_MASTER'),
            api.get('/admin/libraries?status=ALL'),
            api.get('/admin/sub-admins'),
          ]);

        if (statsRes.data.success) setStats(statsRes.data.stats);
        if (pendingRes.data.success) setPendingLibraries(pendingRes.data.libraries);
        if (forwardedRes.data.success) setForwardedLibraries(forwardedRes.data.libraries);
        if (allLibsRes.data.success) setAllLibraries(allLibsRes.data.libraries);
        if (subAdminsRes.data.success) setSubAdmins(subAdminsRes.data.subAdmins);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Users with Server-Side Pagination & Filters
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: userLimit.toString(),
        search: userSearch,
        activity: userActivityFilter,
        status: userStatusFilter,
        role: 'USER',
      });

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data.success) {
        setUsersList(res.data.users);
        setUsersPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userLimit, userSearch, userActivityFilter, userStatusFilter]);

  // Fetch Owners with Server-Side Pagination & Filters
  const fetchOwners = useCallback(async () => {
    setOwnersLoading(true);
    try {
      const params = new URLSearchParams({
        page: ownerPage.toString(),
        limit: ownerLimit.toString(),
        search: ownerSearch,
        status: ownerStatusFilter,
        hasLibraries: ownerLibrariesFilter,
      });

      const res = await api.get(`/admin/owners?${params.toString()}`);
      if (res.data.success) {
        setOwnersList(res.data.owners);
        setOwnersPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch owners', err);
    } finally {
      setOwnersLoading(false);
    }
  }, [ownerPage, ownerLimit, ownerSearch, ownerStatusFilter, ownerLibrariesFilter]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAdminData();
    }
  }, [user, isSubAdmin]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab, fetchUsers]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && activeTab === 'owners') {
      fetchOwners();
    }
  }, [user, activeTab, fetchOwners]);

  // View User Booking History
  const handleViewUserBookings = async (targetUser: User) => {
    setSelectedUserForBookings(targetUser);
    setUserBookingsModalOpen(true);
    setUserBookingsLoading(true);
    try {
      const res = await api.get(`/admin/users/${targetUser.id}/bookings`);
      if (res.data.success) {
        setUserBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch user bookings', err);
    } finally {
      setUserBookingsLoading(false);
    }
  };

  // View Owner's Listed Libraries
  const handleViewOwnerLibraries = (targetOwner: User) => {
    setSelectedOwnerForLibraries(targetOwner);
    setOwnerLibrariesModalOpen(true);
  };

  // Actions
  const handleApprove = async (id: string) => {
    try {
      const res = await api.patch(`/admin/libraries/${id}/approve`);
      if (res.data.success) {
        alert(res.data.message);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve library');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter reason for rejection:');
    if (reason === null) return;

    try {
      const res = await api.patch(`/admin/libraries/${id}/reject`, { reason });
      if (res.data.success) {
        alert(res.data.message);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject library');
    }
  };

  // Open Forward Modal
  const openForwardModal = (lib: Library) => {
    setLibraryToForward(lib);
    setForwardReason('');
    setIsForwardModalOpen(true);
  };

  const handleConfirmForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryToForward) return;
    if (!forwardReason.trim()) {
      alert('Please provide a reason for forwarding to Master Admin.');
      return;
    }

    setForwardLoading(true);
    try {
      const res = await api.patch(`/admin/libraries/${libraryToForward.id}/forward`, {
        reason: forwardReason.trim(),
      });
      if (res.data.success) {
        alert(`Library "${libraryToForward.name}" successfully forwarded to Master Admin!`);
        setIsForwardModalOpen(false);
        setLibraryToForward(null);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to forward library');
    } finally {
      setForwardLoading(false);
    }
  };

  // Create Sub-Admin (Master Admin only)
  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminError('');

    if (!newAdminName || !newAdminEmail || !newAdminPassword || !newAdminState) {
      setCreateAdminError('All fields are required.');
      return;
    }

    setCreateAdminLoading(true);
    try {
      const res = await api.post('/admin/sub-admins', {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        phone: newAdminPhone.trim() || undefined,
        assignedState: newAdminState,
      });

      if (res.data.success) {
        alert(res.data.message);
        setIsCreateSubAdminModalOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        setNewAdminPhone('');
        fetchAdminData();
      }
    } catch (err: any) {
      setCreateAdminError(err.response?.data?.message || 'Failed to create Sub-Admin');
    } finally {
      setCreateAdminLoading(false);
    }
  };

  // Delete Sub-Admin (Master Admin only)
  const handleDeleteSubAdmin = async (id: string, state: string, adminName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${adminName} as State Administrator for ${state}?`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/admin/sub-admins/${id}`);
      if (res.data.success) {
        alert(res.data.message);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete sub-admin');
    }
  };

  // Approve Owner
  const handleApproveOwner = async (id: string) => {
    try {
      const res = await api.patch(`/admin/owners/${id}/approve`);
      if (res.data.success) {
        alert(res.data.message);
        fetchOwners();
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve owner');
    }
  };

  // Reject Owner
  const handleRejectOwner = async (id: string) => {
    if (!confirm('Are you sure you want to reject this Library Owner application?')) return;
    try {
      const res = await api.patch(`/admin/owners/${id}/reject`);
      if (res.data.success) {
        alert(res.data.message);
        fetchOwners();
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject owner');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <ShieldCheck className="w-12 h-12 text-purple-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Platform Admin Portal</h2>
        <p className="text-xs text-slate-500">
          This section is restricted to Platform Administrators. Please sign in or register with your Admin credentials.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
        >
          🛡️ Sign In as Administrator
        </button>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultRole="ADMIN"
        />
      </div>
    );
  }

  // Filtered Libraries Directory
  const filteredLibraries = (isSubAdmin ? perLibraryStats : allLibraries).filter((lib) => {
    const matchesSearch =
      lib.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lib.city && lib.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lib.lid && lib.lid.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState = stateFilter === 'ALL' || lib.state === stateFilter;
    return matchesSearch && matchesState;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link to="/" title="LibSpace Home">
              <img
                src="/images/libspace-logo.png"
                alt="LibSpace Official Logo"
                className="w-12 h-12 rounded-2xl object-contain shadow-xs hover:scale-105 transition"
              />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
              {isSubAdmin ? (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  State Administrator • {assignedState}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-extrabold border border-purple-200 flex items-center gap-1.5">
                  👑 Master Administrator (Pan-India Authority)
                </span>
              )}

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 font-bold bg-slate-100 hover:bg-purple-50 px-2.5 py-1 rounded-full border border-slate-200 transition cursor-pointer"
              >
                <img
                  src={user?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=Admin'}
                  alt={user?.name || 'Administrator'}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span>Signed in as {user?.name || 'Administrator'}</span>
                <span className="text-[10px] text-purple-600 font-extrabold underline ml-1">Profile</span>
              </button>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
              {isSubAdmin
                ? `${assignedState} State Console • Governance & Revenue`
                : 'LibSpace Central Governance & Operations'}
            </h1>
          </div>
        </div>

          <div className="flex items-center gap-3">
            {!isSubAdmin && (
              <button
                onClick={() => setIsCreateSubAdminModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                + Add State Admin
              </button>
            )}

            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Platform
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ======================================================== */}
        {/* SUMMARY STATISTICS DASHBOARD CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Total Registered Users */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Students / Users
              </span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.totalRegisteredUsers ?? stats?.totalUsers ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {stats?.usersWithBookings || 0} active • {stats?.usersWithoutBookings || 0} browsing
            </span>
          </div>

          {/* 2. Total Library Owners */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Library Owners
              </span>
              <Building className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.totalLibraryOwners || 0}
            </div>
            <span className="text-[11px] text-amber-600 font-medium block truncate">
              {stats?.approvedOwners || 0} approved • {stats?.pendingOwners || 0} pending
            </span>
          </div>

          {/* 3. Total GMV */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isSubAdmin ? 'State GMV' : 'Total GMV'}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹{stats?.totalGMV?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {stats?.totalBookings || 0} Total Bookings
            </span>
          </div>

          {/* 4. Platform Fee */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Platform Commission
              </span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600">
              ₹{stats?.platformCommissionEarned?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-400 block truncate">10% Platform Revenue</span>
          </div>

          {/* 5. Approved Libraries */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Libraries
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {stats?.totalApprovedLibraries || 0}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold block truncate">
              {stats?.pendingApprovals || 0} Pending Review
            </span>
          </div>

          {/* 6. State Admins / Escalated Queue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isSubAdmin ? 'Escalations' : 'State Admins'}
              </span>
              {isSubAdmin ? (
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              ) : (
                <Users className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="text-2xl font-black text-slate-900">
              {isSubAdmin
                ? stats?.forwardedApprovals || 0
                : `${subAdmins.length} / ${SUPPORTED_STATES.length}`}
            </div>
            <span className="text-[11px] text-slate-400 block truncate">
              {isSubAdmin ? 'Forwarded to Master' : '1 Sub-Admin per State'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB CONTROLS */}
        {/* ======================================================== */}
        <div className="flex flex-wrap bg-slate-200/80 p-1 rounded-2xl gap-1">
          {/* Sub-Admin Tabs */}
          {isSubAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'queue'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 State Approvals ({pendingLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'breakdown'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 State Libraries & Revenue ({perLibraryStats.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                👥 User Management
              </button>
              <button
                onClick={() => setActiveTab('owners')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'owners'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-amber-600" />
                🏢 Owner Management
              </button>
            </>
          ) : (
            /* Master Admin Tabs */
            <>
              <button
                onClick={() => setActiveTab('forwarded')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'forwarded'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BadgeAlert className="w-3.5 h-3.5 text-rose-500" />
                🚨 Forwarded to Master ({forwardedLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('subadmins')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'subadmins'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                🏛️ State Sub-Admins ({subAdmins.length})
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'queue'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Pan-India Queue ({pendingLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('libraries')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'libraries'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 Libraries & Revenue ({allLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                👥 User Management
              </button>
              <button
                onClick={() => setActiveTab('owners')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'owners'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-amber-600" />
                🏢 Owner Management
              </button>
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: USER MANAGEMENT (With Search, Filter, Server-Side Pagination & Booking History) */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Header & Sub-Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  User Management (Registered Students & Members)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete directory of all registered users, including active bookers and users who have never booked.
                </p>
              </div>

              {/* Badges Overview */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                  Total Users: {usersPagination.totalCount}
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  Active Bookers: {stats?.usersWithBookings || 0}
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                  Zero Bookings: {stats?.usersWithoutBookings || 0}
                </span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Activity Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-500">Activity:</span>
                  <select
                    value={userActivityFilter}
                    onChange={(e: any) => {
                      setUserActivityFilter(e.target.value);
                      setUserPage(1);
                    }}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Users (With & Without Bookings)</option>
                    <option value="WITH_BOOKINGS">Active Bookers (Bookings ≥ 1)</option>
                    <option value="NO_BOOKINGS">Zero Bookings (Never Booked)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-500">Status:</span>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => {
                      setUserStatusFilter(e.target.value);
                      setUserPage(1);
                    }}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Active / Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Suspended / Rejected</option>
                  </select>
                </div>

                {/* Limit Selector */}
                <select
                  value={userLimit}
                  onChange={(e) => {
                    setUserLimit(Number(e.target.value));
                    setUserPage(1);
                  }}
                  className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Student Profile</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Registration Date</th>
                      <th className="py-3.5 px-4 text-center">Account Status</th>
                      <th className="py-3.5 px-4 text-center">Total Bookings</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                          Loading users from database...
                        </td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No registered users found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                                alt={u.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <span className="font-bold text-slate-900 text-xs block">{u.name}</span>
                                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                                  STUDENT
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="text-slate-800 font-mono text-[11px] block">{u.email}</span>
                              <span className="text-slate-500 text-[11px] block">{u.phone || 'No phone registered'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {u.createdAt ? (
                              <div>
                                <span className="font-medium text-slate-800 block">
                                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                u.approvalStatus === 'APPROVED' || u.isApproved !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : u.approvalStatus === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.approvalStatus || (u.isApproved !== false ? 'ACTIVE' : 'PENDING')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {(u.totalBookings || 0) > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                                {u.totalBookings} Bookings
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium text-[11px]">
                                0 Bookings
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleViewUserBookings(u)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-blue-200"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              View Bookings ({u.totalBookings || 0})
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Bar */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <strong>
                    {usersPagination.totalCount === 0
                      ? 0
                      : (usersPagination.currentPage - 1) * usersPagination.limit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {Math.min(
                      usersPagination.currentPage * usersPagination.limit,
                      usersPagination.totalCount
                    )}
                  </strong>{' '}
                  of <strong>{usersPagination.totalCount}</strong> registered users
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={usersPagination.currentPage <= 1 || usersLoading}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-700">
                    Page {usersPagination.currentPage} of {usersPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={
                      usersPagination.currentPage >= usersPagination.totalPages || usersLoading
                    }
                    onClick={() => setUserPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: OWNER MANAGEMENT (With Search, Filter, Server-Side Pagination & Listed Libraries) */}
        {/* ======================================================== */}
        {activeTab === 'owners' && (
          <div className="space-y-4">
            {/* Header & Sub-Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-600" />
                  Owner Management (Library Space Partners)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete directory of all registered library owners, including newly registered owners who have not listed any libraries yet.
                </p>
              </div>

              {/* Badges Overview */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  Total Owners: {ownersPagination.totalCount}
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  Approved: {stats?.approvedOwners || 0}
                </span>
                <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  Pending Verification: {stats?.pendingOwners || 0}
                </span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by owner name, email, phone..."
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value);
                    setOwnerPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Approval Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-500">Status:</span>
                  <select
                    value={ownerStatusFilter}
                    onChange={(e) => {
                      setOwnerStatusFilter(e.target.value);
                      setOwnerPage(1);
                    }}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">All Verification Statuses</option>
                    <option value="APPROVED">Approved & Verified</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Libraries Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-500">Libraries:</span>
                  <select
                    value={ownerLibrariesFilter}
                    onChange={(e: any) => {
                      setOwnerLibrariesFilter(e.target.value);
                      setOwnerPage(1);
                    }}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">All Owners (With & Without Libraries)</option>
                    <option value="YES">Has Listed Libraries (≥ 1)</option>
                    <option value="NO">No Libraries Listed (0)</option>
                  </select>
                </div>

                {/* Limit Selector */}
                <select
                  value={ownerLimit}
                  onChange={(e) => {
                    setOwnerLimit(Number(e.target.value));
                    setOwnerPage(1);
                  }}
                  className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* Owners Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Owner Profile</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Registration Date</th>
                      <th className="py-3.5 px-4 text-center">Verification Status</th>
                      <th className="py-3.5 px-4 text-center">Libraries Listed</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ownersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                          Loading owners from database...
                        </td>
                      </tr>
                    ) : ownersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No library owners found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      ownersList.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={o.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(o.name)}`}
                                alt={o.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <span className="font-bold text-slate-900 text-xs block">{o.name}</span>
                                <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">
                                  LIBRARY OWNER
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="text-slate-800 font-mono text-[11px] block">{o.email}</span>
                              <span className="text-slate-500 text-[11px] block">{o.phone || 'No phone registered'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {o.createdAt ? (
                              <div>
                                <span className="font-medium text-slate-800 block">
                                  {new Date(o.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                o.approvalStatus === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : o.approvalStatus === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {o.approvalStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {(o.librariesCount || 0) > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[11px]">
                                {o.librariesCount} Libraries Listed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium text-[11px]">
                                0 Libraries (New Partner)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {o.approvalStatus === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleApproveOwner(o.id)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition flex items-center gap-1"
                                    title="Approve Owner Account"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectOwner(o.id)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                                    title="Reject Owner Account"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleViewOwnerLibraries(o)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-amber-200"
                              >
                                <Building className="w-3.5 h-3.5" />
                                View Libraries ({o.librariesCount || 0})
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Bar */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <strong>
                    {ownersPagination.totalCount === 0
                      ? 0
                      : (ownersPagination.currentPage - 1) * ownersPagination.limit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {Math.min(
                      ownersPagination.currentPage * ownersPagination.limit,
                      ownersPagination.totalCount
                    )}
                  </strong>{' '}
                  of <strong>{ownersPagination.totalCount}</strong> registered library owners
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={ownersPagination.currentPage <= 1 || ownersLoading}
                    onClick={() => setOwnerPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-700">
                    Page {ownersPagination.currentPage} of {ownersPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={
                      ownersPagination.currentPage >= ownersPagination.totalPages || ownersLoading
                    }
                    onClick={() => setOwnerPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FORWARDED TO MASTER (Master Admin Only) */}
        {/* ======================================================== */}
        {!isSubAdmin && activeTab === 'forwarded' && (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Escalated Library Approvals Queue
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  These libraries were escalated by State Sub-Admins who flagged issues, inconsistencies, or required secondary verification from the Master Administrator.
                </p>
              </div>
            </div>

            {forwardedLibraries.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  No Forwarded Requests Pending!
                </h3>
                <p className="text-xs text-slate-400">
                  All state-escalated verification requests have been resolved.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {forwardedLibraries.map((lib) => (
                  <div
                    key={lib.id}
                    className="bg-white rounded-2xl border-2 border-rose-200 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            {lib.lid || 'NO-LID'}
                          </span>
                          <h3 className="font-black text-slate-900 text-lg">{lib.name}</h3>
                          <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                            ESCALATED TO MASTER
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {lib.address}, {lib.city}, <strong>{lib.state}</strong> (PIN: {lib.pincode})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(lib.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Master Approve
                        </button>
                        <button
                          onClick={() => handleReject(lib.id)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Master Reject
                        </button>
                      </div>
                    </div>

                    {/* Forwarding Reason Alert Box */}
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Sub-Admin Escalation Reason:
                      </div>
                      <p className="text-rose-800 pl-5 font-medium">
                        "{lib.forwardReason || 'Secondary verification requested by state admin.'}"
                      </p>
                    </div>

                    {/* Owner Details */}
                    {lib.owner && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap gap-4 text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Owner Name
                          </span>
                          <strong>{lib.owner.name}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Email
                          </span>
                          <strong>{lib.owner.email}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Phone
                          </span>
                          <strong>{lib.owner.phone || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Hourly Rate
                          </span>
                          <strong>₹{lib.hourlyRate}/hr</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: STATE SUB-ADMINS (Master Admin Only) */}
        {/* ======================================================== */}
        {!isSubAdmin && activeTab === 'subadmins' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  State Administrators Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strict Rule: Exactly ONE Sub-Admin assigned per State. Sub-Admins manage state approvals and monitor state revenue.
                </p>
              </div>

              <button
                onClick={() => setIsCreateSubAdminModalOpen(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                + Create State Sub-Admin
              </button>
            </div>

            {/* State Admins Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Assigned State</th>
                      <th className="py-3.5 px-4">Administrator</th>
                      <th className="py-3.5 px-4">Login Email</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4 text-center">Approved Libraries</th>
                      <th className="py-3.5 px-4 text-center">Pending</th>
                      <th className="py-3.5 px-4 text-right">State Revenue (₹)</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SUPPORTED_STATES.map((st) => {
                      const admin = subAdmins.find((sa) => sa.assignedState === st);
                      return (
                        <tr key={st} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-purple-500" />
                              {st}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {admin ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                                  {admin.name.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-800">{admin.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No admin assigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                            {admin ? admin.email : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {admin?.phone || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                            {admin ? admin.librariesCount : 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {admin ? admin.pendingCount : 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            {admin ? `₹${admin.totalRevenue?.toLocaleString()}` : '₹0'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {admin ? (
                              <button
                                onClick={() => handleDeleteSubAdmin(admin.id, st, admin.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Remove Sub-Admin"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setNewAdminState(st);
                                  setIsCreateSubAdminModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-lg border border-purple-200 transition"
                              >
                                + Assign Admin
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: VERIFICATION QUEUE (Sub-Admin & Master Admin) */}
        {/* ======================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {isSubAdmin
                  ? `Pending Verification Queue (${assignedState})`
                  : 'Pan-India Pending Verification Queue'}
              </h2>
            </div>

            {pendingLibraries.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Verification Queue is Clean!
                </h3>
                <p className="text-xs text-slate-400">
                  No new library submissions pending review in this area.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingLibraries.map((lib) => (
                  <div
                    key={lib.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {lib.lid || 'LID-PENDING'}
                        </span>
                        <h3 className="font-black text-slate-900 text-base">{lib.name}</h3>
                        <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                          PENDING APPROVAL
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {lib.address}, {lib.city}, <strong>{lib.state}</strong> (PIN: {lib.pincode}) • Rate: <strong>₹{lib.hourlyRate}/hr</strong>
                      </p>

                      {Array.isArray(lib.facilities) && lib.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lib.facilities.map((fac, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              ✓ {fac}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 italic">"{lib.description}"</p>

                      {lib.owner && (
                        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-0.5 mt-2">
                          <span className="font-bold text-amber-900 block">
                            🏢 Registered Owner:
                          </span>
                          <div className="text-amber-800">
                            Name: <strong>{lib.owner.name}</strong> • Email: <strong>{lib.owner.email}</strong> • Phone: <strong>{lib.owner.phone || 'N/A'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                      {/* Approve Button */}
                      <button
                        onClick={() => handleApprove(lib.id)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Approve & Launch
                      </button>

                      {/* Reject Button */}
                      <button
                        onClick={() => handleReject(lib.id)}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>

                      {/* Forward to Master Admin (Sub-Admin Only) */}
                      {isSubAdmin && (
                        <button
                          onClick={() => openForwardModal(lib)}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                          title="Escalate to Master Admin if there is any problem or anomaly"
                        >
                          <Send className="w-4 h-4" />
                          Forward to Master Admin
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: STATE LIBRARIES & REVENUE BREAKDOWN (Sub-Admin) */}
        {/* ======================================================== */}
        {isSubAdmin && activeTab === 'breakdown' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  State Library Governance & Revenue Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time financial performance and verification status of all libraries in {assignedState}.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, LID, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">LID</th>
                      <th className="py-3.5 px-4">Library Name & City</th>
                      <th className="py-3.5 px-4">Address</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Desks</th>
                      <th className="py-3.5 px-4 text-center">Bookings</th>
                      <th className="py-3.5 px-4 text-right">Total Revenue (₹)</th>
                      <th className="py-3.5 px-4 text-right">Platform Fee (10%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLibraries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No libraries found in {assignedState}.
                        </td>
                      </tr>
                    ) : (
                      filteredLibraries.map((lib: any) => (
                        <tr key={lib.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {lib.lid || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{lib.name}</span>
                            <span className="text-[11px] text-slate-400">{lib.city}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                            {lib.address}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                lib.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : lib.status === 'FORWARDED_TO_MASTER'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : lib.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {lib.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {lib.totalDesks || lib._count?.seats || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                            {lib.totalBookings || lib._count?.bookings || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            ₹{lib.totalRevenue?.toLocaleString() || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-purple-600">
                            ₹{lib.platformCommission?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: ALL LIBRARIES DIRECTORY & REVENUE (Master Admin) */}
        {/* ======================================================== */}
        {!isSubAdmin && activeTab === 'libraries' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  National Library Directory & Financial Metrics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of all libraries across all states with total revenue, booking counts, and live status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                >
                  <option value="ALL">All States</option>
                  {SUPPORTED_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search libraries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">LID</th>
                      <th className="py-3.5 px-4">Library & State</th>
                      <th className="py-3.5 px-4">Owner Info</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Desks</th>
                      <th className="py-3.5 px-4 text-center">Bookings</th>
                      <th className="py-3.5 px-4 text-right">GMV (₹)</th>
                      <th className="py-3.5 px-4 text-right">Platform Fee (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLibraries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No libraries found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLibraries.map((lib: any) => (
                        <tr key={lib.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {lib.lid || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{lib.name}</span>
                            <span className="text-[11px] text-slate-500">
                              {lib.city}, <strong>{lib.state}</strong>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {lib.owner ? (
                              <div>
                                <span className="font-bold text-slate-800 block">{lib.owner.name}</span>
                                <span className="text-[10px] text-slate-400">{lib.owner.email}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                lib.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : lib.status === 'FORWARDED_TO_MASTER'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : lib.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {lib.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {lib._count?.seats || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                            {lib.totalBookingsCount || lib._count?.bookings || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            ₹{lib.totalRevenue?.toLocaleString() || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-purple-600">
                            ₹{lib.platformCommission?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: USER BOOKING HISTORY MODAL */}
      {/* ======================================================== */}
      {userBookingsModalOpen && selectedUserForBookings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedUserForBookings.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      selectedUserForBookings.name
                    )}`
                  }
                  alt={selectedUserForBookings.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {selectedUserForBookings.name}'s Booking History
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedUserForBookings.email} • {selectedUserForBookings.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserBookingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bookings List Content */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {userBookingsLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Fetching complete booking records...
                </div>
              ) : userBookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-700 text-sm">No Bookings Found</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    This user has registered on LibSpace but has not reserved any desk yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            {b.bookingCode}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {b.library?.name || 'Library Space'}
                          </span>
                          <span className="text-[11px] text-slate-400">({b.library?.city})</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Seat: <strong>{b.seat?.seatNumber || 'Assigned'}</strong> ({b.seat?.seatType || 'STANDARD'}) • Type: <strong>{b.bookingType || 'HOURLY'}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {b.date} • {b.startTime} - {b.endTime}
                        </p>
                      </div>

                      <div className="text-right sm:self-center">
                        <div className="text-base font-black text-slate-900">
                          ₹{b.totalAmount}
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.payment && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {b.payment.paymentMethod} • {b.payment.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Total Bookings Recorded: {userBookings.length}</span>
              <button
                onClick={() => setUserBookingsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: OWNER'S LISTED LIBRARIES MODAL */}
      {/* ======================================================== */}
      {ownerLibrariesModalOpen && selectedOwnerForLibraries && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedOwnerForLibraries.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      selectedOwnerForLibraries.name
                    )}`
                  }
                  alt={selectedOwnerForLibraries.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {selectedOwnerForLibraries.name}'s Listed Libraries
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedOwnerForLibraries.email} • {selectedOwnerForLibraries.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOwnerLibrariesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Libraries List Content */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {!selectedOwnerForLibraries.ownedLibraries ||
              selectedOwnerForLibraries.ownedLibraries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                  <Building className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-700 text-sm">No Libraries Listed Yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    This library owner has registered on LibSpace but has not submitted any library branches yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedOwnerForLibraries.ownedLibraries.map((lib) => (
                    <div
                      key={lib.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                            {lib.lid || 'NO-LID'}
                          </span>
                          <h4 className="font-black text-slate-900 text-sm">{lib.name}</h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              lib.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : lib.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {lib.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {lib.city}, <strong>{lib.state}</strong> • Capacity: <strong>{lib.totalSeats} Desks</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Hourly Rate: <strong>₹{lib.hourlyRate}/hr</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">
                          Listed on {new Date(lib.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total Branches: {selectedOwnerForLibraries.ownedLibraries?.length || 0}
              </span>
              <button
                onClick={() => setOwnerLibrariesModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FORWARD TO MASTER ADMIN (Sub-Admin Only) */}
      {/* ======================================================== */}
      {isForwardModalOpen && libraryToForward && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Forward to Master Admin
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Escalate "{libraryToForward.name}" for secondary review
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsForwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div>
                  <strong>Library:</strong> {libraryToForward.name} ({libraryToForward.lid || 'NO-LID'})
                </div>
                <div>
                  <strong>Location:</strong> {libraryToForward.city}, {libraryToForward.state}
                </div>
                {libraryToForward.owner && (
                  <div>
                    <strong>Owner:</strong> {libraryToForward.owner.name} ({libraryToForward.owner.email})
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmForward} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Escalation / Problem Observed *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe any suspicious documents, incorrect address, rate discrepancy, or reason why Master Admin review is required..."
                    value={forwardReason}
                    onChange={(e) => setForwardReason(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForwardModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forwardLoading}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    {forwardLoading ? 'Escalating...' : 'Confirm Escalation to Master'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CREATE STATE SUB-ADMIN (Master Admin Only) */}
      {/* ======================================================== */}
      {isCreateSubAdminModalOpen && !isSubAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Create State Sub-Admin
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rule: Exactly ONE Administrator per State
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateSubAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createAdminError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{createAdminError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assign State *
                </label>
                <select
                  required
                  value={newAdminState}
                  onChange={(e) => setNewAdminState(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {SUPPORTED_STATES.map((st) => {
                    const existing = subAdmins.find((sa) => sa.assignedState === st);
                    return (
                      <option key={st} value={st} disabled={!!existing}>
                        {st} {existing ? `(Assigned: ${existing.name})` : '✓ Available'}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  States marked with an assigned administrator cannot be duplicated.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Admin Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. up.admin@libspace.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Set Login Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateSubAdminModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdminLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  {createAdminLoading ? 'Generating Admin...' : 'Create Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboardPage;
