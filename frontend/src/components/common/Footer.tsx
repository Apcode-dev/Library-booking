import React from 'react';
import { BookOpen, Heart, Shield, Sparkles, MapPin, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">LibSpace</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Find, verify, and reserve quiet study desks, WiFi pods, and air-conditioned library seats across Delhi-NCR and India.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">For Seekers & Students</h4>
            <ul className="space-y-2 text-xs">
              <li>Nearby Libraries Search</li>
              <li>Real-time Seat Map Grid</li>
              <li>Hourly Flexible Booking</li>
              <li>5-Minute Temporary Seat Hold</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">For Library Owners</h4>
            <ul className="space-y-2 text-xs">
              <li>List Your Study Space</li>
              <li>Real-time Occupancy Tracker</li>
              <li>Direct UPI Payouts</li>
              <li>Seat Zone Customizer</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Platform Guarantee</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <span>Zero Double-Booking Guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Clock className="w-4 h-4" />
                <span>Instant QR Check-in Pass</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Verified Clean & Quiet Facilities</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>© 2026 LibSpace Platform. Built with React, Tailwind CSS, Node.js, Express & PostgreSQL.</p>
          <p className="flex items-center gap-1">
            Engineered for high-concurrency seat locking
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
