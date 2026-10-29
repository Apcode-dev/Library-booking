import React, { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../context/AuthContext';
import { Library, UserRole } from '../types';
import MobileHeader from './components/MobileHeader';
import MobileBottomNav, { MobileTab } from './components/MobileBottomNav';
import MobileAuthModal from './components/MobileAuthModal';
import MobileStudentHomeScreen from './screens/MobileStudentHomeScreen';
import MobileLibraryDetailsScreen from './screens/MobileLibraryDetailsScreen';
import MobilePassesScreen from './screens/MobilePassesScreen';
import MobileFavoritesScreen from './screens/MobileFavoritesScreen';
import MobileOwnerScreen from './screens/MobileOwnerScreen';
import MobileAdminScreen from './screens/MobileAdminScreen';
import MobileProfileScreen from './screens/MobileProfileScreen';
import { Sparkles, Building2, ShieldCheck, User as UserIcon } from 'lucide-react';

export const MobileAppShell: React.FC = () => {
  const { user } = useAuth();

  // App Launch Splash Screen State (1.5 seconds)
  const [showSplash, setShowSplash] = useState(true);

  // Default activeTab based on user role
  const getInitialTab = (role?: string): MobileTab => {
    if (role === 'OWNER') return 'owner_dashboard';
    if (role === 'ADMIN') return 'admin_dashboard';
    return 'explore';
  };

  const [activeTab, setActiveTab] = useState<MobileTab>(() => getInitialTab(user?.role));
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  // Global Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('USER');

  // Splash Screen Timer
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(splashTimer);
  }, []);

  // Update tab automatically when user signs in or out
  useEffect(() => {
    if (user?.role === 'OWNER') {
      if (!activeTab.startsWith('owner_')) {
        setActiveTab('owner_dashboard');
      }
    } else if (user?.role === 'ADMIN') {
      if (!activeTab.startsWith('admin_')) {
        setActiveTab('admin_dashboard');
      }
    } else {
      if (activeTab.startsWith('owner_') || activeTab.startsWith('admin_')) {
        setActiveTab('explore');
      }
    }
  }, [user]);

  const openAuth = (role: UserRole = 'USER') => {
    setAuthInitialRole(role);
    setIsAuthModalOpen(true);
  };

  // Android Hardware Back Button Handling
  useEffect(() => {
    let backHandler: any;
    try {
      backHandler = CapApp.addListener('backButton', () => {
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (selectedLibrary) {
          setSelectedLibrary(null);
        } else if (user?.role === 'OWNER') {
          if (activeTab !== 'owner_dashboard') setActiveTab('owner_dashboard');
          else CapApp.exitApp();
        } else if (user?.role === 'ADMIN') {
          if (activeTab !== 'admin_dashboard') setActiveTab('admin_dashboard');
          else CapApp.exitApp();
        } else {
          if (activeTab !== 'explore') setActiveTab('explore');
          else CapApp.exitApp();
        }
      });
    } catch (_) {}

    return () => {
      backHandler?.then?.((sub: any) => sub.remove());
    };
  }, [isAuthModalOpen, selectedLibrary, activeTab, user]);

  // =========================================================================
  // 1. APP OPEN SPLASH SCREEN (Official LibSpace Brand Identity)
  // =========================================================================
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
        {/* Ambient Brand Glow */}
        <div className="absolute w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute w-60 h-60 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="relative inline-block">
            <img
              src="/images/libspace-logo.png"
              alt="LibSpace Official Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-contain shadow-2xl border-2 border-slate-800 bg-slate-900/80 p-2.5 mx-auto animate-bounce duration-1000"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-500 bg-clip-text text-transparent tracking-tight">
              LibSpace
            </h1>
            <p className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
              Find • Book • Study
            </p>
          </div>

          <div className="pt-8">
            <div className="w-28 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono tracking-wider">
          LibSpace Android Release v1.0 • Verified Network
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN APP SHELL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      {!selectedLibrary && (
        <MobileHeader
          rightAction={
            !user ? (
              <button
                type="button"
                onClick={() => openAuth('USER')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer"
              >
                Sign In
              </button>
            ) : undefined
          }
        />
      )}

      {/* Main Content View */}
      <main className="flex-1 overflow-x-hidden">
        {selectedLibrary ? (
          <MobileLibraryDetailsScreen
            library={selectedLibrary}
            onBack={() => setSelectedLibrary(null)}
            onBookingConfirmed={() => {
              setSelectedLibrary(null);
              setActiveTab('passes');
            }}
            onOpenAuth={() => openAuth('USER')}
          />
        ) : activeTab === 'explore' ? (
          <MobileStudentHomeScreen
            onSelectLibrary={(lib) => setSelectedLibrary(lib)}
            onOpenAuth={() => openAuth('USER')}
          />
        ) : activeTab === 'passes' ? (
          <MobilePassesScreen
            onOpenAuth={() => openAuth('USER')}
            onExplore={() => setActiveTab('explore')}
          />
        ) : activeTab === 'favorites' ? (
          <MobileFavoritesScreen
            onSelectLibrary={(lib) => setSelectedLibrary(lib)}
            onExplore={() => setActiveTab('explore')}
          />
        ) : activeTab === 'profile' ? (
          <MobileProfileScreen
            onOpenAuth={() => openAuth('USER')}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        ) : activeTab.startsWith('owner_') ? (
          <MobileOwnerScreen
            activeTab={activeTab}
            onNavigateTab={(tab) => setActiveTab(tab as MobileTab)}
            onOpenAuth={() => openAuth('OWNER')}
          />
        ) : activeTab.startsWith('admin_') ? (
          <MobileAdminScreen
            activeTab={activeTab}
            onNavigateTab={(tab) => setActiveTab(tab as MobileTab)}
            onOpenAuth={() => openAuth('ADMIN')}
          />
        ) : (
          <MobileStudentHomeScreen
            onSelectLibrary={(lib) => setSelectedLibrary(lib)}
            onOpenAuth={() => openAuth('USER')}
          />
        )}
      </main>

      {/* Native Role-Specific Bottom Navigation Bar */}
      {!selectedLibrary && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedLibrary(null);
            setActiveTab(tab);
          }}
          activePassCount={0}
        />
      )}

      {/* Global Mobile Auth Modal */}
      <MobileAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRole={authInitialRole}
        onSuccess={() => {
          // Auto switch to correct portal tab on successful auth
          if (authInitialRole === 'OWNER') setActiveTab('owner_dashboard');
          else if (authInitialRole === 'ADMIN') setActiveTab('admin_dashboard');
          else setActiveTab('explore');
        }}
      />
    </div>
  );
};

export default MobileAppShell;
