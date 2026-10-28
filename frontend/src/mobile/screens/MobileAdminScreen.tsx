import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface MobileAdminScreenProps {
  onOpenAuth: () => void;
}

export const MobileAdminScreen: React.FC<MobileAdminScreenProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'queue' | 'users' | 'owners' | 'subadmins'>('queue');
  const [stats, setStats] = useState<any>(null);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ownersList, setOwnersList] = useState<any[]>([]);
  const [subAdminsList, setSubAdminsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection / Forward dialog states
  const [actionLibId, setActionLibId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionMode, setActionMode] = useState<'reject' | 'forward' | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const isSubAdmin = user?.adminType === 'SUB_ADMIN';
  const assignedState = user?.assignedState;

  const fetchAdminData = async () => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statsRes, libsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/libraries'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats || statsRes.data);
      }
      if (libsRes.data.success) {
        setLibraries(libsRes.data.libraries || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsersList(res.data.users || []);
    } catch (_) {}
  };

  const fetchOwners = async () => {
    try {
      const res = await api.get('/admin/owners');
      if (res.data.success) setOwnersList(res.data.owners || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchAdminData();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'owners') fetchOwners();
  }, [user, activeTab]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Platform Administration</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Sign in with administrator credentials to access national financial metrics and moderate
          library applications.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
        >
          Sign in as Admin
        </button>
      </div>
    );
  }

  const handleApprove = async (libId: string) => {
    try {
      const res = await api.patch(`/admin/libraries/${libId}/approve`);
      if (res.data.success) {
        toast.success('Library approved and published live! ✅');
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    }
  };

  const handleConfirmAction = async () => {
    if (!actionLibId || !actionReason.trim()) {
      toast.error('Please enter a reason.');
      return;
    }

    setSubmittingAction(true);
    try {
      if (actionMode === 'reject') {
        const res = await api.patch(`/admin/libraries/${actionLibId}/reject`, {
          rejectionReason: actionReason.trim(),
        });
        if (res.data.success) {
          toast.success('Library rejected. Notification sent to owner.');
          fetchAdminData();
        }
      } else if (actionMode === 'forward') {
        const res = await api.patch(`/admin/libraries/${actionLibId}/forward`, {
          forwardReason: actionReason.trim(),
        });
        if (res.data.success) {
          toast.success('Escalated to Master Admin priority queue.');
          fetchAdminData();
        }
      }
      setActionLibId(null);
      setActionMode(null);
      setActionReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingLibraries = libraries.filter(
    (l) => l.status === 'PENDING' || l.status === 'FORWARDED_TO_MASTER'
  );

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Top Admin Jurisdiction Banner */}
      <div className="p-3 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-[10px] font-black uppercase text-purple-300">
              {isSubAdmin ? 'State Jurisdiction' : 'National Oversight'}
            </div>
            <div className="font-extrabold text-white">
              {isSubAdmin ? assignedState : 'Master Admin (Pan-India)'}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Level 1 Root
        </span>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Total GMV</span>
          <div className="text-base font-black text-emerald-400 mt-0.5">
            ₹{stats?.totalGMV || 0}
          </div>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Commission</span>
          <div className="text-base font-black text-purple-400 mt-0.5">
            ₹{stats?.platformCommissionEarned || stats?.totalCommission || 0}
          </div>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Pending</span>
          <div className="text-base font-black text-amber-400 mt-0.5">
            {pendingLibraries.length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition ${
            activeTab === 'queue'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Queue ({pendingLibraries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Students
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('owners')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition ${
            activeTab === 'owners'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Owners
        </button>
      </div>

      {/* Tab 1: Verification Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {pendingLibraries.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Verification Queue Clear</h4>
              <p className="text-xs text-slate-400">
                All submitted study centers in your jurisdiction have been reviewed.
              </p>
            </div>
          ) : (
            pendingLibraries.map((lib) => (
              <div
                key={lib.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-purple-400 border border-slate-800">
                      {lib.lid || 'LID'}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">{lib.name}</h3>
                    <p className="text-xs text-slate-400">
                      {lib.address}, {lib.city}, {lib.state}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-bold">
                    {lib.status}
                  </span>
                </div>

                {/* 3-Image Showcase Preview */}
                <div className="grid grid-cols-3 gap-1 h-14 rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={lib.bannerImage || lib.photos?.[0]}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                  <img
                    src={lib.interiorImage || lib.photos?.[1]}
                    alt="Interior"
                    className="w-full h-full object-cover"
                  />
                  <img
                    src={lib.amenitiesImage || lib.photos?.[2]}
                    alt="Amenities"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Pricing & Owner Info */}
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">Owner:</span>{' '}
                    <span className="font-bold text-white">{lib.owner?.name || 'Owner'}</span>
                  </div>
                  <div className="font-bold text-emerald-400">₹{lib.hourlyRate}/hr</div>
                </div>

                {/* Moderation Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(lib.id)}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionLibId(lib.id);
                      setActionMode('reject');
                    }}
                    className="py-2.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-900 text-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  {isSubAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionLibId(lib.id);
                        setActionMode('forward');
                      }}
                      className="py-2.5 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-900 text-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Forward</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Students */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {usersList.map((st) => (
            <div
              key={st.id}
              className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{st.name}</div>
                <div className="text-[10px] text-slate-400">{st.email}</div>
              </div>

              <div className="text-right">
                <span className="font-bold text-blue-400">{st.totalBookings || 0} Bookings</span>
                <div className="text-[10px] text-slate-500">₹{st.totalSpent || 0} Spent</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Dialog (Reject or Forward) */}
      {actionMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-black text-white">
              {actionMode === 'reject' ? 'Reject Library Application' : 'Forward to Master Admin'}
            </h3>
            <p className="text-xs text-slate-400">
              Provide a clear reason for the {actionMode === 'reject' ? 'library owner' : 'master admin'}:
            </p>

            <textarea
              rows={3}
              required
              placeholder="Enter explanation..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            ></textarea>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionMode(null)}
                className="w-1/3 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submittingAction}
                className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs"
              >
                {submittingAction ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAdminScreen;
