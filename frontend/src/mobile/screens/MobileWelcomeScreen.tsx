import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  QrCode,
  MapPin,
  ArrowRight,
  GraduationCap,
  Building2,
  Shield,
  Zap,
  Armchair,
  CheckCircle2,
  Lock,
  ChevronRight,
  Compass,
} from 'lucide-react';

interface MobileWelcomeScreenProps {
  onSelectRoleLogin: (role: UserRole) => void;
  onExploreAsGuest?: () => void;
}

export const MobileWelcomeScreen: React.FC<MobileWelcomeScreenProps> = ({
  onSelectRoleLogin,
  onExploreAsGuest,
}) => {
  const [activePartnerTab, setActivePartnerTab] = useState<'OWNER' | 'ADMIN'>('OWNER');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Native Header */}
      <div className="pt-6 pb-3 px-5 flex items-center justify-between border-b border-slate-900/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Armchair className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white leading-none">
              LibSpace
            </h1>
            <span className="text-[10px] font-bold text-blue-400 tracking-wide">
              Smart Study Desks
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-extrabold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Desks Available</span>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6 flex-1 flex flex-col justify-between">
        {/* Hero Section */}
        <div className="space-y-3 text-center pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
            <Zap className="w-3 h-3 text-blue-400" />
            <span>5-Min Instant Hold Protection</span>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight tracking-tight px-1">
            Book Your Quiet Desk.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Zero Queues, Zero Collisions.
            </span>
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Choose your exact seat on the live floor plan, lock it with 5-minute checkout protection, and enter with digital QR passes.
          </p>
        </div>

        {/* Interactive Live Floor Preview Card */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-black text-white">Central Study Wing • Floor 2</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">Desk Map Demo</span>
          </div>

          {/* Seat Grid Mini Demo */}
          <div className="grid grid-cols-4 gap-2 py-1">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center gap-1">
              <Armchair className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-mono font-bold text-emerald-300">A-01</span>
              <span className="text-[8px] font-black uppercase text-emerald-400/90">Open</span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500 flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-500/20">
              <Lock className="w-4 h-4 text-blue-400 animate-bounce" />
              <span className="text-[9px] font-mono font-bold text-white">A-02</span>
              <span className="text-[8px] font-black uppercase text-blue-300">Hold 4:58</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-rose-950/60 opacity-60 flex flex-col items-center justify-center gap-1">
              <Armchair className="w-4 h-4 text-rose-500" />
              <span className="text-[9px] font-mono font-bold text-slate-400">A-03</span>
              <span className="text-[8px] font-bold uppercase text-rose-400">Taken</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center gap-1">
              <Armchair className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-mono font-bold text-emerald-300">A-04</span>
              <span className="text-[8px] font-black uppercase text-emerald-400/90">Open</span>
            </div>
          </div>

          {/* Guarantee Pill */}
          <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Atomic Database Reservation
            </span>
            <span className="font-mono text-emerald-400 font-bold">100% Conflict-Free</span>
          </div>
        </div>

        {/* 4 Crisp Benefit Pills */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold text-white">5-Min Hold</h4>
              <p className="text-[9px] text-slate-400">Seat reserved while paying</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold text-white">Smart QR Pass</h4>
              <p className="text-[9px] text-slate-400">Instant punch check-in</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold text-white">Near Me GPS</h4>
              <p className="text-[9px] text-slate-400">Sort nearest libraries</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold text-white">Flexible Passes</h4>
              <p className="text-[9px] text-slate-400">Hourly, Day & Monthly</p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => onSelectRoleLogin('USER')}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <GraduationCap className="w-5 h-5" />
            <span>Student Sign In & Book Desk</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onExploreAsGuest) onExploreAsGuest();
              else onSelectRoleLogin('USER');
            }}
            className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Explore Libraries as Guest</span>
          </button>
        </div>

        {/* Staff & Governance Gateway Dock */}
        <div className="pt-2">
          <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-extrabold uppercase tracking-wider text-slate-400">
                Staff & Partners
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePartnerTab('OWNER')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition ${
                    activePartnerTab === 'OWNER'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Owner / Manager
                </button>
                <button
                  type="button"
                  onClick={() => setActivePartnerTab('ADMIN')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition ${
                    activePartnerTab === 'ADMIN'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin Portal
                </button>
              </div>
            </div>

            {activePartnerTab === 'OWNER' ? (
              <button
                type="button"
                onClick={() => onSelectRoleLogin('OWNER')}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-white group-hover:text-emerald-400 transition">
                      Library Owner & Manager Portal
                    </h5>
                    <p className="text-[9px] text-slate-400">Seat map, daily attendance & payouts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectRoleLogin('ADMIN')}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-white group-hover:text-purple-400 transition">
                      Admin & State Admin Governance
                    </h5>
                    <p className="text-[9px] text-slate-400">Library moderation, state approvals</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWelcomeScreen;
