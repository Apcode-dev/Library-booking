import React from 'react';
import { Compass, Ticket, Building2, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type MobileTab = 'explore' | 'passes' | 'owner' | 'admin' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  activePassCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  activePassCount = 0,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
        {/* Tab 1: Explore */}
        <button
          onClick={() => onSelectTab('explore')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeTab === 'explore'
              ? 'text-blue-400 font-extrabold bg-blue-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 ${activeTab === 'explore' ? 'scale-110' : ''}`} />
            {activeTab === 'explore' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Explore</span>
        </button>

        {/* Tab 2: Passes / Tickets */}
        <button
          onClick={() => onSelectTab('passes')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeTab === 'passes'
              ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Ticket className={`w-5 h-5 ${activeTab === 'passes' ? 'scale-110' : ''}`} />
            {activePassCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {activePassCount}
              </span>
            )}
            {activeTab === 'passes' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">My Passes</span>
        </button>

        {/* Tab 3: Owner Portal */}
        <button
          onClick={() => onSelectTab('owner')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeTab === 'owner'
              ? 'text-amber-400 font-extrabold bg-amber-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Building2 className={`w-5 h-5 ${activeTab === 'owner' ? 'scale-110' : ''}`} />
            {activeTab === 'owner' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Owner Hub</span>
        </button>

        {/* Tab 4: Admin Portal (or State Governance) */}
        <button
          onClick={() => onSelectTab('admin')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeTab === 'admin'
              ? 'text-purple-400 font-extrabold bg-purple-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'scale-110' : ''}`} />
            {activeTab === 'admin' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">
            {isAdmin ? 'Admin' : 'Governance'}
          </span>
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeTab === 'profile'
              ? 'text-blue-400 font-extrabold bg-blue-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'scale-110' : ''}`} />
            {activeTab === 'profile' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Account</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
