import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Library, SeatZone, Seat, SeatLockResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import InteractiveSeatGrid from '../components/seat/InteractiveSeatGrid';
import BookingCheckoutModal from '../components/booking/BookingCheckoutModal';
import AuthModal from '../components/common/AuthModal';
import {
  MapPin,
  Clock,
  Star,
  CheckCircle,
  Share2,
  Heart,
  Calendar as CalendarIcon,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Zap,
  ArrowRight,
  MessageSquare,
  Award,
  Camera,
} from 'lucide-react';

export const LibraryDetailsPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { user } = useAuth();

  const [library, setLibrary] = useState<Library | null>(null);
  const [zones, setZones] = useState<SeatZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Plan: HOURLY | MONTHLY | YEARLY
  const [bookingPlan, setBookingPlan] = useState<'HOURLY' | 'MONTHLY' | 'YEARLY'>('HOURLY');

  // Real-Time Helper Functions
  const getNowTimeString = (d = new Date()) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const getNowDateString = (d = new Date()) => {
    return d.toLocaleDateString('en-CA');
  };

  const today = getNowDateString();

  const addHoursToTimeString = (timeStr: string, hours: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m + Math.round(hours * 60);
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Booking Parameters (Real-time active by default, default duration = 3 hours)
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [selectedDurationHours, setSelectedDurationHours] = useState(3);
  const [selectedDate, setSelectedDate] = useState(() => getNowDateString());
  const [startTime, setStartTime] = useState(() => getNowTimeString());
  const [endTime, setEndTime] = useState(() => addHoursToTimeString(getNowTimeString(), 3));

  // Seat Selection & Locking
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockData, setLockData] = useState<SeatLockResponse | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Review Form
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // 1. Fetch Library Info
  const fetchLibraryDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/libraries/${idOrSlug}`);
      if (res.data.success && res.data.library) {
        setLibrary(res.data.library);
      } else {
        setError('Library not found or unavailable');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Library not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Real-time Seat Availability for chosen date & time
  const fetchSeatAvailability = async () => {
    if (!library) return;
    try {
      const res = await api.get(`/seats/availability/${library.id}`, {
        params: {
          date: selectedDate,
          startTime,
          endTime,
        },
      });
      if (res.data.success) {
        setZones(res.data.zones);
        // If previously selected seat is now booked/locked by someone else, clear selection
        if (selectedSeat) {
          const updatedSeat = res.data.zones
            .flatMap((z: SeatZone) => z.seats)
            .find((s: Seat) => s.id === selectedSeat.id);
          if (updatedSeat && updatedSeat.status !== 'AVAILABLE') {
            setSelectedSeat(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load seat availability', err);
    }
  };

  useEffect(() => {
    fetchLibraryDetails();
  }, [idOrSlug]);

  useEffect(() => {
    if (library) {
      fetchSeatAvailability();
      // Poll seat availability every 15 seconds to keep map live
      const interval = setInterval(fetchSeatAvailability, 15000);
      return () => clearInterval(interval);
    }
  }, [library, selectedDate, startTime, endTime]);

  // Auto-sync with real-time clock every 30 seconds if real-time mode is enabled
  useEffect(() => {
    if (!isRealtimeActive || bookingPlan !== 'HOURLY') return;
    const syncRealtime = () => {
      const nowTime = getNowTimeString();
      const nowDate = getNowDateString();
      setSelectedDate(nowDate);
      setStartTime(nowTime);
      setEndTime(addHoursToTimeString(nowTime, selectedDurationHours));
    };
    syncRealtime();
    const interval = setInterval(syncRealtime, 30000);
    return () => clearInterval(interval);
  }, [isRealtimeActive, selectedDurationHours, bookingPlan]);

  // Calculate Duration and Price
  const calculateDuration = () => {
    if (bookingPlan !== 'HOURLY') return 1;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diffMin = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMin <= 0) {
      diffMin += 24 * 60;
    }
    return Math.max(0.5, parseFloat((diffMin / 60).toFixed(1)));
  };

  const durationHours = calculateDuration();
  const currentHourlyRate = selectedSeat?.hourlyPrice || library?.hourlyRate || 35;
  const monthlyRate = library?.monthlyRate || Math.round(currentHourlyRate * 80);
  const yearlyRate = library?.yearlyRate || (library?.monthlyRate ? library.monthlyRate * 10 : Math.round(currentHourlyRate * 750));

  const basePrice =
    bookingPlan === 'MONTHLY'
      ? monthlyRate
      : bookingPlan === 'YEARLY'
      ? yearlyRate
      : parseFloat((durationHours * currentHourlyRate).toFixed(2));

  const taxPercent = library?.taxPercent ?? 0;
  const serviceFee = library?.serviceFee ?? 0;
  const taxAmount = parseFloat(((basePrice * taxPercent) / 100).toFixed(2));
  const estimatedTotal = parseFloat((basePrice + taxAmount + serviceFee).toFixed(2));

  useEffect(() => {
    if (library) {
      if (library.enableMembership === false) {
        setBookingPlan('HOURLY');
      } else {
        if (bookingPlan === 'MONTHLY' && library.enableMonthly === false) {
          setBookingPlan('HOURLY');
        }
        if (bookingPlan === 'YEARLY' && library.enableYearly === false) {
          setBookingPlan('HOURLY');
        }
      }
    }
  }, [library]);

  // Synchronized Plan & Seat Selection Handlers
  const handlePlanSelect = (newPlan: 'HOURLY' | 'MONTHLY' | 'YEARLY') => {
    setBookingPlan(newPlan);
    if (selectedSeat && selectedSeat.category && selectedSeat.category !== newPlan) {
      setSelectedSeat(null);
    }
  };

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
    if (seat.category && seat.category !== bookingPlan) {
      setBookingPlan(seat.category);
    }
  };

  // Handle Step 1: Temporarily Lock Seat for 5 mins
  const handleLockSeat = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedSeat) {
      alert('Please click on an available green desk to select it first.');
      return;
    }

    // For monthly or yearly passes, determine safe start time so it's never in the past
    let lockStartTime = startTime;
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
    }

    setLockLoading(true);
    try {
      const res = await api.post('/bookings/lock', {
        seatId: selectedSeat.id,
        date: selectedDate,
        startTime: bookingPlan === 'HOURLY' ? startTime : lockStartTime,
        endTime: bookingPlan === 'HOURLY' ? endTime : (library?.closingTime || '23:00'),
        bookingType: bookingPlan,
      });

      if (res.data.success) {
        setLockData(res.data.data);
        setIsCheckoutOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Seat could not be locked. It may have just been booked by another student.');
      // Refresh seat layout
      fetchSeatAvailability();
    } finally {
      setLockLoading(false);
    }
  };

  // Review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await api.post(`/libraries/${library?.id}/reviews`, {
        rating: newRating,
        comment: newComment,
      });
      if (res.data.success) {
        setNewComment('');
        fetchLibraryDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (error || (!library && !loading)) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Library Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This library could not be loaded.'}</p>
        <Link to="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
          Back to Explore
        </Link>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-600 mt-4">Loading library details & seat layout...</p>
      </div>
    );
  }

  const photos = Array.isArray(library.photos)
    ? library.photos
    : typeof library.photos === 'string'
    ? (() => { try { return JSON.parse(library.photos); } catch { return []; } })()
    : [];

  const facilities = Array.isArray(library.facilities)
    ? library.facilities
    : typeof library.facilities === 'string'
    ? (() => { try { return JSON.parse(library.facilities); } catch { return []; } })()
    : [];

  const mainPhoto = library.bannerImage || photos[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000';
  const secondPhoto = library.interiorImage || photos[1] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000';
  const thirdPhoto = library.amenitiesImage || photos[2] || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/" className="hover:text-blue-600">{library.city}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-semibold truncate">{library.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Photo Gallery & Title Block */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden space-y-6">
          {/* 3-Photo Responsive Showcase Collage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Verified 3-View Space Showcase</span>
              </span>
              <span className="text-[11px] text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-bold">
                3 Photos Available
              </span>
            </div>

            {/* Desktop Layout (md+) */}
            <div className="hidden md:grid md:grid-cols-3 gap-3 rounded-2xl overflow-hidden h-[360px]">
              {/* Photo 1: Front Banner */}
              <div className="md:col-span-2 relative bg-slate-100 overflow-hidden group rounded-2xl">
                <img
                  src={mainPhoto}
                  alt={`${library.name} Front Banner`}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                    🏢 1. Front / Main Banner
                  </span>
                </div>
              </div>

              {/* Photo 2 & 3: Stacked */}
              <div className="flex flex-col gap-3 h-full">
                {/* Photo 2: Study Hall */}
                <div className="h-1/2 relative bg-slate-100 overflow-hidden rounded-xl group">
                  <img
                    src={secondPhoto}
                    alt={`${library.name} Study Hall`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                      📚 2. Study Hall / Desks
                    </span>
                  </div>
                </div>

                {/* Photo 3: Amenities */}
                <div className="h-1/2 relative bg-slate-100 overflow-hidden rounded-xl group">
                  <img
                    src={thirdPhoto}
                    alt={`${library.name} Amenities`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                      ⚡ 3. Amenities & Facilities
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Layout (< md) */}
            <div className="md:hidden space-y-2">
              {/* Photo 1: Front Banner */}
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100 group">
                <img
                  src={mainPhoto}
                  alt={`${library.name} Front Banner`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                    🏢 1. Front Banner
                  </span>
                </div>
              </div>

              {/* Photo 2 & 3 side by side */}
              <div className="grid grid-cols-2 gap-2 h-28">
                <div className="relative rounded-xl overflow-hidden bg-slate-100 group">
                  <img
                    src={secondPhoto}
                    alt={`${library.name} Study Hall`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                      📚 2. Study Hall
                    </span>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-100 group">
                  <img
                    src={thirdPhoto}
                    alt={`${library.name} Amenities`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                      ⚡ 3. Amenities
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Info */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified Library
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                  {library.city}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {library.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {library.address}, {library.city} - {library.pincode}
              </p>

              {library.tagline && (
                <p className="text-xs sm:text-sm text-slate-700 font-medium italic">
                  "{library.tagline}"
                </p>
              )}
            </div>

            {/* Quick Price & Hours Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-6 self-start">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Hourly Rate</span>
                <span className="text-2xl font-extrabold text-blue-600">₹{library.hourlyRate}</span>
                <span className="text-xs text-slate-500"> / hour</span>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] font-semibold text-slate-500 block">Timings</span>
                <span className="text-sm font-bold text-slate-800 block">
                  {library.openingTime} - {library.closingTime}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Open Daily</span>
              </div>
            </div>
          </div>

          {/* Amenities checklist */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Available Facilities & Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {facilities.map((fac: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Selection Section: Slot vs Monthly vs Yearly Pass */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                1. Select Membership & Booking Plan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {library.enableMembership !== false
                  ? 'Book hourly slots or continuous Premium Passes with daily contactless QR attendance'
                  : 'Book hourly study slots (Membership passes currently disabled by library)'}
              </p>
            </div>
            {library.enableMembership !== false ? (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                ⚡ Digital QR Pass Included
              </span>
            ) : (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 self-start sm:self-auto">
                ⏱️ Hourly Bookings Only
              </span>
            )}
          </div>

          <div className={`grid gap-3.5 ${
            library.enableMembership === false
              ? 'grid-cols-1 max-w-md'
              : (library.enableMonthly !== false && library.enableYearly !== false)
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2'
          }`}>
            {/* Plan 1: Hourly Slot */}
            <div
              onClick={() => handlePlanSelect('HOURLY')}
              className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                bookingPlan === 'HOURLY'
                  ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" /> Hourly Slot
                  </span>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${bookingPlan === 'HOURLY' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {bookingPlan === 'HOURLY' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ₹{library.hourlyRate}<span className="text-xs font-normal text-slate-500"> / hr</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Best for quick study hours or single-day test revisions.
                </p>
              </div>
            </div>

            {/* Plan 2: Premium Monthly Pass */}
            {library.enableMembership !== false && library.enableMonthly !== false && (
              <div
                onClick={() => handlePlanSelect('MONTHLY')}
                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                  bookingPlan === 'MONTHLY'
                    ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Premium Monthly Pass
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      POPULAR
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ₹{monthlyRate}<span className="text-xs font-normal text-slate-500"> / 30 Days</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {library.monthlyDetails || 'Continuous 30-day dedicated desk, unlimited daily hours, with 1x daily QR scan attendance.'}
                  </p>
                </div>
              </div>
            )}

            {/* Plan 3: Premium Yearly Pass */}
            {library.enableMembership !== false && library.enableYearly !== false && (
              <div
                onClick={() => handlePlanSelect('YEARLY')}
                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                  bookingPlan === 'YEARLY'
                    ? 'border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-purple-700 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-600" /> Yearly VIP Pass
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                      BEST VALUE
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ₹{yearlyRate}<span className="text-xs font-normal text-slate-500"> / 365 Days</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {library.yearlyDetails || '365-day fixed desk reserved only for you, 2 months free discount, and daily gate attendance tracking.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Perks banner for Monthly / Yearly */}
          {bookingPlan !== 'HOURLY' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{bookingPlan === 'MONTHLY' ? '30 Days' : '365 Days'} Digital Entry Pass:</strong> Your QR pass stays valid for the entire duration. Scan daily at library reception to record attendance (1 time/day).
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Date & Time Slot Configuration Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                2. {bookingPlan === 'HOURLY' ? 'Real-Time Timing & Duration' : 'Choose Pass Start Date'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {bookingPlan === 'HOURLY'
                  ? 'Real-time clock is active by default. Starts right now with default 3 hours duration.'
                  : `Operating Hours: ${library.openingTime} - ${library.closingTime} (Daily Access)`}
              </p>
            </div>

            {bookingPlan === 'HOURLY' && (
              <button
                type="button"
                onClick={() => {
                  const next = !isRealtimeActive;
                  setIsRealtimeActive(next);
                  if (next) {
                    const nowTime = getNowTimeString();
                    const nowDate = getNowDateString();
                    setSelectedDate(nowDate);
                    setStartTime(nowTime);
                    setEndTime(addHoursToTimeString(nowTime, selectedDurationHours));
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto ${
                  isRealtimeActive
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                {isRealtimeActive ? '⚡ Live Real-Time Active' : 'Switch to Real-Time'}
              </button>
            )}
          </div>

          <div className={`grid gap-4 ${bookingPlan === 'HOURLY' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {bookingPlan === 'HOURLY' ? 'Booking Date' : 'Pass Start Date'}
              </label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (e.target.value !== getNowDateString()) {
                    setIsRealtimeActive(false);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {bookingPlan === 'HOURLY' ? (
              <>
                {/* Start Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Start Time
                    </label>
                    {isRealtimeActive && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Live: {formatTime12h(startTime)}
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      setIsRealtimeActive(false);
                      setEndTime(addHoursToTimeString(newStart, selectedDurationHours));
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* End Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      End Time
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {formatTime12h(endTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setIsRealtimeActive(false);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Daily Timing Access
                </span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5">
                  ⏰ {library.openingTime} - {library.closingTime} (Open Everyday)
                </span>
              </div>
            )}
          </div>

          {/* Hourly Duration Selector Buttons */}
          {bookingPlan === 'HOURLY' && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Booking Duration:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 6, 8].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        setSelectedDurationHours(hrs);
                        setEndTime(addHoursToTimeString(startTime, hrs));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedDurationHours === hrs
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {hrs}h {hrs === 3 && '⭐ (Default)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-600 font-semibold bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-xl">
                ⏱️ Session: <strong>{formatTime12h(startTime)}</strong> to <strong>{formatTime12h(endTime)}</strong> ({durationHours} hrs)
              </div>
            </div>
          )}
        </div>

        {/* Cancellation, Refund & Rebook Rules Notice Card */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Transparency Policy: Cancellation, Refunds & Seat Extension
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                <CheckCircle className="w-4 h-4" /> 50% Cancellation Refund
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Cancel your booking anytime: a 50% cancellation fee applies and 50% is refunded to your payment method.
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                <Clock className="w-4 h-4" /> 30% No-Show Refund
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                If you don't check in before your session ends, 30% is automatically refunded and your seat is freed for other students.
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <Zap className="w-4 h-4" /> Rebook 15 Mins Before
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                A "Rebook / Extend Time" button appears 15 minutes before your session ends so you can keep your desk.
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-purple-600 font-bold">
                <Sparkles className="w-4 h-4" /> Check-in Reminders
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Automated reminders at 30 mins and 90 mins prompt you to scan your digital pass at reception.
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Interactive Seat Map */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              2. Select Your Specific Desk
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              ⚡ Real-time Synced
            </span>
          </div>

          <InteractiveSeatGrid
            zones={zones}
            selectedSeat={selectedSeat}
            onSelectSeat={handleSeatSelect}
            selectedPlan={bookingPlan}
            onPlanChange={handlePlanSelect}
          />
        </div>

        {/* Sticky Action Card (Shows on desktop & mobile) */}
        <div className="sticky bottom-4 z-30 bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-800 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 animate-slideUp">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4">
            {selectedSeat ? (
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-lg">
                  {selectedSeat.seatNumber}
                </span>
                <div>
                  <span className="text-sm font-bold block">
                    Desk {selectedSeat.seatNumber} Selected
                  </span>
                  <span className="text-xs text-slate-400">
                    {bookingPlan === 'MONTHLY'
                      ? `${selectedDate} • 30 Days Continuous Pass • Daily ${library?.openingTime || '07:00'} - ${library?.closingTime || '23:00'}`
                      : bookingPlan === 'YEARLY'
                      ? `${selectedDate} • 365 Days VIP Access • Daily ${library?.openingTime || '07:00'} - ${library?.closingTime || '23:00'}`
                      : `${selectedDate} • ${formatTime12h(startTime)} to ${formatTime12h(endTime)} (${durationHours}h)`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs sm:text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Click on an available green desk above to select your seat</span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
            {selectedSeat && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Base: ₹{basePrice}
                  {taxAmount > 0 && ` + Tax (${taxPercent}%: ₹${taxAmount})`}
                  {serviceFee > 0 && ` + Fee: ₹${serviceFee}`}
                </span>
                <span className="text-xl font-extrabold text-white">
                  ₹{estimatedTotal}
                </span>
              </div>
            )}

            <button
              onClick={handleLockSeat}
              disabled={!selectedSeat || lockLoading}
              className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                selectedSeat
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {lockLoading ? (
                <span>Locking Seat...</span>
              ) : (
                <>
                  <span>
                    {bookingPlan === 'MONTHLY'
                      ? 'Lock Monthly Pass Desk (5m Hold)'
                      : bookingPlan === 'YEARLY'
                      ? 'Lock Yearly VIP Desk (5m Hold)'
                      : 'Lock Seat & Pay (5m Hold)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Student Reviews & Ratings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified reviews from readers who booked this library
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl font-bold text-sm border border-amber-200">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{library.rating} / 5.0</span>
            </div>
          </div>

          {/* Add Review Form */}
          <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Share your experience</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rating:</span>
              <select
                value={newRating}
                onChange={(e) => setNewRating(Number(e.target.value))}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white"
              >
                <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                <option value={3}>⭐⭐⭐ 3 Stars</option>
                <option value={2}>⭐⭐ 2 Stars</option>
                <option value={1}>⭐ 1 Star</option>
              </select>
            </div>

            <textarea
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="How was the noise level, WiFi speed, and chair comfort?"
              className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>

            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              {submittingReview ? 'Posting...' : 'Post Review'}
            </button>
          </form>

          {/* Reviews List */}
          <div className="space-y-4">
            {library.reviews && library.reviews.length > 0 ? (
              library.reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={rev.user?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                        alt={rev.user?.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold text-slate-800">{rev.user?.name}</span>
                    </div>
                    <div className="flex items-center text-amber-500 text-xs">
                      {'★'.repeat(rev.rating)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{rev.comment}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal with 5-min timer */}
      <BookingCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          fetchSeatAvailability();
        }}
        lockData={lockData}
        photos={[mainPhoto, secondPhoto, thirdPhoto]}
        onLockExpired={() => {
          fetchSeatAvailability();
          setSelectedSeat(null);
        }}
      />

      {/* Auth Modal Trigger */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default LibraryDetailsPage;
