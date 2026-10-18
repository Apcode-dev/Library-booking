import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User, Phone, Mail, Camera, Check, Sparkles, ShieldCheck, Building2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Milo',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Sophia',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePhotoTab, setActivePhotoTab] = useState<'presets' | 'upload' | 'url'>('presets');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });

      if (res.success) {
        toast.success('Profile updated successfully! 🎉');
        onClose();
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleBadges: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    USER: {
      label: 'Student Account',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: GraduationCap,
    },
    OWNER: {
      label: 'Library Owner',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Building2,
    },
    ADMIN: {
      label: 'Platform Admin',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: ShieldCheck,
    },
  };

  const roleMeta = roleBadges[user.role] || roleBadges.USER;
  const RoleIcon = roleMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleMeta.label}</span>
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          User Profile Settings
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Update your profile details, contact number, and avatar picture.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="relative group">
              <img
                src={avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + user.name}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-slate-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`;
                }}
              />
              <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Photo Selection Tabs */}
            <div className="w-full">
              <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold mb-3">
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('presets')}
                  className={`flex-1 py-1.5 rounded-lg transition ${activePhotoTab === 'presets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Avatar Avatars
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg transition ${activePhotoTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('url')}
                  className={`flex-1 py-1.5 rounded-lg transition ${activePhotoTab === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Image Link
                </button>
              </div>

              {activePhotoTab === 'presets' && (
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative rounded-full overflow-hidden border-2 p-0.5 transition ${
                        avatar === url ? 'border-blue-600 scale-105 shadow-sm' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx}`} className="w-9 h-9 rounded-full object-cover" />
                      {avatar === url && (
                        <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center rounded-full">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activePhotoTab === 'upload' && (
                <div>
                  <label className="flex items-center justify-center w-full py-2.5 px-4 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition">
                    <Camera className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-xs font-bold text-slate-700">Select Image File (Max 2MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}

              {activePhotoTab === 'url' && (
                <div>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Email (Disabled) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address (Verified)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
