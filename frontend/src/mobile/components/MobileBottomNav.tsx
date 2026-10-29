import React from 'react';
import {
  Compass,
  Ticket,
  Heart,
  User,
  LayoutDashboard,
  CalendarCheck,
  Building2,
  QrCode,
  ShieldCheck,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type MobileTab =
  // Student Tabs
  | 'explore'
  | 'passes'
  | 'favorites'
  | 'profile'
  // Owner Tabs
  | 'owner_dashboard'
  | 'owner_bookings'
  | 'owner_branches'
  | 'owner_attendance'
  | 'owner_profile'
  // Admin Tabs
  | 'admin_dashboard'
  | 'admin_state_admins'
  | 'admin_libraries'
  | 'admin_approvals'
  | 'admin_users'
  | 'admin_profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  activePassCount?: number;
  pendingApprovalsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  activePassCount = 0,
  pendingApprovalsCount = 0,
}) => {
  const { user } = useAuth();

  // Role Detection
  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isSubAdmin = isAdmin && user?.adminType === 'SUB_ADMIN';
  const isMasterAdmin = isAdmin && !isSubAdmin;

  // ----------------------------------------------------
  // 1. OWNER NAVIGATION BAR (5 TABS)
  // ----------------------------------------------------
  if (isOwner) {
    const ownerTabs: Array<{ id: MobileTab; label: string; icon: any }> = [
      { id: 'owner_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'owner_bookings', label: 'Bookings', icon: CalendarCheck },
      { id: 'owner_branches', label: 'Branches', icon: Building2 },
      { id: 'owner_attendance', label: 'Attendance', icon: QrCode },
      { id: 'owner_profile', label: 'Profile', icon: User },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
          {ownerTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-extrabold bg-amber-500/10'
                    : 'text-slate-400 font-medium hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ----------------------------------------------------
  // 2. MASTER ADMIN NAVIGATION BAR (4 TABS)
  // ----------------------------------------------------
  if (isMasterAdmin) {
    const masterTabs: Array<{ id: MobileTab; label: string; icon: any; badge?: number }> = [
      { id: 'admin_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admin_state_admins', label: 'Admins', icon: ShieldCheck },
      { id: 'admin_approvals', label: 'Approvals', icon: CheckCircle2, badge: pendingApprovalsCount },
      { id: 'admin_profile', label: 'Profile', icon: User },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-purple-900/40 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 text-center">
          {masterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-purple-400 font-extrabold bg-purple-500/10'
                    : 'text-slate-400 font-medium hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400"></span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ----------------------------------------------------
  // 3. STATE ADMIN NAVIGATION BAR (5 TABS)
  // ----------------------------------------------------
  if (isSubAdmin) {
    const subAdminTabs: Array<{ id: MobileTab; label: string; icon: any; badge?: number }> = [
      { id: 'admin_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admin_libraries', label: 'Library', icon: Building2 },
      { id: 'admin_approvals', label: 'Approvals', icon: CheckCircle2, badge: pendingApprovalsCount },
      { id: 'admin_users', label: 'Users', icon: Users },
      { id: 'admin_profile', label: 'Profile', icon: User },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-purple-900/40 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
          {subAdminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-purple-400 font-extrabold bg-purple-500/10'
                    : 'text-slate-400 font-medium hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400"></span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ----------------------------------------------------
  // 4. STUDENT / USER NAVIGATION BAR (EXACTLY 4 TABS)
  // ----------------------------------------------------
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1 text-center">
        {/* Tab 1: Explore */}
        <button
          type="button"
          onClick={() => onSelectTab('explore')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
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

        {/* Tab 2: My Passes */}
        <button
          type="button"
          onClick={() => onSelectTab('passes')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
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

        {/* Tab 3: Favorites */}
        <button
          type="button"
          onClick={() => onSelectTab('favorites')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === 'favorites'
              ? 'text-rose-400 font-extrabold bg-rose-500/10'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'scale-110 fill-rose-500 text-rose-500' : ''}`} />
            {activeTab === 'favorites' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-400"></span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Favorites</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
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
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
