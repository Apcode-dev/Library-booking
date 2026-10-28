import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  LogOut,
  Download,
  Smartphone,
  ExternalLink,
  Lock,
  Edit2,
  Check,
} from 'lucide-react';

interface MobileProfileScreenProps {
  onOpenAuth: () => void;
}

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({ onOpenAuth }) => {
  const { user, logout, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <User className="w-12 h-12 text-blue-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Student & Partner Profile</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Sign in to access your profile settings, view active passes, and manage library
          reservations.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
        >
          Sign in to Account
        </button>
      </div>
    );
  }

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateProfile({ name: name.trim(), phone: phone.trim() });
      if (res.success) {
        toast.success('Profile updated successfully! ✅');
        setIsEditing(false);
      } else {
        toast.error(res.message || 'Update failed.');
      }
    } catch (_) {
      toast.error('Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3 text-xs">
      {/* Profile Card Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-white/20">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate">{user.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : user.role === 'OWNER'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Single Device Session Secured Pill */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-300">
          <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>
            <strong>Single-Device Session:</strong> Active token secured. Logged in on this device.
          </span>
        </div>
      </div>

      {/* Account Details Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Account Information
          </h3>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-400 font-bold flex items-center gap-1 hover:underline"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Email Address</span>
              <span className="font-semibold">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Phone</span>
              <span className="font-semibold">{user.phone || 'Not added'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Account Role</span>
              <span className="font-semibold capitalize">{user.role.toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Official Android App Direct Download Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 rounded-3xl p-4 shadow-xl space-y-2.5">
        <div className="flex items-center gap-2">
          <img
            src="/images/libspace-logo.png"
            alt="LibSpace App"
            className="w-7 h-7 rounded-lg object-contain bg-slate-950 p-1 border border-emerald-500/30"
          />
          <div>
            <h4 className="font-extrabold text-white">LibSpace Native Android APK</h4>
            <p className="text-[10px] text-slate-400">Release Build v1.0 • 14.4 MB</p>
          </div>
        </div>

        <a
          href="/downloads/libspace-release.apk"
          download="LibSpace-v1.0.apk"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-center flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
        >
          <Download className="w-4 h-4" />
          <span>Download App APK</span>
        </a>
      </div>

      {/* Switch Portal Role Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Enterprise Portal Access
        </h4>

        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold flex items-center justify-between transition"
        >
          <span>Switch Account or Role</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={() => {
          logout();
          toast.success('Signed out successfully.');
        }}
        className="w-full py-3 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of LibSpace</span>
      </button>
    </div>
  );
};

export default MobileProfileScreen;
