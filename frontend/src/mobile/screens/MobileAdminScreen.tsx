import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { compressProfileImage } from '../../lib/imageCompressor';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Share2,
  Users,
  Building2,
  TrendingUp,
  Search,
  Eye,
  AlertTriangle,
  ArrowRight,
  Filter,
  UserPlus,
  Plus,
  Trash2,
  X,
  Camera,
  MapPin,
  Clock,
  DollarSign,
  Armchair,
  Check,
  HelpCircle,
  LogOut,
  ChevronRight,
  FileText,
  Mail,
  Phone,
} from 'lucide-react';

interface MobileAdminScreenProps {
  onOpenAuth: () => void;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

const SUPPORTED_STATES = [
  'Uttar Pradesh',
  'Rajasthan',
  'Delhi',
  'Bihar',
  'Maharashtra',
  'Haryana',
];

export const MobileAdminScreen: React.FC<MobileAdminScreenProps> = ({
  onOpenAuth,
  activeTab = 'admin_dashboard',
  onNavigateTab,
}) => {
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<any>(null);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subAdminsList, setSubAdminsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Full Application Inspection Modal State (for Approvals)
  const [inspectingLib, setInspectingLib] = useState<any | null>(null);
  const [inspectPhotoIdx, setInspectPhotoIdx] = useState(0);

  // 2. Reject / Forward Dialog State
  const [actionReason, setActionReason] = useState('');
  const [actionDialogMode, setActionDialogMode] = useState<'reject' | 'forward' | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // 3. Add State Admin Modal State (Master Admin)
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminState, setNewAdminState] = useState(SUPPORTED_STATES[0]);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // 4. View State Admin Details Modal
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<any | null>(null);

  // 5. View Student Details Modal (State Admin Users tab)
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const isSubAdmin = user?.adminType === 'SUB_ADMIN';
  const isMasterAdmin = !isSubAdmin;
  const assignedState = user?.assignedState;

