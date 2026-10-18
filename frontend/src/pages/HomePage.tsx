import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Library } from '../types';
import { useAuth } from '../context/AuthContext';
import LibraryCard from '../components/library/LibraryCard';
import AuthModal from '../components/common/AuthModal';
import {
  Search,
  MapPin,
  Filter,
  Compass,
  Sparkles,
  ShieldCheck,
  Zap,
  Armchair,
  Wifi,
  QrCode,
  Clock,
  Building2,
  TrendingUp,
  CheckCircle2,
  Users,
  CreditCard,
  ArrowRight,
  Lock,
  ChevronRight,
  Layers,
  Award,
  Check,
} from 'lucide-react';
import { UserRole } from '../types';
import { STANDARD_AMENITIES } from '../constants/amenities';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Auth modal trigger for landing page
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>('USER');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (role: UserRole, mode: 'login' | 'register' = 'login') => {
    setAuthRole(role);
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  // Interactive Demo Seat Simulator on Landing Page
  const [selectedDemoSeat, setSelectedDemoSeat] = useState<string | null>('B3');
  const [demoHoldTime, setDemoHoldTime] = useState<number>(298);

  useEffect(() => {
    if (!selectedDemoSeat) return;
    const interval = setInterval(() => {
      setDemoHoldTime((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedDemoSeat]);

  const formatHoldTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // State for Logged-In User Library Discovery
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(80);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [passFilter, setPassFilter] = useState<'ALL' | 'PASSES' | 'HOURLY'>('ALL');

  // Location & Search Option States: 'live' (GPS) or 'manual'
  const [searchMode, setSearchMode] = useState<'live' | 'manual'>('live');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchPincode, setSearchPincode] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const fetchLibraries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (searchAddress.trim()) params.address = searchAddress.trim();
      if (searchCity.trim() && searchCity !== 'All') params.city = searchCity.trim();
      if (searchDistrict.trim()) params.district = searchDistrict.trim();
      if (searchState.trim()) params.state = searchState.trim();
      if (searchPincode.trim()) params.pincode = searchPincode.trim();
      if (maxPrice < 80) params.maxPrice = maxPrice;
      if (selectedFacilities.length > 0) params.facility = selectedFacilities.join(',');
      if (userCoords) {
        params.userLat = userCoords.lat;
        params.userLng = userCoords.lng;
      }

      const res = await api.get('/libraries', { params });
      if (res.data.success) {
        setLibraries(res.data.libraries);
      }
    } catch (err: any) {
      setError('Unable to fetch study libraries. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else if (user?.role === 'OWNER') {
      navigate('/owner');
    } else {
      fetchLibraries();
    }
  }, [user, maxPrice, selectedFacilities, userCoords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLibraries();
  };

  const handleResetLocationFilters = () => {
    setSearchAddress('');
    setSearchCity('');
    setSearchDistrict('');
    setSearchState('');
    setSearchPincode('');
    setUserCoords(null);
    setSearch('');
    setSelectedFacilities([]);
    setTimeout(() => {
      fetchLibraries();
    }, 100);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ lat, lng });

        try {
          // Reverse Geocode via OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            const street = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const district = addr.state_district || addr.county || addr.subdistrict || '';
            const stateName = addr.state || '';
            const pincode = addr.postcode || '';

            if (street) setSearchAddress(street);
            if (city) setSearchCity(city);
            if (district) setSearchDistrict(district);
            if (stateName) setSearchState(stateName);
            if (pincode) setSearchPincode(pincode);
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        } finally {
          setGeoLoading(false);
          fetchLibraries();
        }
      },
      (err) => {
        console.warn('Geolocation fallback to Delhi', err);
        setUserCoords({ lat: 28.6315, lng: 77.2167 });
        setGeoLoading(false);
        fetchLibraries();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const cities = ['All', 'New Delhi', 'Noida', 'Gurgaon'];
  const popularFacilities = ['Air Conditioned', 'WiFi', 'Power Sockets', 'Silent Study Zone'];

  // =========================================================================
  // UNIFIED VIEW: SEARCH, DISCOVERY & LIVE PLATFORM
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Role Notice Banner for Owner / Admin */}
      {user?.role === 'OWNER' && (
        <div className="bg-amber-500 text-white px-4 py-2.5 shadow-sm text-xs font-semibold flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-yellow-200" />
              Logged in as Library Owner: <strong>{user.name}</strong>
            </span>
            <Link
              to="/owner"
              className="px-3 py-1 bg-white text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-50 transition shadow-sm"
            >
              Open Owner Dashboard →
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className="bg-purple-700 text-white px-4 py-2.5 shadow-sm text-xs font-semibold flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              Logged in as Platform Admin: <strong>{user.name}</strong>
            </span>
            <Link
              to="/admin"
              className="px-3 py-1 bg-white text-purple-900 rounded-lg text-xs font-bold hover:bg-purple-50 transition shadow-sm"
            >
              Open Admin Control Center →
            </Link>
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 blur-3xl pointer-events-none -z-10 rounded-full"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">
          {!user ? (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-300 text-xs font-semibold shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>India's Modern Library & Study Seat Booking Platform</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Reserve Your Silent Study Desk{' '}
                <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  With 5-Minute Hold Protection
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
                No physical queues, zero double-booking risk. Pick your exact desk, reserve with transactional lock protection, and check in with contactless digital QR passes.
              </p>

              {/* Direct Quick Action Buttons for 3 Roles */}
              <div className="pt-2 pb-1 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => openAuth('USER', 'register')}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/25 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>🎓 Join as Student (Free)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openAuth('OWNER', 'register')}
                  className="px-5 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm border border-amber-400/30 shadow-lg shadow-amber-600/20 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-yellow-300" />
                  <span>🏢 List Your Library (Owner)</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuth('ADMIN', 'login')}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs border border-white/10 transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>🛡️ Admin Portal</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Welcome back, {user.name} • 5-Minute Hold Protection Active</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Find & Reserve Your Study Desk
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Search verified study libraries, check real-time seat availability, and book in seconds.
              </p>
            </>
          )}

          {/* Dual-Mode Location Search Container */}
          <div className="pt-4 max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-200/80 text-left space-y-4">
              
              {/* Mode Selection Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setSearchMode('live')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      searchMode === 'live'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>📍 Live Location (GPS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchMode('manual')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      searchMode === 'manual'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>✍️ Manual Location Entry</span>
                  </button>
                </div>

                {/* Reset Filters Button */}
                <button
                  type="button"
                  onClick={handleResetLocationFilters}
                  className="text-xs text-slate-500 hover:text-blue-600 font-semibold underline underline-offset-2 transition"
                >
                  Clear Location Filters
                </button>
              </div>

              {/* Live Location Trigger Banner */}
              {searchMode === 'live' && (
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                      <Compass className={`w-5 h-5 ${geoLoading ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {userCoords ? '✅ GPS Live Location Active' : '📍 Auto-Detect Current GPS Location'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {userCoords
                          ? `Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)} • Auto-filled location details below`
                          : 'Click to detect your live location & auto-fill Address, City, District, State & Pincode'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={geoLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Compass className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                    <span>{geoLoading ? 'Detecting GPS...' : userCoords ? 'Refresh Live GPS' : 'Detect My Location'}</span>
                  </button>
                </div>
              )}

              {/* 5 Location Inputs Grid (Populated automatically by Live GPS or manually entered) */}
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Detailed Address
                    </label>
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      placeholder="e.g. Main Street / Area"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      value={searchDistrict}
                      onChange={(e) => setSearchDistrict(e.target.value)}
                      placeholder="e.g. Laxmi Nagar"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={searchState}
                      onChange={(e) => setSearchState(e.target.value)}
                      placeholder="e.g. Delhi"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={searchPincode}
                      onChange={(e) => setSearchPincode(e.target.value)}
                      placeholder="e.g. 110092"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Keyword Search & Submit Row */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <div className="flex-1 w-full flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50">
                    <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Optional keyword search (library name, amenity, etc.)..."
                      className="w-full text-slate-900 bg-transparent text-xs focus:outline-none placeholder-slate-400 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Libraries</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Filter Drawer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {/* Quick Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200/80 mb-8 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Filter className="w-4 h-4 text-blue-600" /> Filter by Amenities
              </span>
              {selectedFacilities.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {selectedFacilities.length} Selected
                  </span>
                  <button
                    onClick={() => setSelectedFacilities([])}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline px-1 py-0.5"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  (Multi-select: Click multiple to narrow down results)
                </span>
              )}
            </div>

            {/* Max Price Slider */}
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Max Rate: <span className="text-blue-600 font-extrabold">₹{maxPrice}/h</span>
              </span>
              <input
                type="range"
                min={25}
                max={80}
                step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-28 sm:w-36 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Multi-Selection Amenity Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {STANDARD_AMENITIES.map((fac) => {
              const isSelected = selectedFacilities.includes(fac);
              return (
                <button
                  key={fac}
                  onClick={() => {
                    setSelectedFacilities((prev) =>
                      prev.includes(fac)
                        ? prev.filter((item) => item !== fac)
                        : [...prev, fac]
                    );
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>{fac}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Header & Category Filter Tabs */}
        {(() => {
          const displayedLibraries = libraries.filter((lib) => {
            if (passFilter === 'PASSES') {
              return lib.enableMembership !== false && (lib.enableMonthly !== false || lib.enableYearly !== false);
            }
            if (passFilter === 'HOURLY') {
              return lib.enableMembership === false || (lib.enableMonthly === false && lib.enableYearly === false);
            }
            return true;
          });

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Verified Study Libraries
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {displayedLibraries.length} verified libraries with real-time seat availability
                  </p>
                </div>

                {/* Membership Pass Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
                  <button
                    onClick={() => setPassFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      passFilter === 'ALL'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({libraries.length})
                  </button>
                  <button
                    onClick={() => setPassFilter('PASSES')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      passFilter === 'PASSES'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👑 Premium Passes</span>
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px]">
                      {libraries.filter((l) => l.enableMembership !== false && (l.enableMonthly !== false || l.enableYearly !== false)).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setPassFilter('HOURLY')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      passFilter === 'HOURLY'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>⏱️ Hourly Only</span>
                    <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                      {libraries.filter((l) => l.enableMembership === false || (l.enableMonthly === false && l.enableYearly === false)).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Library Cards Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse p-4 space-y-4"
                    >
                      <div className="h-44 bg-slate-200 rounded-xl"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center space-y-2">
                  <p className="font-bold text-sm">{error}</p>
                  <button
                    onClick={fetchLibraries}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-rose-700"
                  >
                    Retry
                  </button>
                </div>
              ) : displayedLibraries.length === 0 ? (
                <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3 shadow-sm">
                  <Armchair className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">No libraries match this filter</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try changing your filter to "All" or explore other locations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedLibraries.map((library) => (
                    <LibraryCard key={library.id} library={library} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* =================================================================== */}
      {/* GUEST CAPABILITIES SHOWCASE: DEMO SIMULATOR & 3 PILLARS */}
      {/* =================================================================== */}
      {!user && (
        <div className="mt-20 bg-slate-950 text-white border-t border-slate-800">
          {/* Interactive Feature Demo: Real-Time Seat Hold Simulator */}
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Interactive Live Feature Simulation
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                    <Armchair className="w-5 h-5 text-blue-400" />
                    Visual Seat Layout & 5-Min Hold In Action
                  </h3>
                </div>

                {selectedDemoSeat && (
                  <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-xs text-blue-200">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>
                      Desk <strong>{selectedDemoSeat}</strong> Locked For You:{' '}
                      <strong className="font-mono text-yellow-300 font-bold">{formatHoldTime(demoHoldTime)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Desk Grid Demonstration */}
              <div className="pt-6">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 sm:gap-3 max-w-lg mx-auto">
                  {[
                    { id: 'A1', status: 'available' },
                    { id: 'A2', status: 'occupied' },
                    { id: 'A3', status: 'available' },
                    { id: 'A4', status: 'locked' },
                    { id: 'A5', status: 'available' },
                    { id: 'B1', status: 'available' },
                    { id: 'B2', status: 'available' },
                    { id: 'B3', status: 'selected' },
                    { id: 'B4', status: 'occupied' },
                    { id: 'B5', status: 'available' },
                    { id: 'C1', status: 'occupied' },
                    { id: 'C2', status: 'available' },
                    { id: 'C3', status: 'maintenance' },
                    { id: 'C4', status: 'available' },
                    { id: 'C5', status: 'occupied' },
                  ].map((seat) => {
                    const isSelected = selectedDemoSeat === seat.id;
                    let bgClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer';

                    if (isSelected) {
                      bgClass = 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/50 scale-105 ring-2 ring-blue-400';
                    } else if (seat.status === 'occupied') {
                      bgClass = 'bg-rose-950/40 text-rose-400 border-rose-900/50 cursor-not-allowed opacity-60';
                    } else if (seat.status === 'locked') {
                      bgClass = 'bg-amber-950/40 text-amber-400 border-amber-800/40 cursor-not-allowed';
                    } else if (seat.status === 'maintenance') {
                      bgClass = 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed';
                    }

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={seat.status === 'occupied' || seat.status === 'locked' || seat.status === 'maintenance'}
                        onClick={() => {
                          setSelectedDemoSeat(seat.id);
                          setDemoHoldTime(300);
                        }}
                        className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${bgClass}`}
                      >
                        <Armchair className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold">{seat.id}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Status Color Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 text-[11px] text-slate-400 border-t border-slate-800/80 mt-6">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Your 5-Min Hold
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Locked by Others
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Booked / Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Maintenance
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* PILLAR 1: KYA KYA MILTA HAI - FOR STUDENTS */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 border-t border-slate-800">
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Aspirant Superpowers
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                  Everything Students & Readers Get
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                  Engineered specifically for UPSC, CA, NEET, JEE, and competitive exam preparation where every distraction-free hour matters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <Armchair className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Real-Time Interactive Seat Grid</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    View the live floor plan before arriving. Pick your favorite window seat, corner desk, or cabin next to power outlets.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">5-Minute Temporary Payment Hold</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    As soon as you tap an open seat, our server locks it exclusively for you for 5 minutes while you enter your UPI/card details.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Zero Double-Booking Guarantee</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Backed by database-level transactional locks preventing collisions even during high-demand morning rush hours.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Digital QR Entry Pass</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instant smartphone check-in pass. Scan at the study hall entrance for contactless access without physical paper registers.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Hourly & Monthly Pass Desks</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Flexible study plans: Book hourly study slots or reserve long-term monthly and yearly dedicated pass desks.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Filtered Study Amenities</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Easily filter by high-speed fiber Wi-Fi, air conditioning, private charging points, drinking water, and silent study zones.
                  </p>
                </div>
              </div>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => openAuth('USER', 'register')}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg transition"
                >
                  🎓 Create Free Student Account Now
                </button>
              </div>
            </div>
          </section>

          {/* PILLAR 2: FOR LIBRARY OWNERS */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-800">
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Library Business Automation
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                  What Library Owners Get
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                  Transform idle study desks into reliable cash flow with automated seat reservations and occupancy tracking.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-slate-900 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Monetize Empty Desks</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    List your study space to students searching for quiet workspaces in your area.
                  </p>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Live Occupancy Dashboard</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Real-time visibility over checked-in students, active passes, and vacant seats at any minute.
                  </p>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Custom Seat & Pricing Control</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Configure custom hourly rates, monthly & yearly memberships, and toggle seats in 1 click.
                  </p>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Admin Verified Credibility</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All owner profiles and study halls are verified by Platform Admins to build absolute trust.
                  </p>
                </div>
              </div>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => openAuth('OWNER', 'register')}
                  className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-2xl shadow-lg transition"
                >
                  🏢 List Your Study Hall & Partner With Us
                </button>
              </div>
            </div>
          </section>

          {/* PILLAR 3: PLATFORM SECURITY & GOVERNANCE */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 border-t border-slate-800">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Enterprise Trust & Integrity
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Admin Governance & Email Verification
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                Registrations are validated via transactional OTP email verification. Library owners undergo admin verification before listing.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>OTP Verified Accounts</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Admin Owner Approval Gate</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Transactional Seat Lock Engine</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Auth Modal with targeted role */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={authRole}
        initialMode={authMode}
      />
    </div>
  );
};

export default HomePage;
