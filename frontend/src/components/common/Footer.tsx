import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import AuthModal from './AuthModal';
import {
  BookOpen,
  Building2,
  ShieldCheck,
  Shield,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  Lock,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>('OWNER');

  const handleOwnerClick = () => {
    if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
      navigate('/owner');
    } else {
      setAuthRole('OWNER');
      setIsAuthModalOpen(true);
    }
  };

  const handleAdminClick = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      setAuthRole('ADMIN');
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800/80 pt-16 pb-12 relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* ======================================================== */}
          {/* PRO DEVELOPER ENTERPRISE PORTALS BANNER (Owner & Admin) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 🏢 Library Owner Partner Portal Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 rounded-3xl border border-amber-500/20 shadow-xl shadow-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 group hover:border-amber-500/40 transition">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PARTNER ECOSYSTEM
                  </span>
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Have a Library or Private Study Hall?
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                  Partner with LibSpace. Maximize seat occupancy, manage up to 5 branches with 6-digit master PIN security, and automate UPI payouts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOwnerClick}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-600/25 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-yellow-200" />
                <span>🏢 List Your Library (Owner)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 🛡️ Platform Governance & Administration Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 rounded-3xl border border-purple-500/20 shadow-xl shadow-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 group hover:border-purple-500/40 transition">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    GOVERNANCE & AUDIT
                  </span>
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Platform Administration & Oversight
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                  State-wise verification console, 1 admin per state governance, escalated queue moderation, and national financial oversight.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdminClick}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-200" />
                <span>🛡️ Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4-COLUMN COMPREHENSIVE FOOTER DIRECTORY */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
            {/* Column 1: Brand & Technology Architecture */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-white tracking-tight block leading-tight">
                    LibSpace
                  </span>
                  <span className="text-[10px] text-blue-400 uppercase tracking-widest font-extrabold">
                    Seat Booking Platform
                  </span>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                India's decentralized private study desk reservation infrastructure. Built for quiet academic focus with 5-minute transactional hold protection, visual seat matrices, and contactless QR access.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  System Operational
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300">
                  <Lock className="w-3 h-3 text-blue-400" />
                  AES-256 JWT Single-Device
                </span>
              </div>
            </div>

            {/* Column 2: For Students & Seekers */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                For Students & Seekers
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link to="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Nearby Libraries & Study Halls</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Real-Time Visual Seat Matrix</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Hourly & Flexible Reservations</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Monthly & Yearly VIP Study Passes</span>
                  </Link>
                </li>
                <li>
                  <Link to="/my-bookings" className="hover:text-blue-400 transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Instant Digital QR Tickets</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: For Library Space Owners */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Partner With LibSpace
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-amber-500" />
                    <span>List Your Library Space (Owner Portal)</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Multi-Branch Master Console (Max 5)</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>6-Digit Security PIN Protection</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Live Gate Scanner & Attendance Log</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>Automated UPI Settlement & Earnings</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Platform Integrity & Administration */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Platform Governance
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={handleAdminClick}
                    className="text-purple-400 hover:text-purple-300 font-bold transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-purple-500" />
                    <span>Administrator Console (State & Central)</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleAdminClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>1 Sub-Admin per State Hierarchy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleAdminClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>State Moderation & Escalated Queue</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleAdminClick}
                    className="hover:text-slate-200 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span>User & Owner Verification Management</span>
                  </button>
                </li>
                <li>
                  <div className="pt-2 flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Zero Double-Booking Guarantee</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM LEGAL & COPYRIGHT BAR */}
          {/* ======================================================== */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>© 2026 LibSpace Platform Inc. All rights reserved. Built with React, Tailwind CSS, TypeScript, Express & PostgreSQL.</p>

            <div className="flex flex-wrap items-center gap-4 text-slate-400">
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleOwnerClick}
                className="hover:text-amber-400 transition cursor-pointer"
              >
                Owner Portal
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleAdminClick}
                className="hover:text-purple-400 transition cursor-pointer"
              >
                Admin Console
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">Security & Hold Protection</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Auth Modal for Footer Clicks */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={authRole}
      />
    </>
  );
};

export default Footer;
