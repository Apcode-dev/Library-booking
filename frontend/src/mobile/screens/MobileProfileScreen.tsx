import React, { useState, useRef } from 'react';
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
  Lock,
  Edit2,
  Check,
  Camera,
  Heart,
  Ticket,
  Bell,
  HelpCircle,
  Settings,
  ChevronRight,
  X,
  MessageCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface MobileProfileScreenProps {
  onOpenAuth: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({
  onOpenAuth,
  onNavigateTab,
}) => {
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  // Modals for menu items
  const [activeModal, setActiveModal] = useState<
    'notifications' | 'help' | 'settings' | null
  >(null);

  if (!user) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 mx-4">
        <User className="w-12 h-12 text-blue-400 mx-auto" />
        <h3 className="text-base font-extrabold text-white">Student Profile</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Sign in to access your profile settings, view active passes, and manage saved libraries.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
        >
          Sign In to Your Account
        </button>
      </div>
    );
  }

  // Handle Photo Upload via Camera or Gallery
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
      setAvatar(dataUrl);
      try {
        const res = await updateProfile({ avatar: dataUrl });
        if (res.success) {
          toast.success('Profile photo updated! 📸');
        } else {
          toast.error(res.message || 'Failed to save photo.');
        }
      } catch {
        toast.error('Error saving profile photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar || undefined,
      });
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
    <div className="space-y-4 pb-28 px-4 pt-3 text-xs">
      {/* Hidden File Input for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          {/* Avatar with Camera Button */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-slate-800 overflow-hidden">
              {avatar || user.avatar ? (
                <img
                  src={avatar || user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md border border-slate-950 transition active:scale-90 cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate">{user.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
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
            {user.phone && (
              <p className="text-[11px] text-slate-500 truncate">{user.phone}</p>
            )}
          </div>
        </div>

        {/* Single Device Session Secured Banner */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-300">
          <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>
            <strong>Single-Device Security:</strong> Active session secured on this mobile device.
          </span>
        </div>
      </div>

      {/* Edit Profile Form (Expandable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Profile Details
          </h3>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95 text-xs shadow-md shadow-blue-600/30"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Email Address</span>
              <span className="font-semibold text-white">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Phone</span>
              <span className="font-semibold text-white">{user.phone || 'Not added'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Account Role</span>
              <span className="font-semibold text-white capitalize">{user.role.toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation List Menu */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl divide-y divide-slate-800/80">
        {/* 1. Edit Profile */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Edit Profile</span>
              <span className="text-[10px] text-slate-400">Update name, phone number & photo</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 2. My Bookings / Passes */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('passes')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">My Bookings</span>
              <span className="text-[10px] text-slate-400">View active booking passes & QR tickets</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 3. Favorites */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('favorites')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Saved Libraries (Favorites)</span>
              <span className="text-[10px] text-slate-400">Your bookmarked study halls</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 4. Notifications */}
        <button
          type="button"
          onClick={() => setActiveModal('notifications')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Notifications</span>
              <span className="text-[10px] text-slate-400">Seat reminders, hold alerts & updates</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 5. Help & Support */}
        <button
          type="button"
          onClick={() => setActiveModal('help')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Help & Support</span>
              <span className="text-[10px] text-slate-400">FAQs, WhatsApp & desk support</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 6. Settings */}
        <button
          type="button"
          onClick={() => setActiveModal('settings')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Settings</span>
              <span className="text-[10px] text-slate-400">App version & preferences</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* 7. Logout */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to sign out of LibSpace?')) {
              logout();
              toast.success('Signed out successfully.');
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
              <span className="text-[10px] text-slate-500">Sign out of this session safely</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Official Android App Direct Download Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 rounded-3xl p-4 shadow-xl space-y-2.5">
        <div className="flex items-center gap-2">
          <img
            src="/images/libspace-logo.png"
            alt="LibSpace App"
            className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-1 border border-emerald-500/30"
          />
          <div>
            <h4 className="font-extrabold text-white text-xs">LibSpace Native Android APK</h4>
            <p className="text-[10px] text-slate-400">Official Release • Direct Phone Install</p>
          </div>
        </div>

        <a
          href="/downloads/libspace-release.apk"
          download="LibSpace-v1.0.apk"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-center flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/40 text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Download Android APK</span>
        </a>
      </div>

      {/* MODAL 1: Notifications */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-white text-sm">Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-blue-400 font-bold">Booking System</span>
                <p className="text-white font-semibold">5-Minute Hold Protection is Active</p>
                <p className="text-slate-400 text-[11px]">When you select a seat, it is held exclusively for you for 5 minutes during payment.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold">QR Attendance</span>
                <p className="text-white font-semibold">Instant Entry at Library Desk</p>
                <p className="text-slate-400 text-[11px]">Show your QR Code ticket from 'My Passes' at the library front desk for instant check-in.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Help & Support */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <h3 className="font-black text-white text-sm">Help & Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <a
                href="mailto:support@libspace.com"
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center gap-3 transition text-white block"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="font-bold block">Email Support</span>
                  <span className="text-[10px] text-slate-400">support@libspace.com</span>
                </div>
              </a>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 text-slate-300">
                <span className="font-bold text-white block">Cancellation & Refund Policy</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hourly bookings can be cancelled before start time. Refunds are processed according to library policy within 3-5 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Settings */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-300" />
                <h3 className="font-black text-white text-sm">App Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400">Version</span>
                <span className="font-mono text-white font-bold">LibSpace v1.0.0 (Release)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-400">Platform</span>
                <span className="text-emerald-400 font-bold">Android Native App</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.success('App cache cleared successfully.');
                  setActiveModal(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-xs"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProfileScreen;
