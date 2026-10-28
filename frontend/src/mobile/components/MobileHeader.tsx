import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Building2, User as UserIcon, Wifi, WifiOff } from 'lucide-react';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-3 text-white transition-all shadow-md">
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Back Button OR Official Brand Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-1 text-slate-300 hover:text-white active:scale-95 bg-slate-900 border border-slate-800 rounded-xl transition"
              aria-label="Back"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src="/images/libspace-logo.png"
                alt="LibSpace Logo"
                className="w-9 h-9 rounded-xl object-contain bg-slate-900 border border-slate-800 shadow-sm"
              />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight leading-none bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  LibSpace
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mt-0.5">
                  Find • Book • Study
                </span>
              </div>
            </div>
          )}

          {title && showBack && (
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-bold text-white truncate leading-tight">{title}</h1>
              {subtitle && <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right Side: Network Indicator + Role Badge or Custom Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOnline && (
            <span className="flex items-center gap-1 text-[10px] bg-red-950/80 text-red-400 px-2 py-0.5 rounded-full border border-red-800 font-semibold">
              <WifiOff className="w-3 h-3 animate-pulse" />
              <span>Offline</span>
            </span>
          )}

          {rightAction ? (
            rightAction
          ) : user ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
              {user.role === 'ADMIN' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              ) : user.role === 'OWNER' ? (
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="text-[11px] font-bold capitalize max-w-[80px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Student
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
