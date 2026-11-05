import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { Library } from '../../types';
import {
  X,
  Users,
  Plus,
  Building2,
  Trash2,
  Lock,
  KeyRound,
  Mail,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface MobileOwnerManagersModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraries: Library[];
}

interface ManagerItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assignedLibraryId?: string;
  assignedLibrary?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  createdAt: string;
}

export const MobileOwnerManagersModal: React.FC<MobileOwnerManagersModalProps> = ({
  isOpen,
  onClose,
  libraries,
}) => {
  const [managers, setManagers] = useState<ManagerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/managers');
      if (res.data.success) {
        setManagers(res.data.managers || []);
      }
    } catch (_) {
      toast.error('Failed to load library managers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchManagers();
      setIsAdding(false);
    }
  }, [isOpen]);

  // When opening add form or when managers change, auto-select first available UNASSIGNED library
  useEffect(() => {
    if (isAdding && libraries.length > 0) {
      const assignedIds = new Set(managers.map((m) => m.assignedLibraryId));
      const firstAvailable = libraries.find((l) => !assignedIds.has(l.id));
      if (firstAvailable) {
        setSelectedLibraryId(firstAvailable.id);
      } else {
        setSelectedLibraryId(libraries[0].id);
      }
    }
  }, [isAdding, libraries, managers]);

  if (!isOpen) return null;

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim() || !securityPin.trim() || !selectedLibraryId) {
      toast.error('Please fill all required manager fields.');
      return;
    }

    const cleanPin = securityPin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      toast.error('Security PIN must be exactly 6 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/owner/managers', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        securityPin: cleanPin,
        libraryId: selectedLibraryId,
      });

      if (res.data.success) {
        toast.success(`Manager "${name}" created & assigned successfully! 👥`);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setSecurityPin('');
        setIsAdding(false);
        fetchManagers();
      } else {
        toast.error(res.data.message || 'Failed to create manager.');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : null) ||
        err.message ||
        'Error creating manager.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteManager = async (id: string, managerName: string) => {
    if (!window.confirm(`Are you sure you want to remove manager "${managerName}"?`)) return;

    try {
      const res = await api.delete(`/owner/managers/${id}`);
      if (res.data.success) {
        toast.success(`Manager "${managerName}" removed.`);
        setManagers((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error(res.data.message || 'Failed to delete manager.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting manager.');
    }
  };

  // Check which libraries are already assigned
  const assignedLibIds = new Set(managers.map((m) => m.assignedLibraryId));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in text-xs">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Library Managers</h3>
              <span className="text-[10px] text-slate-400">1 Branch = 1 Dedicated Manager</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Top Actions Bar */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                Assigned Managers ({managers.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Staff can manage branch bookings, desk toggle & attendance
              </span>
            </div>

            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Manager</span>
              </button>
            )}
          </div>

          {/* ADD MANAGER FORM */}
          {isAdding && (
            <form
              onSubmit={handleCreateManager}
              className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-3 animate-slide-up shadow-xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Appoint New Library Manager
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-white text-[11px] font-bold"
                >
                  Cancel
                </button>
              </div>

              {/* Manager Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Login Email / ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Login Email / Manager ID *</label>
                <input
                  type="email"
                  required
                  placeholder="manager@libspace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Initial Password & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Login Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* 6-Digit Security PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Manager Branch Unlock PIN (6 Digits) *
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold">Must be 6 digits</span>
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center"
                />
                <span className="text-[10px] text-slate-500 block">
                  Manager will use this PIN to unlock the assigned library branch card on their dashboard.
                </span>
              </div>

              {/* Assigned Library Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Assign Library Branch (1 Manager = 1 Library) *
                </label>
                {libraries.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No library branches found. Please create a library branch first.</span>
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={selectedLibraryId}
                      onChange={(e) => setSelectedLibraryId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="" disabled>Select a library</option>
                      {libraries.map((lib) => {
                        const alreadyAssigned = assignedLibIds.has(lib.id);
                        return (
                          <option key={lib.id} value={lib.id} disabled={alreadyAssigned}>
                            {lib.name} ({lib.city}) {alreadyAssigned ? '— [Already Assigned]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {libraries.every((l) => assignedLibIds.has(l.id)) && (
                      <p className="text-[10px] text-amber-400 font-medium">
                        ⚠️ All your branches currently have an assigned manager. Remove an existing manager or add a new branch to appoint more staff.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Creating Manager...' : 'Appoint & Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* MANAGERS LIST */}
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading managers...</div>
          ) : managers.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-bold">No Library Managers Appointed Yet</p>
              <p className="text-[11px] text-slate-400">
                Click "+ Add Manager" above to create manager accounts and assign them to your library branches.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {managers.map((mgr) => (
                <div
                  key={mgr.id}
                  className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {mgr.name[0]?.toUpperCase() || 'M'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-white truncate">{mgr.name}</h4>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                          Manager
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {mgr.email}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-[10px] font-bold text-emerald-300 truncate">
                          {mgr.assignedLibrary?.name || 'Assigned Branch'} ({mgr.assignedLibrary?.city || ''})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteManager(mgr.id, mgr.name)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition active:scale-90 cursor-pointer shrink-0"
                    title="Remove Manager"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileOwnerManagersModal;