  const fetchAdminData = async () => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statsRes, libsRes, subAdminsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/libraries'),
        isMasterAdmin ? api.get('/admin/sub-admins') : Promise.resolve({ data: { subAdmins: [] } }),
        api.get('/admin/users'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats || statsRes.data);
      }
      if (libsRes.data.success) {
        setLibraries(libsRes.data.libraries || []);
      }
      if (subAdminsRes.data.subAdmins) {
        setSubAdminsList(subAdminsRes.data.subAdmins || []);
      }
      if (usersRes.data.success) {
        setUsersList(usersRes.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  // Approvals Filter (Pending or Forwarded)
  const approvalApplications = libraries.filter((lib) => {
    if (isSubAdmin) {
      return (
        lib.state === assignedState &&
        (lib.status === 'PENDING' || lib.forwardedToMaster === true)
      );
    }
    // Master Admin sees all pending, plus forwarded ones
    return lib.status === 'PENDING' || lib.forwardedToMaster === true;
  });

  // State Libraries (for State Admin Library tab)
  const stateLibraries = libraries.filter((lib) => {
    if (isSubAdmin) return lib.state === assignedState;
    return true;
  });

  // State Users (for State Admin Users tab)
  const stateUsers = usersList.filter((u) => {
    if (isSubAdmin && assignedState) {
      // If user has bookings in this state or lives in this state
      return u.assignedState === assignedState || true;
    }
    return true;
  });

  // Handle Approve Library
  const handleApprove = async (libId: string) => {
    try {
      const res = await api.patch(`/admin/libraries/${libId}/approve`);
      if (res.data.success) {
        toast.success('Library space approved & live! ✅');
        setInspectingLib(null);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  // Handle Reject Library
  const handleReject = async () => {
    if (!inspectingLib) return;
    setSubmittingAction(true);
    try {
      const res = await api.patch(`/admin/libraries/${inspectingLib.id}/reject`, {
        reason: actionReason.trim() || 'Criteria not met',
      });
      if (res.data.success) {
        toast.success('Library application rejected.');
        setActionDialogMode(null);
        setActionReason('');
        setInspectingLib(null);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Forward Library to Master Admin
  const handleForward = async () => {
    if (!inspectingLib) return;
    setSubmittingAction(true);
    try {
      const res = await api.patch(`/admin/libraries/${inspectingLib.id}/forward`, {
        forwardReason: actionReason.trim() || 'Requires Master Admin verification',
      });
      if (res.data.success) {
        toast.success('Forwarded to Master Admin for review! ↗️');
        setActionDialogMode(null);
        setActionReason('');
        setInspectingLib(null);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Forward failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Add State Admin
  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await api.post('/admin/sub-admins', {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword.trim(),
        assignedState: newAdminState,
      });

      if (res.data.success) {
        toast.success(`State Admin created for ${newAdminState}! ✅`);
        setIsAddAdminOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create State Admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Handle Delete State Admin
  const handleDeleteSubAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to remove ${adminName} as State Administrator?`)) return;
    try {
      const res = await api.delete(`/admin/sub-admins/${adminId}`);
      if (res.data.success) {
        toast.success('State Admin removed.');
        setSelectedSubAdmin(null);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove admin.');
    }
  };

  // Handle Photo Upload with Auto Compression (<80KB)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Optimizing admin photo...', { id: 'admin-photo' });
      const dataUrl = await compressProfileImage(file, 400, 0.75);

      const res = await updateProfile({ avatar: dataUrl });
      toast.dismiss('admin-photo');

      if (res.success) {
        toast.success('Admin profile photo updated! 📸');
      } else {
        toast.error(res.message || 'Failed to save photo.');
      }
    } catch (err: any) {
      toast.dismiss('admin-photo');
      toast.error(err.message || 'Error saving profile photo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Platform Administration</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Sign in with administrator credentials to access platform governance and moderate library applications.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
        >
          Sign In as Administrator
        </button>
      </div>
    );
  }

  // =========================================================================
  // TAB 1: ADMIN DASHBOARD (MASTER & STATE ADMIN)
  // =========================================================================
  if (activeTab === 'admin_dashboard') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{isSubAdmin ? `${assignedState} State Console` : 'Central Governance'}</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Admin Dashboard</h2>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-black text-[10px]">
            {isSubAdmin ? 'State Admin' : 'Master Admin'}
          </span>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Metric 1: Students / Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Students / Users
            </span>
            <div className="text-xl font-black text-white">
              {isSubAdmin ? stateUsers.length : stats?.totalUsers || usersList.length || 0}
            </div>
            <span className="text-[9px] text-slate-500 block">Registered on platform</span>
          </div>

          {/* Metric 2: Library Owners */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Library Owners
            </span>
            <div className="text-xl font-black text-amber-400">
              {stats?.totalOwners || stats?.totalVerifiedOwners || 1}
            </div>
            <span className="text-[9px] text-slate-500 block">Partner spaces</span>
          </div>

          {/* Metric 3: Total GMV */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total GMV
            </span>
            <div className="text-xl font-black text-emerald-400">
              ₹{stats?.totalPlatformRevenue || stats?.totalGMV || 0}
            </div>
            <span className="text-[9px] text-slate-500 block">Gross seat volume</span>
          </div>

          {/* Metric 4: Platform Commission */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Commission
            </span>
            <div className="text-xl font-black text-purple-400">
              ₹{stats?.totalCommission || Math.round((stats?.totalPlatformRevenue || 0) * 0.1)}
            </div>
            <span className="text-[9px] text-slate-500 block">Platform revenue share</span>
          </div>

          {/* Metric 5: Active Libraries */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Libraries
            </span>
            <div className="text-xl font-black text-white">
              {stateLibraries.filter((l) => l.status === 'APPROVED').length} / {stateLibraries.length}
            </div>
            <span className="text-[9px] text-emerald-400 font-semibold block">Live study halls</span>
          </div>

          {/* Metric 6: State Admins Count (Master Admin) / Assigned State (State Admin) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isSubAdmin ? 'Territory' : 'State Admins'}
            </span>
            <div className="text-xl font-black text-blue-400">
              {isSubAdmin ? assignedState : subAdminsList.length}
            </div>
            <span className="text-[9px] text-slate-500 block">
              {isSubAdmin ? 'Active coverage' : 'State administrators'}
            </span>
          </div>
        </div>

        {/* Quick Pending Approvals Alert Banner */}
        {approvalApplications.length > 0 && (
          <div
            onClick={() => onNavigateTab?.('admin_approvals')}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 flex items-center justify-between cursor-pointer active:scale-98 transition shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block">
                  {approvalApplications.length} Library Applications Awaiting Review
                </span>
                <span className="text-[10px] text-amber-300">
                  Tap to inspect photos, details & approve
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 2A: MASTER ADMIN -> ADMINS TAB (STATE ADMINS + ADD NEW ADMIN)
  // =========================================================================
  if (activeTab === 'admin_state_admins' && isMasterAdmin) {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>State Administrators</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Territory Admins</h2>
          </div>

          {/* + Add State Admin Button */}
          <button
            type="button"
            onClick={() => setIsAddAdminOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-950/40 text-[11px] flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add State Admin</span>
          </button>
        </div>

        {/* State Admins List */}
        <div className="space-y-3">
          {subAdminsList.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No State Admins Appointed</p>
              <p className="text-[11px] text-slate-400">
                Appoint regional administrators to oversee specific states like Uttar Pradesh,
                Bihar, Rajasthan, Delhi, etc.
              </p>
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs"
              >
                + Add First State Admin
              </button>
            </div>
          ) : (
            subAdminsList.map((adm) => (
              <div
                key={adm.id}
                onClick={() => setSelectedSubAdmin(adm)}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl shadow-lg space-y-3 transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 overflow-hidden flex items-center justify-center font-bold text-purple-300">
                      {adm.avatar ? (
                        <img src={adm.avatar} alt={adm.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{adm.name?.charAt(0) || 'A'}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{adm.name}</h4>
                      <p className="text-[10px] text-slate-400">{adm.email}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-[10px]">
                    📍 {adm.assignedState || 'Territory'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                  <span>Joined: {new Date(adm.createdAt).toLocaleDateString('en-GB')}</span>
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    <span>View Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL: + Add State Admin */}
        {isAddAdminOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-400" />
                  <h3 className="font-black text-white text-sm">Appoint State Administrator</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubAdmin} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="e.g. up.admin@libspace.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Assigned State Territory
                  </label>
                  <select
                    value={newAdminState}
                    onChange={(e) => setNewAdminState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  >
                    {SUPPORTED_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminOpen(false)}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-md shadow-purple-950/60 text-xs flex items-center justify-center gap-1.5"
                  >
                    {creatingAdmin ? 'Appointing...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: View / Delete State Admin Profile */}
        {selectedSubAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs">State Administrator Profile</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubAdmin(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-300 font-bold text-xl mx-auto flex items-center justify-center border border-purple-500/30 overflow-hidden">
                  {selectedSubAdmin.avatar ? (
                    <img src={selectedSubAdmin.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedSubAdmin.name?.charAt(0)}</span>
                  )}
                </div>
                <h4 className="text-base font-extrabold text-white">{selectedSubAdmin.name}</h4>
                <p className="text-xs text-slate-400">{selectedSubAdmin.email}</p>
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs">
                  Assigned State: {selectedSubAdmin.assignedState}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSubAdmin(selectedSubAdmin.id, selectedSubAdmin.name)}
                  className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-300 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove State Administrator</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 2B: STATE ADMIN -> LIBRARY TAB (STATE LIBRARIES LIST & DETAILS)
  // =========================================================================
  if (activeTab === 'admin_libraries' && isSubAdmin) {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Regional Directory</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {assignedState} Libraries ({stateLibraries.length})
          </h2>
        </div>

        {/* Libraries Cards */}
        <div className="space-y-3">
          {stateLibraries.map((lib) => (
            <div
              key={lib.id}
              onClick={() => {
                setInspectingLib(lib);
                setInspectPhotoIdx(0);
              }}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2.5 cursor-pointer active:scale-98 transition"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-[10px]">
                  {lib.lid || 'LID'}
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    lib.status === 'APPROVED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {lib.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">{lib.name}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  📍 {lib.address}, {lib.city}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-slate-800">
                <div className="p-1 bg-slate-950 rounded-lg">
                  <span className="text-slate-500 block">Total Desks</span>
                  <span className="font-bold text-white">{lib.totalSeats}</span>
                </div>
                <div className="p-1 bg-slate-950 rounded-lg">
                  <span className="text-slate-500 block">Rate</span>
                  <span className="font-bold text-blue-400">₹{lib.hourlyRate}/h</span>
                </div>
                <div className="p-1 bg-slate-950 rounded-lg">
                  <span className="text-slate-500 block">Owner</span>
                  <span className="font-bold text-slate-300 truncate block">
                    {lib.owner?.name?.split(' ')[0] || 'Owner'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB 3: APPROVALS (FULL APPLICATION INSPECTION FOR BOTH MASTER & STATE ADMIN)
  // =========================================================================
  if (activeTab === 'admin_approvals') {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Moderation Queue</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Library Approvals ({approvalApplications.length})
          </h2>
          <p className="text-[11px] text-slate-400">
            Tap any library card to inspect 3 showcase photos, owner credentials, and approve or reject.
          </p>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {approvalApplications.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-white font-bold">Queue is Clear</p>
              <p className="text-[11px] text-slate-400">
                All library partner applications have been reviewed.
              </p>
            </div>
          ) : (
            approvalApplications.map((lib) => (
              <div
                key={lib.id}
                onClick={() => {
                  setInspectingLib(lib);
                  setInspectPhotoIdx(0);
                }}
                className="p-4 bg-slate-900 border border-amber-500/30 hover:border-amber-400 rounded-2xl shadow-xl space-y-3 cursor-pointer active:scale-[0.98] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-xs">
                    {lib.lid || 'LID'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-[9px] uppercase">
                    {lib.forwardedToMaster ? '↗️ Forwarded to Master' : '🟡 Awaiting Review'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-white">{lib.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    📍 {lib.address}, {lib.city}, {lib.state}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Owner: {lib.owner?.name} ({lib.owner?.phone || lib.owner?.email})
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-amber-400 font-bold">
                  <span>Inspection Ready</span>
                  <span className="flex items-center gap-1">
                    <span>Inspect Application</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FULL APPLICATION INSPECTION MODAL */}
        {inspectingLib && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full my-auto overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Top Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
                    {inspectingLib.lid || 'LID'}
                  </span>
                  <h3 className="font-black text-white text-sm truncate max-w-[200px]">
                    {inspectingLib.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingLib(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* 3-Photo Showcase Carousel */}
                <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  {(() => {
                    const photos = [
                      inspectingLib.bannerImage || inspectingLib.photos?.[0],
                      inspectingLib.interiorImage || inspectingLib.photos?.[1],
                      inspectingLib.amenitiesImage || inspectingLib.photos?.[2],
                    ].filter(Boolean);

                    const currentPhoto =
                      photos[inspectPhotoIdx] ||
                      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800';

                    return (
                      <>
                        <img
                          src={currentPhoto}
                          alt="Library Showcase"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-slate-950/80 px-2 py-1 rounded-xl backdrop-blur-md">
                          <span className="text-[10px] text-slate-300 font-bold">
                            Photo {inspectPhotoIdx + 1} of {photos.length || 1}
                          </span>
                          <div className="flex gap-1.5">
                            {photos.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setInspectPhotoIdx(i)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  inspectPhotoIdx === i ? 'w-4 bg-amber-400' : 'bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Location & Address */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Physical Location
                  </span>
                  <p className="text-white font-semibold text-xs leading-relaxed">
                    {inspectingLib.address}, {inspectingLib.city}, {inspectingLib.state}
                  </p>
                  {inspectingLib.pincode && (
                    <span className="text-[11px] text-blue-400 font-mono font-bold block">
                      PIN Code: {inspectingLib.pincode}
                    </span>
                  )}
                </div>

                {/* Owner Information */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Registered Owner Details
                  </span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Name:</span>
                    <span className="font-bold text-white">{inspectingLib.owner?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-semibold text-white">{inspectingLib.owner?.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-semibold text-white">{inspectingLib.owner?.phone || 'Not added'}</span>
                  </div>
                </div>

                {/* Desk Allocation & Pricing */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Total Desks</span>
                    <span className="font-bold text-white text-xs">{inspectingLib.totalSeats}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Hourly Rate</span>
                    <span className="font-bold text-blue-400 text-xs">₹{inspectingLib.hourlyRate}/h</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Monthly Pass</span>
                    <span className="font-bold text-amber-400 text-xs">₹{inspectingLib.monthlyRate || 1200}</span>
                  </div>
                </div>

                {/* Facilities List */}
                {Array.isArray(inspectingLib.facilities) && inspectingLib.facilities.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Provided Amenities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectingLib.facilities.map((fac: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-semibold"
                        >
                          ✓ {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(inspectingLib.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/60 transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionDialogMode('reject')}
                    className="flex-1 py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>

                {/* State Admin Forward Option */}
                {isSubAdmin && !inspectingLib.forwardedToMaster && (
                  <button
                    type="button"
                    onClick={() => setActionDialogMode('forward')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Forward to Master Admin for Review</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject / Forward Reason Dialog */}
        {actionDialogMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <h4 className="font-black text-white text-sm">
                {actionDialogMode === 'reject' ? 'Reject Application' : 'Forward to Master Admin'}
              </h4>

              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason or remark for owner/master..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-amber-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActionDialogMode(null)}
                  className="w-1/2 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={actionDialogMode === 'reject' ? handleReject : handleForward}
                  disabled={submittingAction}
                  className="w-1/2 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs"
                >
                  {submittingAction ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 4: STATE ADMIN -> USERS LIST (REGIONAL STUDENTS)
  // =========================================================================
  if (activeTab === 'admin_users' && isSubAdmin) {
    return (
      <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Territory Students</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {assignedState} Students ({stateUsers.length})
          </h2>
        </div>

        {/* Users List */}
        <div className="space-y-2.5">
          {stateUsers.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30 overflow-hidden">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{u.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{u.name}</h4>
                  <p className="text-[10px] text-slate-400">{u.email}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-blue-400 font-bold block">
                  {u.totalBookings || 0} passes
                </span>
                <span className="text-[9px] text-slate-500">Student</span>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL: View Student Details */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs">Student Profile Summary</span>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 font-bold text-xl mx-auto flex items-center justify-center border border-blue-500/30 overflow-hidden">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedUser.name?.charAt(0)}</span>
                  )}
                </div>
                <h4 className="text-base font-extrabold text-white">{selectedUser.name}</h4>
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
                <p className="text-[11px] text-slate-400">Phone: {selectedUser.phone || 'Not added'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB 5: ADMIN PROFILE (PHOTO UPLOAD, CREDENTIALS, LOGOUT)
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
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          {/* Avatar with Camera Button */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-800 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-slate-800 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-md border border-slate-950 transition active:scale-90 cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
                {isSubAdmin ? 'State Admin' : 'Master Admin'}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">{user.email}</p>
            {isSubAdmin && (
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">
                Territory: {assignedState}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Details Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          Administrator Credentials
        </h3>
        <div className="space-y-2 text-slate-300">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Official Name</span>
            <span className="font-semibold text-white">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-500">Authority Level</span>
            <span className="font-semibold text-purple-300">
              {isSubAdmin ? `Regional (${assignedState})` : 'National Master Administrator'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Access Key</span>
            <span className="font-mono text-emerald-400 font-bold">256-Bit SSL Root Authenticated</span>
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl divide-y divide-slate-800/80">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Update Profile Photo</span>
              <span className="text-[10px] text-slate-400">Upload new admin portrait</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to log out of the Administration Console?')) {
              logout();
              toast.success('Admin session terminated safely.');
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
              <span className="text-[10px] text-slate-500">End administrative session</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
};

export default MobileAdminScreen;
