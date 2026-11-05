import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  ShieldAlert,
  Phone,
  MapPin,
  Building,
  Mail,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  BadgeAlert,
  IdCard,
  X,
} from 'lucide-react';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
  'Puducherry',
];

export const MandatoryProfileModal: React.FC = () => {
  const { user, updateProfile, refreshUser } = useAuth();

  const isStudent = user?.role === 'USER';
  const isOwner = user?.role === 'OWNER';

  const [isDismissed, setIsDismissed] = useState(false);
  const storageKey = user?.id ? `libspace_profile_completed_${user.id}` : null;
  const isLocallyCompleted = Boolean(
    storageKey && localStorage.getItem(storageKey) === 'true'
  );

  // Check if profile is complete (name, phone, state, city)
  const isComplete = Boolean(
    isDismissed ||
      isLocallyCompleted ||
      user?.isProfileComplete ||
      (user?.name && user?.phone && user?.state && user?.city)
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setState(user.state || '');
      setCity(user.city || '');
    }
  }, [user]);

  // Don't show modal if user is not logged in, or is Admin/Manager, or profile is already complete/dismissed
  if (!user || user.role === 'ADMIN' || user.role === 'MANAGER' || isComplete || isDismissed) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!state.trim()) {
      toast.error('Please select your state.');
      return;
    }

    if (!city.trim()) {
      toast.error('Please enter your city.');
      return;
    }

    setSaving(true);
    let tId: any = null;
    try {
      tId = toast.loading('Saving mandatory profile details...');
      const res = await updateProfile({
        name: name.trim(),
        phone: cleanPhone,
        state: state.trim(),
        city: city.trim(),
      });

      if (tId) toast.dismiss(tId);

      if (res.success) {
        setIsDismissed(true);
        if (storageKey) {
          localStorage.setItem(storageKey, 'true');
        }
        toast.success('Profile details verified & completed! 🎉');
        refreshUser().catch(() => {});
      } else {
        toast.error(res.message || 'Failed to complete profile.');
      }
    } catch (err: any) {
      if (tId) toast.dismiss(tId);
      toast.error(err.response?.data?.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Banner */}
        <div className="p-5 bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/40 border-b border-slate-800 flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <BadgeAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
              Action Required • First-Time Setup
            </span>
            <h3 className="text-base font-black text-white">
              {isStudent ? 'Mandatory Student Profile Setup' : 'Mandatory Owner Profile Setup'}
            </h3>
            <p className="text-xs text-slate-400 leading-tight mt-0.5">
              {isStudent
                ? 'Please complete your profile details. Your official Library ID will be linked to your seat bookings & passes.'
                : 'Please complete your owner profile to manage your libraries, staff & seat reservations.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDismissed(true);
              if (storageKey) {
                localStorage.setItem(storageKey, 'true');
              }
            }}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Student ID (Generated Badge for Students) */}
          {isStudent && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-blue-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Official Student Library ID
                  </span>
                  <span className="font-mono font-black text-sm text-blue-400">
                    {user?.studentId || 'LIB-STU-AUTO'}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[9px] font-bold border border-blue-500/20">
                Auto-Generated
              </span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {isStudent ? 'Student Full Name' : 'Owner Full Name'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 pl-10"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Registered Email (Read-Only) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Registered Email (Verified)
              </label>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            </div>
            <div className="relative">
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-slate-400 font-mono text-xs cursor-not-allowed pl-10"
              />
              <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              10-Digit Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-medium focus:outline-none focus:border-emerald-500 pl-10"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
            <span className="text-[10px] text-slate-500">
              Pass SMS & WhatsApp booking updates will be sent here.
            </span>
          </div>

          {/* State & City Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* State Select */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                State <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 pl-10 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* City Input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                City <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lucknow"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 pl-10"
                />
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          {/* Account Role (Default & Non-Editable for both Student & Owner) */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Account Role (Permanent)
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked / Non-Editable
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-extrabold text-white text-xs">
                {isStudent ? '🎓 Student / Aspirant' : '🏢 Library Owner'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                Default Role: {user?.role}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Saving Profile Details...
                </span>
              ) : (
                <>
                  <span>Save & Complete Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MandatoryProfileModal;
