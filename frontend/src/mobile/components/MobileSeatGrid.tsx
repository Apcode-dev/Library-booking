import React, { useState } from 'react';
import { SeatZone, Seat } from '../../types';
import { Armchair, Zap, Lightbulb, Lock, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface MobileSeatGridProps {
  zones: SeatZone[];
  selectedSeat: Seat | null;
  onSelectSeat: (seat: Seat) => void;
  bookingType: 'HOURLY' | 'MONTHLY' | 'YEARLY';
  hourlyRate: number;
}

export const MobileSeatGrid: React.FC<MobileSeatGridProps> = ({
  zones,
  selectedSeat,
  onSelectSeat,
  bookingType,
  hourlyRate,
}) => {
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [inspectedSeat, setInspectedSeat] = useState<Seat | null>(null);

  if (!zones || zones.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
        <Armchair className="w-10 h-10 text-slate-600 mx-auto" />
        <h4 className="text-sm font-bold text-white">No Desks Available</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          This library is currently configuring its seating floor plan.
        </p>
      </div>
    );
  }

  const currentZone = zones[activeZoneIndex] || zones[0];

  const handleSeatClick = (seat: Seat) => {
    setInspectedSeat(seat);
  };

  const handleConfirmSeatSelection = (seat: Seat) => {
    onSelectSeat(seat);
    setInspectedSeat(null);
  };

  return (
    <div className="space-y-4">
      {/* Zone Switcher Chips */}
      {zones.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {zones.map((zone, idx) => (
            <button
              key={zone.id || idx}
              type="button"
              onClick={() => setActiveZoneIndex(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeZoneIndex === idx
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {/* Visual Desk Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
        {/* Front Board / Screen Indicator */}
        <div className="mb-5 text-center">
          <div className="h-1.5 w-32 bg-slate-700/80 rounded-full mx-auto mb-1 shadow-inner"></div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            Study Hall Front / Entrance
          </span>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
          {currentZone.seats.map((seat) => {
            const isSelected = selectedSeat?.id === seat.id;
            const isAvailable = seat.status === 'AVAILABLE';
            const isLocked = seat.status === 'LOCKED';
            const isBooked = seat.status === 'BOOKED' || seat.isBooked;
            const isMaintenance = seat.status === 'MAINTENANCE';

            // Check if desk matches plan category
            const isCategoryMismatch =
              (bookingType === 'HOURLY' && seat.category && seat.category !== 'HOURLY') ||
              (bookingType === 'MONTHLY' && seat.category && seat.category !== 'MONTHLY') ||
              (bookingType === 'YEARLY' && seat.category && seat.category !== 'YEARLY');

            let seatClasses = 'bg-slate-950 border-slate-800 text-slate-500';

            if (isSelected) {
              seatClasses =
                'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/40 scale-105 ring-2 ring-white/50';
            } else if (isAvailable && !isCategoryMismatch) {
              seatClasses =
                'bg-emerald-950/40 border-emerald-500/70 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/60 active:scale-95';
            } else if (isLocked) {
              seatClasses =
                'bg-amber-950/40 border-amber-500/70 text-amber-300 animate-pulse cursor-not-allowed';
            } else if (isBooked) {
              seatClasses = 'bg-rose-950/30 border-rose-900/60 text-rose-500/60 cursor-not-allowed';
            } else if (isMaintenance || isCategoryMismatch) {
              seatClasses = 'bg-slate-950/60 border-slate-800/60 text-slate-600 cursor-not-allowed';
            }

            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => handleSeatClick(seat)}
                className={`relative flex flex-col items-center justify-between p-2 rounded-2xl border transition duration-150 min-h-[64px] ${seatClasses}`}
              >
                {/* Desk Hardware Icons */}
                <div className="flex items-center gap-1 text-[9px] w-full justify-between">
                  <div className="flex items-center gap-0.5">
                    {seat.hasPowerSocket && <Zap className="w-2.5 h-2.5 text-amber-400" />}
                    {seat.hasLamp && <Lightbulb className="w-2.5 h-2.5 text-yellow-300" />}
                  </div>
                  {seat.category && seat.category !== 'HOURLY' && (
                    <span className="text-[8px] font-black uppercase px-1 rounded bg-slate-800 text-slate-300">
                      {seat.category[0]}
                    </span>
                  )}
                </div>

                {/* Desk Number */}
                <span className="text-xs font-black tracking-tight my-0.5">
                  {seat.seatNumber}
                </span>

                {/* Status Indicator */}
                <div className="text-[9px] font-bold">
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-amber-400" />
                  ) : (
                    <span className="text-[9px] font-mono">
                      ₹{seat.hourlyPrice || hourlyRate}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="mt-5 pt-3 border-t border-slate-800 grid grid-cols-4 gap-2 text-[10px] text-slate-400 font-medium text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Held (5m)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Occupied</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            <span>Offline</span>
          </div>
        </div>
      </div>

      {/* Desk Details Bottom Drawer Modal */}
      {inspectedSeat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/30">
                  {inspectedSeat.seatNumber}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Desk {inspectedSeat.seatNumber} Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {inspectedSeat.seatType || 'Standard Desk'} • {currentZone.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedSeat(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hardware & Amenities */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Charging Point</div>
                  <div className="font-bold text-white">
                    {inspectedSeat.hasPowerSocket ? 'Available' : 'None'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-300" />
                <div>
                  <div className="text-[10px] text-slate-400">Reading Lamp</div>
                  <div className="font-bold text-white">
                    {inspectedSeat.hasLamp ? 'Included' : 'Overhead Only'}
                  </div>
                </div>
              </div>
            </div>

            {/* Category / Maintenance Warnings */}
            {inspectedSeat.status === 'MAINTENANCE' ? (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>This desk is currently undergoing maintenance and cannot be reserved.</span>
              </div>
            ) : inspectedSeat.status === 'LOCKED' ? (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Another student currently holds this desk. If payment is not completed within 5
                  minutes, it will be released automatically.
                </span>
              </div>
            ) : inspectedSeat.category &&
              ((bookingType === 'HOURLY' && inspectedSeat.category !== 'HOURLY') ||
                (bookingType === 'MONTHLY' && inspectedSeat.category !== 'MONTHLY') ||
                (bookingType === 'YEARLY' && inspectedSeat.category !== 'YEARLY')) ? (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  This desk is strictly designated for{' '}
                  <strong>{inspectedSeat.category} Pass</strong> holders. Please select an
                  appropriate desk or switch your plan.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleConfirmSeatSelection(inspectedSeat)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
              >
                Select Desk {inspectedSeat.seatNumber}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSeatGrid;
