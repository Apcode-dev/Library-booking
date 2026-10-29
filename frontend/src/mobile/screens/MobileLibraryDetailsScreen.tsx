import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { Library, SeatZone, Seat, SeatLockResponse } from '../../types';
import { useAuth } from '../../context/AuthContext';
import MobileSeatGrid from '../components/MobileSeatGrid';
import MobileCheckoutModal from '../components/MobileCheckoutModal';
import {
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle,
  Calendar,
  Lock,
  ArrowRight,
  Info,
  ChevronLeft,
  Heart,
} from 'lucide-react';
import { isFavorite, toggleFavorite } from '../../lib/favorites';

interface MobileLibraryDetailsScreenProps {
  library: Library;
  onBack: () => void;
  onBookingConfirmed: (booking: any) => void;
  onOpenAuth: () => void;
}

export const MobileLibraryDetailsScreen: React.FC<MobileLibraryDetailsScreenProps> = ({
  library,
  onBack,
  onBookingConfirmed,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  // Plan: HOURLY | MONTHLY | YEARLY
  const [bookingPlan, setBookingPlan] = useState<'HOURLY' | 'MONTHLY' | 'YEARLY'>('HOURLY');

  // Time & Duration
  const getTodayStr = () => new Date().toLocaleDateString('en-CA');
  const getNowTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [startTime, setStartTime] = useState(getNowTimeStr());
  const [durationHours, setDurationHours] = useState(3);

  // Seat zones & availability
  const [zones, setZones] = useState<SeatZone[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // 5-min Hold state
  const [lockLoading, setLockLoading] = useState(false);
  const [lockData, setLockData] = useState<SeatLockResponse | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Active Photo Carousel Tab
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isFav, setIsFav] = useState(() => isFavorite(library.id, user?.id));

  useEffect(() => {
    setIsFav(isFavorite(library.id, user?.id));
  }, [library.id, user?.id]);

  const handleToggleFavorite = () => {
    if (!user) {
      toast('Please sign in to save your favorite libraries.', { icon: '🔐' });
      onOpenAuth();
      return;
    }
    const res = toggleFavorite(library.id, user.id);
    setIsFav(res.isFav);
    if (res.isFav) {
      toast.success('Saved to Favorites ❤️');
    } else {
      toast('Removed from Favorites', { icon: '🗑️' });
    }
  };

  // Photos
  const photos = [
    library.bannerImage || library.photos?.[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000',
    library.interiorImage || library.photos?.[1] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000',
    library.amenitiesImage || library.photos?.[2] || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000',
  ];

  const calculateEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(':').map(Number);
    const totalMins = h * 60 + m + Math.round(duration * 60);
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const endTime = calculateEndTime(startTime, durationHours);

  // Fetch real-time seat matrix for this slot
  const fetchSeats = async () => {
    setLoadingSeats(true);
    try {
      const res = await api.get(`/seats/availability/${library.id}`, {
        params: {
          date: selectedDate,
          startTime,
          endTime,
          bookingType: bookingPlan,
        },
      });

      if (res.data.success) {
        setZones(res.data.zones || []);
      }
    } catch (_) {
      // Fallback: Use seatZones if present on library object
      if (library.seatZones) {
        setZones(library.seatZones);
      }
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [library.id, selectedDate, startTime, durationHours, bookingPlan]);

  const handleStartLock = async () => {
    if (!user) {
      toast('Please sign in or create an account to reserve a desk.', { icon: '🔐' });
      onOpenAuth();
      return;
    }

    if (!selectedSeat) {
      toast.error('Please select an available desk first.');
      return;
    }

    let lockStartTime = startTime;
    let lockEndTime = endTime;

    if (bookingPlan !== 'HOURLY') {
      const now = new Date();
      const curHH = String(now.getHours()).padStart(2, '0');
      const curMM = String(now.getMinutes()).padStart(2, '0');
      const todayStr = now.toISOString().split('T')[0];
      if (selectedDate === todayStr) {
        lockStartTime = `${curHH}:${curMM}`;
      } else {
        lockStartTime = library?.openingTime || '07:00';
      }
      lockEndTime = library?.closingTime || '23:00';
    }

    setLockLoading(true);
    try {
      const res = await api.post('/bookings/lock', {
        seatId: selectedSeat.id,
        date: selectedDate,
        startTime: lockStartTime,
        endTime: lockEndTime,
        bookingType: bookingPlan,
      });

      if (res.data.success && res.data.data) {
        setLockData(res.data.data);
        setIsCheckoutOpen(true);
      } else {
        toast.error(res.data.message || 'Seat is no longer available.');
        fetchSeats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not lock seat. Please try another.');
      fetchSeats();
    } finally {
      setLockLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 3-Image Showcase Carousel */}
      <div className="relative h-60 bg-slate-950 overflow-hidden">
        <img
          src={photos[activePhotoIdx]}
          alt={library.name}
          className="w-full h-full object-cover transition duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

        {/* Back Button Floating */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Favorite Heart Button Floating */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-rose-500 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg active:scale-90 transition cursor-pointer"
          title={isFav ? 'Remove Favorite' : 'Save to Favorites'}
        >
          <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
        </button>

        {/* Photo Thumbnails */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePhotoIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  activePhotoIdx === i ? 'w-6 bg-blue-500' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md border border-slate-700">
            {activePhotoIdx === 0
              ? '📸 1. Exterior Banner'
              : activePhotoIdx === 1
              ? '📸 2. Study Hall'
              : '📸 3. Amenities & Desks'}
          </span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Title, Rating & Address */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white leading-tight">{library.name}</h2>
            <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{library.rating || '4.8'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>
              {library.address}, {library.city}
            </span>
          </p>

          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>
              Operating: {library.openingTime} - {library.closingTime}
            </span>
          </p>
        </div>

        {/* Plan Switcher */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Choose Pass Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setBookingPlan('HOURLY')}
              className={`p-2.5 rounded-2xl border text-center transition ${
                bookingPlan === 'HOURLY'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 font-black'
                  : 'bg-slate-900 text-slate-400 border-slate-800 font-bold'
              }`}
            >
              <div className="text-xs">Hourly</div>
              <div className="text-[10px] mt-0.5">₹{library.hourlyRate}/hr</div>
            </button>

            <button
              type="button"
              onClick={() => setBookingPlan('MONTHLY')}
              className={`p-2.5 rounded-2xl border text-center transition ${
                bookingPlan === 'MONTHLY'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 font-black'
                  : 'bg-slate-900 text-slate-400 border-slate-800 font-bold'
              }`}
            >
              <div className="text-xs">Monthly</div>
              <div className="text-[10px] mt-0.5">₹{library.monthlyRate || 1200}</div>
            </button>

            <button
              type="button"
              onClick={() => setBookingPlan('YEARLY')}
              className={`p-2.5 rounded-2xl border text-center transition ${
                bookingPlan === 'YEARLY'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 font-black'
                  : 'bg-slate-900 text-slate-400 border-slate-800 font-bold'
              }`}
            >
              <div className="text-xs">Yearly VIP</div>
              <div className="text-[10px] mt-0.5">₹{library.yearlyRate || 12000}</div>
            </button>
          </div>
        </div>

        {/* Hourly Specific Controls */}
        {bookingPlan === 'HOURLY' && (
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={getTodayStr()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Quick Duration Buttons */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                Study Duration
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setDurationHours(hours)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition ${
                      durationHours === hours
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {hours} {hours === 1 ? 'Hour' : 'Hours'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Desk Floor Plan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Interactive Desk Matrix
            </h3>
            {loadingSeats && (
              <span className="text-[10px] text-blue-400 animate-pulse">Syncing floor plan...</span>
            )}
          </div>

          <MobileSeatGrid
            zones={zones}
            selectedSeat={selectedSeat}
            onSelectSeat={(seat) => setSelectedSeat(seat)}
            bookingType={bookingPlan}
            hourlyRate={library.hourlyRate}
          />
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 px-4 py-3 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Selected Desk
            </div>
            <div className="text-sm font-extrabold text-white">
              {selectedSeat ? (
                <span className="text-emerald-400">Desk {selectedSeat.seatNumber}</span>
              ) : (
                <span className="text-slate-500">Tap a desk above</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartLock}
            disabled={!selectedSeat || lockLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-600/30 transition active:scale-95 flex items-center gap-1.5"
          >
            {lockLoading ? (
              <span>Securing Seat...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Lock & Book (5m)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5-Min Hold Checkout Modal */}
      {lockData && (
        <MobileCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setLockData(null);
            fetchSeats();
          }}
          lockData={lockData}
          photos={photos}
          onSuccess={(booking) => {
            setIsCheckoutOpen(false);
            setLockData(null);
            onBookingConfirmed(booking);
          }}
        />
      )}
    </div>
  );
};

export default MobileLibraryDetailsScreen;
