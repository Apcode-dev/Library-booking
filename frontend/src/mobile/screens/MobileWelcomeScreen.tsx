import React from 'react';
import { UserRole } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  QrCode,
  Calendar,
  Wifi,
  MapPin,
  Lock,
  ArrowRight,
  GraduationCap,
  Building2,
  Shield,
  Compass,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface MobileWelcomeScreenProps {
  onSelectRoleLogin: (role: UserRole) => void;
  onExploreAsGuest: () => void;
}

export const MobileWelcomeScreen: React.FC<MobileWelcomeScreenProps> = ({
  onSelectRoleLogin,
  onExploreAsGuest,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12 selection:bg-blue-600 selection:text-white">
      {/* Top Brand Header Bar */}
      <div className="pt-8 pb-4 px-5 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/libspace-logo.png"
            alt="LibSpace"
            className="w-8 h-8 rounded-xl object-contain bg-slate-900 p-1 border border-slate-800"
          />
          <div>
            <h1 className="text-base font-black tracking-tight text-white leading-tight">
              LibSpace
            </h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              Study Desk Network
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExploreAsGuest}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <span>Skip to Explore</span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>

      <div className="px-5 pt-6 space-y-7">
        {/* Hero Section */}
        <div className="space-y-3.5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-400 text-[11px] font-extrabold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>5-Minute Hold Protection</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            Reserve Your Silent Study Desk With{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              5-Minute Hold Protection
            </span>
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            No physical queues, zero double-booking risk. Pick your exact desk, reserve with transactional lock protection, and check in with contactless digital QR passes.
          </p>
        </div>

        {/* Primary Call to Action: Create Student Account */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectRoleLogin('USER')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <GraduationCap className="w-5 h-5" />
            <span>🎓 Create Free Student Account Now</span>
          </button>
          <p className="text-center text-[10px] text-slate-500 font-medium">
            Instant free registration • Lock desks in 30 seconds
          </p>
        </div>

        {/* Aspirant Superpowers Section */}
        <div className="space-y-4 pt-2">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Aspirant Superpowers
            </span>
            <h3 className="text-lg font-black text-white">
              Everything Students & Readers Get
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Engineered specifically for UPSC, CA, NEET, JEE, and competitive exam preparation where every distraction-free hour matters.
            </p>
          </div>

          {/* 6 Feature Superpower Cards */}
          <div className="grid grid-cols-1 gap-3">
            {/* 1. Real-Time Interactive Seat Grid */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  Real-Time Interactive Seat Grid
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  View the live floor plan before arriving. Pick your favorite window seat, corner desk, or cabin next to power outlets.
                </p>
              </div>
            </div>

            {/* 2. 5-Minute Temporary Payment Hold */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  5-Minute Temporary Payment Hold
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  As soon as you tap an open seat, our server locks it exclusively for you for 5 minutes while you enter your UPI/card details.
                </p>
              </div>
            </div>

            {/* 3. Zero Double-Booking Guarantee */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  Zero Double-Booking Guarantee
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Backed by database-level transactional locks preventing collisions even during high-demand morning rush hours.
                </p>
              </div>
            </div>

            {/* 4. Digital QR Entry Pass */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  Digital QR Entry Pass
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Instant smartphone check-in pass. Scan at the study hall entrance for contactless access without physical paper registers.
                </p>
              </div>
            </div>

            {/* 5. Hourly & Monthly Pass Desks */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 border border-sky-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  Hourly & Monthly Pass Desks
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Flexible study plans: Book hourly study slots or reserve long-term monthly and yearly dedicated pass desks.
                </p>
              </div>
            </div>

            {/* 6. Filtered Study Amenities */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white">
                  Filtered Study Amenities
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Easily filter by high-speed fiber Wi-Fi, air conditioning, private charging points, drinking water, and silent study zones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Login Cards Gateway */}
        <div className="space-y-3 pt-3">
          <div className="text-center space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Select Your Portal
            </span>
            <h4 className="text-sm font-extrabold text-white">
              Log In to Your Dedicated Dashboard
            </h4>
          </div>

          <div className="space-y-2.5">
            {/* Student Login Card */}
            <button
              type="button"
              onClick={() => onSelectRoleLogin('USER')}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 p-3.5 rounded-2xl flex items-center justify-between text-left transition active:scale-[0.99] cursor-pointer group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 group-hover:scale-110 transition" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                    Student / Aspirant Login
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Book seats, access digital QR passes, save favorite desks
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition flex-shrink-0" />
            </button>

            {/* Library Owner Login Card */}
            <button
              type="button"
              onClick={() => onSelectRoleLogin('OWNER')}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-2xl flex items-center justify-between text-left transition active:scale-[0.99] cursor-pointer group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 group-hover:scale-110 transition" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                    Library Owner Portal
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Branches console, day attendance, seat map & payouts
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition flex-shrink-0" />
            </button>

            {/* Admin Login Card */}
            <button
              type="button"
              onClick={() => onSelectRoleLogin('ADMIN')}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 p-3.5 rounded-2xl flex items-center justify-between text-left transition active:scale-[0.99] cursor-pointer group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/15 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 group-hover:scale-110 transition" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-purple-400 transition">
                    Admin / State Admin Console
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Library approvals, State Admins directory & governance
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Continue As Guest */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onExploreAsGuest}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer py-2 px-4 rounded-xl bg-slate-900/60 border border-slate-800 active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Continue as Guest to Browse Libraries</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileWelcomeScreen;
