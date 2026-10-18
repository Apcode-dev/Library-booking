import React, { useState } from 'react';
import { SeatZone, Seat } from '../../types';
import { Armchair, Zap, Lightbulb, Lock, Check, ShieldAlert, Sparkles } from 'lucide-react';

interface InteractiveSeatGridProps {
  zones: SeatZone[];
  selectedSeat: Seat | null;
  onSelectSeat: (seat: Seat) => void;
  isLoading?: boolean;
  selectedPlan?: 'HOURLY' | 'MONTHLY' | 'YEARLY';
  onPlanChange?: (plan: 'HOURLY' | 'MONTHLY' | 'YEARLY') => void;
}

export const InteractiveSeatGrid: React.FC<InteractiveSeatGridProps> = ({
  zones,
  selectedSeat,
  onSelectSeat,
  isLoading,
  selectedPlan,
  onPlanChange,
}) => {
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  // Helper to infer plan from zone name or seats
  const getZonePlan = (zone: SeatZone): 'HOURLY' | 'MONTHLY' | 'YEARLY' => {
    const nameLower = (zone.name || '').toLowerCase();
    if (nameLower.includes('monthly') || nameLower.includes('month')) return 'MONTHLY';
    if (nameLower.includes('yearly') || nameLower.includes('vip') || nameLower.includes('year')) return 'YEARLY';
    if (nameLower.includes('hourly') || nameLower.includes('desk') || nameLower.includes('study')) return 'HOURLY';
    if (zone.seats && zone.seats.length > 0) {
      const firstCat = (zone.seats[0] as any).category;
      if (firstCat === 'MONTHLY' || firstCat === 'YEARLY' || firstCat === 'HOURLY') {
        return firstCat;
      }
    }
    return 'HOURLY';
  };

  // Auto-switch to matching zone when selectedPlan changes
  React.useEffect(() => {
    if (selectedPlan && zones && zones.length > 0) {
      const matchIndex = zones.findIndex((z) => {
        const nameLower = z.name.toLowerCase();
        if (selectedPlan === 'MONTHLY' && (nameLower.includes('monthly') || nameLower.includes('month'))) return true;
        if (selectedPlan === 'YEARLY' && (nameLower.includes('yearly') || nameLower.includes('vip') || nameLower.includes('year'))) return true;
        if (selectedPlan === 'HOURLY' && (nameLower.includes('hourly') || nameLower.includes('desk') || nameLower.includes('study'))) return true;
        return z.seats.some((s: any) => s.category === selectedPlan);
      });
      if (matchIndex !== -1 && matchIndex !== activeZoneIndex) {
        setActiveZoneIndex(matchIndex);
      }
    }
  }, [selectedPlan, zones]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-600">
          Fetching real-time seat status from database...
        </p>
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-sm">
        No seat zones configured for this library yet.
      </div>
    );
  }

  const currentZone = zones[activeZoneIndex] || zones[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Zone Tabs Header */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-blue-600" />
            Interactive Desk & Seat Layout
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any green available desk to select and lock it for payment.
          </p>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl">
          {zones.map((zone, idx) => {
            const isPlanMatch =
              (selectedPlan === 'MONTHLY' && (zone.name.includes('Monthly') || zone.name.includes('Month'))) ||
              (selectedPlan === 'YEARLY' && (zone.name.includes('Yearly') || zone.name.includes('VIP'))) ||
              (selectedPlan === 'HOURLY' && (zone.name.includes('Hourly') || (!zone.name.includes('Monthly') && !zone.name.includes('Yearly'))));

            return (
              <button
                key={zone.id}
                onClick={() => {
                  setActiveZoneIndex(idx);
                  const inferredPlan = getZonePlan(zone);
                  if (onPlanChange && inferredPlan !== selectedPlan) {
                    onPlanChange(inferredPlan);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeZoneIndex === idx
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{zone.name}</span>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    activeZoneIndex === idx
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {zone.seats.length} Desks
                </span>
                {isPlanMatch && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                      activeZoneIndex === idx
                        ? 'bg-amber-300 text-amber-950'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    FOR YOUR PLAN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seat Status Legend Bar */}
      <div className="px-4 py-3 bg-slate-100/60 border-b border-slate-200/80 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border-2 border-emerald-500"></span>
          <span>Available Desks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[9px]">
            ✓
          </span>
          <span className="text-blue-700 font-bold">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border-2 border-amber-500 animate-pulse"></span>
          <span className="text-amber-700">Locked (5m Hold)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-300 border border-slate-400"></span>
          <span className="text-slate-400">Booked / Occupied</span>
        </div>
      </div>

      {/* Seat Map Visual Canvas */}
      <div className="p-5 sm:p-8 bg-slate-50/50">
        {/* Whiteboard / Front of Hall Indicator */}
        <div className="max-w-md mx-auto mb-8 text-center">
          <div className="py-1.5 px-4 bg-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-slate-300/80 shadow-inner">
            📚 Main Entrance & Silent Reading Whiteboard
          </div>
        </div>

        {/* Dynamic Seat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {currentZone.seats.map((seat) => {
            const isSelected = selectedSeat?.id === seat.id;
            const isAvailable = seat.status === 'AVAILABLE';
            const isLocked = seat.status === 'LOCKED';
            const isBooked = seat.status === 'BOOKED';
            const isMaintenance = seat.status === 'MAINTENANCE';

            const isPlanMismatch =
              isAvailable &&
              !!selectedPlan &&
              !!seat.category &&
              seat.category !== selectedPlan;

            let cardStyles = 'bg-white border-emerald-400 ring-2 ring-emerald-100/60 text-slate-700 hover:border-emerald-500 hover:shadow-md cursor-pointer';

            if (isSelected) {
              cardStyles = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 shadow-lg scale-105 cursor-pointer';
            } else if (isLocked) {
              cardStyles = 'bg-amber-50/90 border-amber-300 text-amber-900 cursor-not-allowed';
            } else if (isBooked) {
              cardStyles = 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60';
            } else if (isMaintenance) {
              cardStyles = 'bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed opacity-50';
            } else if (isPlanMismatch) {
              cardStyles = 'bg-white border-indigo-200 ring-2 ring-indigo-50 text-slate-700 hover:border-indigo-400 hover:shadow-md cursor-pointer';
            }

            return (
              <div
                key={seat.id}
                onClick={() => {
                  if (isAvailable || isSelected) {
                    // Auto-sync plan with desk category if mismatched
                    if (seat.category && onPlanChange && seat.category !== selectedPlan) {
                      onPlanChange(seat.category);
                    }
                    onSelectSeat(seat);
                  }
                }}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-between min-h-[110px] ${cardStyles}`}
              >
                {/* Top Details & Icons */}
                <div className="w-full flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    {seat.hasPowerSocket && (
                      <span title="Power Socket Available">
                        <Zap
                          className={`w-3 h-3 ${
                            isSelected ? 'text-yellow-300' : 'text-amber-500'
                          }`}
                        />
                      </span>
                    )}
                    {seat.hasLamp && (
                      <span title="Reading Lamp">
                        <Lightbulb
                          className={`w-3 h-3 ${
                            isSelected ? 'text-yellow-200' : 'text-blue-500'
                          }`}
                        />
                      </span>
                    )}
                  </div>

                  {/* Pricing Badge */}
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    ₹{seat.hourlyPrice}/h
                  </span>
                </div>

                {/* Desk Center Graphic */}
                <div className="my-1 flex flex-col items-center">
                  <Armchair
                    className={`w-6 h-6 transition-transform ${
                      isSelected ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  />
                  <span className="font-extrabold text-xs tracking-wider mt-0.5">
                    {seat.seatNumber}
                  </span>
                  {seat.category && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md mt-0.5 ${
                        isSelected
                          ? 'bg-blue-800 text-white'
                          : seat.category === 'YEARLY'
                          ? 'bg-purple-100 text-purple-700'
                          : seat.category === 'MONTHLY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {seat.category === 'YEARLY'
                        ? '👑 VIP'
                        : seat.category === 'MONTHLY'
                        ? '👑 Pass'
                        : '⏱️ Hourly'}
                    </span>
                  )}
                </div>

                {/* Bottom Status / Selection Badge */}
                <div className="w-full text-center">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-white text-blue-600 px-2 py-0.5 rounded-full shadow-sm">
                      <Check className="w-2.5 h-2.5" /> Selected
                    </span>
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-200/80 px-1.5 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" /> Locked ({seat.lockRemainingSeconds || 300}s)
                    </span>
                  ) : isBooked ? (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Occupied
                    </span>
                  ) : isPlanMismatch ? (
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      ⚡ {seat.category} Desk
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600">
                      ✓ Available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InteractiveSeatGrid;
