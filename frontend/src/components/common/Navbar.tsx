import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  MapPin,
  CalendarCheck,
  Building2,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Smartphone,
  Download,
} from 'lucide-react';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAuthRole, setSelectedAuthRole] = useState<UserRole>('USER');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PWA App Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        '📱 To Install LibSpace App on your phone/device:\n\n1. In your browser menu (tap ⋮ or Share icon)\n2. Select "Add to Home screen" or "Install App"\n3. LibSpace will be installed with the official app icon!'
      );
    }
  };

  const openAuthWithRole = (role: UserRole) => {
    setSelectedAuthRole(role);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleOwnerClick = () => {
    if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
      navigate('/owner');
    } else {
      openAuthWithRole('OWNER');
    }
  };

  const handleAdminClick = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      openAuthWithRole('ADMIN');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Official Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/images/libspace-logo.png"
                alt="LibSpace Official Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent tracking-tight leading-none">
                  LibSpace
                </span>
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-500 mt-0.5">
                  Find • Book • Study
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {/* Unauthenticated or Student View */}
              {(!user || user.role === 'USER') && (
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive('/')
                      ? 'text-blue-600 bg-blue-50 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Find Libraries</span>
                </Link>
              )}

              {/* Unauthenticated Quick Portal Access */}
              {!user && (
                <>
                  <Link
                    to="/owner"
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isActive('/owner')
                        ? 'text-amber-700 bg-amber-50 font-extrabold'
                        : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Owner Portal</span>
                  </Link>

                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isActive('/admin')
                        ? 'text-purple-700 bg-purple-50 font-extrabold'
                        : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin Portal</span>
                  </Link>
                </>
              )}

              {user?.role === 'USER' && (
                <Link
                  to="/my-bookings"
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive('/my-bookings')
                      ? 'text-blue-600 bg-blue-50 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>My Passes</span>
                </Link>
              )}

              {/* Owner View (Show only if logged in as OWNER) */}
              {user?.role === 'OWNER' && (
                <Link
                  to="/owner"
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive('/owner')
                      ? 'text-amber-700 bg-amber-50 font-extrabold'
                      : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Owner Console</span>
                </Link>
              )}

              {/* Admin View (Show only if logged in as ADMIN) */}
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive('/admin')
                      ? 'text-purple-700 bg-purple-50 font-extrabold'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin Console</span>
                </Link>
              )}
            </nav>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center gap-2.5">
              {user ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    title="Click to view & edit profile"
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 py-1.5 px-3 rounded-full border border-slate-200 transition group cursor-pointer"
                  >
                    <img
                      src={user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-white group-hover:scale-105 transition"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block leading-tight group-hover:text-blue-600 transition">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block">
                        {user.role}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAuthWithRole('USER')}
                    className="px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition"
                  >
                    Student Login / Register
                  </button>
                  <button
                    onClick={() => openAuthWithRole('USER')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition"
                  >
                    Get Started Free
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-3 shadow-xl">
            {user ? (
              <button
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 p-3 bg-blue-50/70 hover:bg-blue-100/80 rounded-2xl border border-blue-100 transition cursor-pointer"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>{user.name}</span>
                    <span className="text-[10px] text-blue-600 font-extrabold underline">Edit Profile</span>
                  </div>
                  <div className="text-xs text-blue-600 font-semibold">{user.email}</div>
                  <span className="inline-block mt-0.5 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => openAuthWithRole('USER')}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
              >
                <span>🎓 Student Sign In / Register</span>
              </button>
            )}

            <div className="space-y-1 pt-1">
              {(!user || user.role === 'USER') && (
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                >
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Find Libraries
                </Link>
              )}

              {!user && (
                <>
                  <Link
                    to="/owner"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-amber-50 font-semibold text-xs text-left"
                  >
                    <Building2 className="w-4 h-4 text-amber-600" />
                    Owner Portal
                  </Link>

                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-purple-50 font-semibold text-xs text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Admin Portal
                  </Link>
                </>
              )}

              {user?.role === 'USER' && (
                <Link
                  to="/my-bookings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                >
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  My Booking Passes
                </Link>
              )}

              {user?.role === 'OWNER' && (
                <Link
                  to="/owner"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs text-left"
                >
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Owner Console
                </Link>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Admin Console
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold text-xs rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => openAuthWithRole('USER')}
                  className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal with Initial Role */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={selectedAuthRole}
      />

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
