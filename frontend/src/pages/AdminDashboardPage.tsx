import React, { useState, useEffect } from 'react';
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
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [allLibraries, setAllLibraries] = useState<Library[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [subAdmins, setSubAdmins] = useState<SubAdminRecord[]>([]);
  const [perLibraryStats, setPerLibraryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Sub-Admin vs Master Admin detection
  const isSubAdmin = user?.adminType === 'SUB_ADMIN';
  const assignedState = user?.assignedState || '';

  // Tab State: default to 'queue'
  const [activeTab, setActiveTab] = useState<string>('queue');

  // Search / Filter
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

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (isSubAdmin) {
        // Sub-Admin API calls (state-scoped by backend)
        const [statsRes, pendingRes, allLibsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/libraries?status=PENDING'),
          api.get('/admin/libraries?status=ALL'),
          api.get('/admin/users'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
          if (statsRes.data.perLibraryStats) {
            setPerLibraryStats(statsRes.data.perLibraryStats);
          }
        }
        if (pendingRes.data.success) setPendingLibraries(pendingRes.data.libraries);
        if (allLibsRes.data.success) setAllLibraries(allLibsRes.data.libraries);
        if (usersRes.data.success) setUsersList(usersRes.data.users);
      } else {
        // Master Admin API calls (Pan-India)
        const [statsRes, pendingRes, forwardedRes, pendingOwnersRes, allLibsRes, usersRes, subAdminsRes] =
          await Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/libraries?status=PENDING'),
            api.get('/admin/libraries?status=FORWARDED_TO_MASTER'),
            api.get('/admin/owners/pending'),
            api.get('/admin/libraries?status=ALL'),
            api.get('/admin/users'),
            api.get('/admin/sub-admins'),
          ]);

        if (statsRes.data.success) setStats(statsRes.data.stats);
        if (pendingRes.data.success) setPendingLibraries(pendingRes.data.libraries);
        if (forwardedRes.data.success) setForwardedLibraries(forwardedRes.data.libraries);
        if (pendingOwnersRes.data.success) setPendingOwners(pendingOwnersRes.data.owners);
        if (allLibsRes.data.success) setAllLibraries(allLibsRes.data.libraries);
        if (usersRes.data.success) setUsersList(usersRes.data.users);
        if (subAdminsRes.data.success) setSubAdmins(subAdminsRes.data.subAdmins);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAdminData();
    }
  }, [user, isSubAdmin]);

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

  const handleApproveOwner = async (id: string) => {
    try {
      const res = await api.patch(`/admin/owners/${id}/approve`);
      if (res.data.success) {
        alert(res.data.message);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve owner');
    }
  };

  const handleRejectOwner = async (id: string) => {
    if (!confirm('Are you sure you want to reject this Library Owner application?')) return;
    try {
      const res = await api.patch(`/admin/owners/${id}/reject`);
      if (res.data.success) {
        alert(res.data.message);
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

  // Filtered Directory
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
                  src={user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=Admin'}
                  alt={user.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span>Signed in as {user.name}</span>
                <span className="text-[10px] text-purple-600 font-extrabold underline ml-1">Profile</span>
              </button>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
              {isSubAdmin
                ? `${assignedState} State Console • Governance & Revenue`
                : 'LibSpace Central Governance & Operations'}
            </h1>
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
        {/* KPI Metrics Dashboard */}
        {isSubAdmin ? (
          /* Sub-Admin State-Scoped KPIs */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                State GMV ({assignedState})
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                ₹{stats?.totalGMV?.toLocaleString() || 0}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {stats?.totalBookings || 0} Total Bookings in {assignedState}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                State Platform Fee
              </span>
              <div className="text-2xl font-extrabold text-blue-600">
                ₹{stats?.platformCommissionEarned?.toLocaleString() || 0}
              </div>
              <span className="text-[11px] text-slate-400">10% Platform share</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                State Approved Libraries
              </span>
              <div className="text-2xl font-extrabold text-emerald-600">
                {stats?.totalApprovedLibraries || 0}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {stats?.totalDesks || 0} Total Desks Capacity
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Pending State Approvals
              </span>
              <div className="text-2xl font-extrabold text-amber-600">
                {stats?.pendingApprovals || 0}
              </div>
              <span className="text-[11px] text-slate-400">
                {stats?.forwardedApprovals || 0} Escalated to Master
              </span>
            </div>
          </div>
        ) : (
          /* Master Admin Pan-India KPIs */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Pan-India Total GMV
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                ₹{stats?.totalGMV?.toLocaleString() || 0}
              </div>
              <span className="text-[11px] text-slate-400">
                {stats?.totalBookings || 0} Bookings nationwide
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Platform Commission
              </span>
              <div className="text-2xl font-extrabold text-purple-600">
                ₹{stats?.platformCommissionEarned?.toLocaleString() || 0}
              </div>
              <span className="text-[11px] text-slate-400">Net platform revenue</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Approved Libraries
              </span>
              <div className="text-2xl font-extrabold text-emerald-600">
                {stats?.totalApprovedLibraries || 0}
              </div>
              <span className="text-[11px] text-amber-600 font-semibold">
                {stats?.pendingApprovals || 0} Pending Review
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Escalated Queue
              </span>
              <div className="text-2xl font-extrabold text-rose-600">
                {stats?.forwardedToMasterCount || 0}
              </div>
              <span className="text-[11px] text-rose-500 font-medium">
                Needs Master Action
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                State Sub-Admins
              </span>
              <div className="text-2xl font-extrabold text-blue-600">
                {subAdmins.length} / {SUPPORTED_STATES.length}
              </div>
              <span className="text-[11px] text-slate-400">
                1 Admin per State
              </span>
            </div>
          </div>
        )}

        {/* Tab Controls */}
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
                📋 State Verification Queue ({pendingLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'breakdown'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 State Libraries & Revenue Breakdown ({perLibraryStats.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'users'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 State Users & Owners ({usersList.length})
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
                📋 Pan-India Verification Queue ({pendingLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('owners')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'owners'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Owner Approvals ({pendingOwners.length})
              </button>
              <button
                onClick={() => setActiveTab('libraries')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'libraries'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 All Libraries & Revenue ({allLibraries.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'users'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 Users ({usersList.length})
              </button>
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: FORWARDED TO MASTER (Master Admin Only) */}
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
        {/* TAB 2: STATE SUB-ADMINS (Master Admin Only) */}
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
        {/* TAB 3: VERIFICATION QUEUE (Sub-Admin & Master Admin) */}
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
        {/* TAB 4: STATE LIBRARIES & REVENUE BREAKDOWN (Sub-Admin) */}
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
        {/* TAB 5: ALL LIBRARIES DIRECTORY & REVENUE (Master Admin) */}
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

        {/* ======================================================== */}
        {/* TAB 6: OWNER APPROVALS (Master Admin Only) */}
        {/* ======================================================== */}
        {!isSubAdmin && activeTab === 'owners' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" />
              Library Owners Awaiting Admin Approval
            </h2>

            {pendingOwners.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">All Owners Approved!</h3>
                <p className="text-xs text-slate-400">No new library owners pending verification.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOwners.map((owner) => (
                  <div
                    key={owner.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{owner.name}</h3>
                        <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                          PENDING VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Email: <strong>{owner.email}</strong> • Phone: {owner.phone || 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Submitted on: {new Date(owner.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleApproveOwner(owner.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Approve Owner
                      </button>
                      <button
                        onClick={() => handleRejectOwner(owner.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: USERS DIRECTORY */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>{isSubAdmin ? `Users in ${assignedState}` : 'Registered Platform Users'}</span>
              <span className="text-xs font-medium text-slate-400">
                Total: {usersList.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{u.name}</span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.adminType && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {u.adminType}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'OWNER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORWARD TO MASTER ADMIN (Sub-Admin Only) */}
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
      {/* MODAL 2: CREATE STATE SUB-ADMIN (Master Admin Only) */}
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
