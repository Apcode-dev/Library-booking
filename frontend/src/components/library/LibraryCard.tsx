import React from 'react';
import { Link } from 'react-router-dom';
import { Library } from '../../types';
import { Star, MapPin, Armchair, Wifi, Wind, Zap, ShieldCheck, ChevronRight, Crown } from 'lucide-react';

interface LibraryCardProps {
  library: Library;
}

export const LibraryCard: React.FC<LibraryCardProps> = ({ library }) => {
  const photo = library.photos?.[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=80';
  const hasMembership = library.enableMembership !== false && (library.enableMonthly !== false || library.enableYearly !== false);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Thumbnail Header */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
        <img
          src={photo}
          alt={library.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

        {/* Rating Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 shadow">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{library.rating}</span>
          <span className="text-slate-400 font-normal">({library.reviewCount || 12})</span>
        </div>

        {/* Premium Pass Available or Hourly Only Badge */}
        {hasMembership ? (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/20">
            <Crown className="w-3 h-3 text-amber-200" />
            <span>👑 PASSES AVAILABLE</span>
          </div>
        ) : (
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] font-bold px-2 py-1 rounded-full shadow border border-slate-700">
            <span>⏱️ HOURLY ONLY</span>
          </div>
        )}

        {/* Distance Badge if available */}
        {library.distanceKm !== null && library.distanceKm !== undefined && (
          <div className="absolute top-11 right-3 bg-blue-600/95 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{library.distanceKm} km</span>
          </div>
        )}

        {/* Pricing Pill bottom-right */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow font-extrabold text-slate-900 text-sm">
          <span className="text-blue-600 text-base">₹{library.hourlyRate}</span>
          <span className="text-[11px] font-medium text-slate-500"> / hr</span>
        </div>

        {/* Operating Hours bottom-left */}
        <div className="absolute bottom-3 left-3 text-white text-[11px] font-medium opacity-90 drop-shadow">
          ⏰ {library.openingTime} - {library.closingTime}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
              {library.name}
            </h3>
          </div>

          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {library.address}{library.district ? `, ${library.district}` : ''}, {library.city}, {library.state} - {library.pincode}
          </p>

          {library.tagline && (
            <p className="text-xs text-slate-600 mt-1.5 italic line-clamp-1 font-normal">
              "{library.tagline}"
            </p>
          )}

          {/* Membership Plans Details Preview Box */}
          {hasMembership ? (
            <div className="mt-2.5 p-2.5 bg-gradient-to-r from-purple-50/80 via-indigo-50/80 to-blue-50/80 border border-purple-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-950">
                <span className="flex items-center gap-1 text-purple-700">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Premium Membership Plans:
                </span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-bold">Entry Pass</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {library.enableMonthly !== false && (
                  <span className="px-2 py-0.5 bg-white rounded-lg border border-purple-200 text-purple-900 font-bold shadow-2xs">
                    👑 Monthly: <strong className="text-purple-700">₹{library.monthlyRate || Math.round(library.hourlyRate * 80)}</strong>/mo
                  </span>
                )}
                {library.enableYearly !== false && (
                  <span className="px-2 py-0.5 bg-white rounded-lg border border-amber-200 text-amber-950 font-bold shadow-2xs">
                    👑 Yearly VIP: <strong className="text-amber-750 text-amber-800">₹{library.yearlyRate || (library.monthlyRate ? library.monthlyRate * 10 : Math.round(library.hourlyRate * 750))}</strong>/yr
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
              <span>⏱️ Hourly Slots Available • Regular Daily Study</span>
            </div>
          )}

          {/* Facility Chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {library.facilities.slice(0, 4).map((facility, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
              >
                {facility}
              </span>
            ))}
            {library.facilities.length > 4 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                +{library.facilities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{library.availableSeats || library.totalSeats} seats open</span>
          </div>

          <Link
            to={`/library/${library.slug || library.id}`}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-xs font-bold transition duration-200 shadow-sm"
          >
            <span>Book Seat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LibraryCard;
