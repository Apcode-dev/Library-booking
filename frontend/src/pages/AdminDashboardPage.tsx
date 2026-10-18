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
} from 'lucide-react';

import AuthModal from '../components/common/AuthModal';
import ProfileModal from '../components/common/ProfileModal';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [pendingLibraries, setPendingLibraries] = useState<Library[]>([]);
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [allLibraries, setAllLibraries] = useState<Library[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'owners' | 'libraries' | 'users'>('queue');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, pendingOwnersRes, allLibsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/libraries?status=PENDING'),
        api.get('/admin/owners/pending'),
        api.get('/admin/libraries?status=ALL'),
        api.get('/admin/users'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (pendingRes.data.success) setPendingLibraries(pendingRes.data.libraries);
      if (pendingOwnersRes.data.success) setPendingOwners(pendingOwnersRes.data.owners);
      if (allLibsRes.data.success) setAllLibraries(allLibsRes.data.libraries);
      if (usersRes.data.success) setUsersList(usersRes.data.users);
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
  }, [user]);

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
          🛡️ Sign In or Register as Admin
        </button>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultRole="ADMIN"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                🛡️ Master Administration
              </span>
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
                <span className="text-[10px] text-purple-600 font-extrabold underline ml-1">Edit Profile</span>
              </button>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Platform Governance & Verification
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200">
              System Active
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
              Total GMV
            </span>
            <div className="text-2xl font-extrabold text-slate-900">
              ₹{stats?.totalGMV || 0}
            </div>
            <span className="text-[11px] text-slate-400">Total volume booked</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
              Platform Fee Earned
            </span>
            <div className="text-2xl font-extrabold text-purple-600">
              ₹{stats?.platformCommissionEarned || 0}
            </div>
            <span className="text-[11px] text-slate-400">10% commission revenue</span>
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
              Registered Users
            </span>
            <div className="text-2xl font-extrabold text-blue-600">
              {stats?.totalUsers || 0}
            </div>
            <span className="text-[11px] text-slate-400">Students, Owners & Staff</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'queue'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verification Queue ({pendingLibraries.length})
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'owners'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Owner Approvals ({pendingOwners.length})
          </button>
          <button
            onClick={() => setActiveTab('libraries')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'libraries'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Libraries ({allLibraries.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'users'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Users ({usersList.length})
          </button>
        </div>

        {/* Tab: Owner Verification Queue */}
        {activeTab === 'owners' && (
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

        {/* Tab 1: Verification Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Libraries Awaiting Verification
            </h2>

            {pendingLibraries.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Queue is Clear!</h3>
                <p className="text-xs text-slate-400">No new libraries pending verification.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingLibraries.map((lib) => (
                  <div
                    key={lib.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{lib.name}</h3>
                        <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                          PENDING APPROVAL
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {lib.address}, {lib.city} • Rate: ₹{lib.hourlyRate}/h
                      </p>
                      {Array.isArray(lib.facilities) && lib.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
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
                      <p className="text-xs text-slate-600 italic mt-1">"{lib.description}"</p>
                      {lib.owner && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-0.5 mt-2">
                          <span className="font-bold text-amber-900 block">🏢 Library Owner Info:</span>
                          <div className="text-amber-800">
                            Name: <strong>{lib.owner.name}</strong> • Email: <strong>{lib.owner.email}</strong> • Phone: <strong>{lib.owner.phone || 'N/A'}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleApprove(lib.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Approve & Launch
                      </button>
                      <button
                        onClick={() => handleReject(lib.id)}
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

        {/* Tab 2: All Libraries */}
        {activeTab === 'libraries' && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Platform Library Directory
            </div>
            <div className="divide-y divide-slate-100">
              {allLibraries.map((lib) => (
                <div key={lib.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{lib.name}</span>
                    <span className="text-xs text-slate-500">{lib.city} • {lib.address}</span>
                    {lib.owner && (
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Owner: <strong>{lib.owner.name}</strong> ({lib.owner.email}) • {lib.owner.phone || 'No phone'}
                      </span>
                    )}
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
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                      lib.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : lib.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {lib.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Users */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Registered Platform Users
            </div>
            <div className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{u.name}</span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboardPage;
