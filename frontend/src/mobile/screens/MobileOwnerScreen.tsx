import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Library } from '../../types';
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
} from 'lucide-react';

interface MobileOwnerScreenProps {
  onOpenAuth: () => void;
}

export const MobileOwnerScreen: React.FC<MobileOwnerScreenProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();

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
  const [selectedBranchForAction, setSelectedBranchForAction] = useState<Library | null>(null);

  // Desk management & Student roster drawers
  const [activeView, setActiveView] = useState<'branches' | 'seats' | 'students'>('branches');
  const [activeBranch, setActiveBranch] = useState<Library | null>(null);
  const [studentsData, setStudentsData] = useState<any>(null);

  const fetchOwnerData = async () => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [libsRes, metricsRes, pinRes] = await Promise.all([
        api.get('/owner/my-libraries'),
        api.get('/owner/dashboard'),
        api.get('/owner/pin-status'),
      ]);

      if (libsRes.data.success) {
        setLibraries(libsRes.data.libraries || []);
        if (libsRes.data.libraries?.length > 0 && !activeBranch) {
          setActiveBranch(libsRes.data.libraries[0]);
        }
      }
      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics || metricsRes.data);
      }
      if (pinRes.data.success) {
        setHasPin(pinRes.data.hasPin);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (libraryId?: string) => {
    try {
      const res = await api.get('/owner/students-and-attendance', {
        params: { libraryId: libraryId || activeBranch?.id },
      });
      if (res.data.success) {
        setStudentsData(res.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchOwnerData();
  }, [user]);

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
          Sign in as Owner
        </button>
      </div>
    );
  }

  const handleToggleSeat = async (seatId: string) => {
    try {
      const res = await api.patch(`/owner/seats/${seatId}/toggle`);
      if (res.data.success) {
        toast.success(`Desk status updated to ${res.data.seat.isAvailable ? 'Available' : 'Maintenance'}`);
        fetchOwnerData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update seat.');
    }
  };

  const isBranchUnlocked = (branchId: string) => {
    // If owner hasn't set a PIN yet, allow workspace access
    if (hasPin === false) return true;
    return unlockedBranchIds.includes(branchId);
  };

  const handleUnlockBranch = (branch: Library) => {
    setPinTargetBranch(branch);
    setIsPinModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Top Owner Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Owner Command Hub
          </span>
          <h2 className="text-base font-black text-white">Managed Branches ({libraries.length}/5)</h2>
        </div>

        <button
          onClick={() => setIsAddBranchOpen(true)}
          disabled={libraries.length >= 5}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Branch</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Total GMV</span>
          <div className="text-base font-black text-emerald-400 mt-0.5">
            ₹{metrics?.totalRevenue || metrics?.totalGMV || 0}
          </div>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Occupancy</span>
          <div className="text-base font-black text-blue-400 mt-0.5">
            {metrics?.occupancyRate || '78%'}
          </div>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block">Active Desks</span>
          <div className="text-base font-black text-white mt-0.5">
            {metrics?.totalSeats || metrics?.totalDesks || 0}
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/30 transition active:scale-95"
        >
          <Camera className="w-5 h-5" />
          <span>Scan Gate QR</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('seats');
            fetchOwnerData();
          }}
          className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
            activeView === 'seats'
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-slate-900 text-slate-300 border-slate-800'
          }`}
        >
          <Armchair className="w-5 h-5 text-blue-400" />
          <span>Desk Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('students');
            fetchStudents();
          }}
          className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
            activeView === 'students'
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-slate-900 text-slate-300 border-slate-800'
          }`}
        >
          <Users className="w-5 h-5 text-amber-400" />
          <span>Rosters</span>
        </button>
      </div>

      {/* View 1: Branch Cards List */}
      {activeView === 'branches' && (
        <div className="space-y-3">
          {libraries.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Branches Added</h4>
              <p className="text-xs text-slate-400">
                You can manage up to 5 library branches under this master account.
              </p>
              <button
                onClick={() => setIsAddBranchOpen(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
              >
                Add First Branch
              </button>
            </div>
          ) : (
            libraries.map((branch) => {
              const unlocked = isBranchUnlocked(branch.id);

              return (
                <div
                  key={branch.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {branch.lid || 'LID'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            branch.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300'
                              : branch.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {branch.status}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mt-1">{branch.name}</h3>
                      <p className="text-xs text-slate-400">
                        {branch.address}, {branch.city}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 block">
                        ₹{branch.hourlyRate}/hr
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {branch.totalSeats} Total Desks
                      </span>
                    </div>
                  </div>

                  {/* 3-Image Preview Strip */}
                  <div className="grid grid-cols-3 gap-1 h-14 rounded-xl overflow-hidden bg-slate-950">
                    <img
                      src={branch.bannerImage || branch.photos?.[0]}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                    <img
                      src={branch.interiorImage || branch.photos?.[1]}
                      alt="Interior"
                      className="w-full h-full object-cover"
                    />
                    <img
                      src={branch.amenitiesImage || branch.photos?.[2]}
                      alt="Amenities"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Security PIN Gate Overlay if Locked */}
                  {!unlocked ? (
                    <div className="bg-slate-950/90 p-3 rounded-2xl border border-amber-500/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Protected by 6-Digit PIN</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlockBranch(branch)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition active:scale-95"
                      >
                        Unlock
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Workspace Active</span>
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBranch(branch);
                            setActiveView('seats');
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                        >
                          Manage Desks
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View 2: Desk Floor Plan Management */}
      {activeView === 'seats' && activeBranch && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Floor Plan: {activeBranch.name}
              </h3>
              <p className="text-[10px] text-slate-400">Tap a desk to toggle Maintenance Mode</p>
            </div>
            <button
              onClick={() => setActiveView('branches')}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {((activeBranch as any)?.seats || []).map((seat: any) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => handleToggleSeat(seat.id)}
                className={`p-2 rounded-2xl border text-center transition active:scale-95 ${
                  seat.isAvailable
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-900/60 text-rose-400'
                }`}
              >
                <div className="text-xs font-black">{seat.seatNumber}</div>
                <div className="text-[9px] font-bold mt-0.5">
                  {seat.isAvailable ? 'Active' : 'Offline'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View 3: Student Rosters & Attendance */}
      {activeView === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-white">Live Student Roster</h3>
            <button
              onClick={() => setActiveView('branches')}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              Back
            </button>
          </div>

          <div className="space-y-2">
            {studentsData?.dailyBookings?.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No active students today.</p>
            )}

            {studentsData?.dailyBookings?.map((b: any) => (
              <div
                key={b.id}
                className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{b.user?.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Desk {b.seat?.seatNumber} • {b.bookingType} Pass
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      b.checkInTime ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {b.checkInTime ? 'Checked In' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <MobileScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedLibraryId={activeBranch?.id}
        onCheckInSuccess={() => {
          fetchOwnerData();
          fetchStudents();
        }}
      />

      {/* Add Branch Modal */}
      <MobileBranchModal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        onSuccess={fetchOwnerData}
      />

      {/* 6-Digit PIN Modal */}
      <MobileSecurityPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinTargetBranch(null);
        }}
        targetLibraryName={pinTargetBranch?.name}
        onSuccess={() => {
          if (pinTargetBranch) {
            setUnlockedBranchIds((prev) => [...prev, pinTargetBranch.id]);
          }
        }}
      />
    </div>
  );
};

export default MobileOwnerScreen;
