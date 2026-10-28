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
import MobileOwnerScreen from './screens/MobileOwnerScreen';
import MobileAdminScreen from './screens/MobileAdminScreen';
import MobileProfileScreen from './screens/MobileProfileScreen';

export const MobileAppShell: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<MobileTab>('explore');
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  // Global Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('USER');

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
        } else if (activeTab !== 'explore') {
          setActiveTab('explore');
        } else {
          CapApp.exitApp();
        }
      });
    } catch (_) {}

    return () => {
      backHandler?.then?.((sub: any) => sub.remove());
    };
  }, [isAuthModalOpen, selectedLibrary, activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Native App Top Header (hidden when on library details which has custom hero back header) */}
      {!selectedLibrary && (
        <MobileHeader
          rightAction={
            !user ? (
              <button
                type="button"
                onClick={() => openAuth('USER')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95"
              >
                Sign In
              </button>
            ) : undefined
          }
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {selectedLibrary ? (
          <MobileLibraryDetailsScreen
            library={selectedLibrary}
            onBack={() => setSelectedLibrary(null)}
            onBookingConfirmed={(booking) => {
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
        ) : activeTab === 'owner' ? (
          <MobileOwnerScreen onOpenAuth={() => openAuth('OWNER')} />
        ) : activeTab === 'admin' ? (
          <MobileAdminScreen onOpenAuth={() => openAuth('ADMIN')} />
        ) : (
          <MobileProfileScreen onOpenAuth={() => openAuth('USER')} />
        )}
      </main>

      {/* Native Bottom Navigation Bar */}
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

      {/* Global Auth Modal */}
      <MobileAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRole={authInitialRole}
      />
    </div>
  );
};

export default MobileAppShell;
