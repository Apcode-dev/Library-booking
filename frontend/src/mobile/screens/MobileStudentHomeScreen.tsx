import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Library } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  MapPin,
  Filter,
  Sparkles,
  Armchair,
  Star,
  Clock,
  ArrowRight,
  ChevronRight,
  Zap,
  Wifi,
  Navigation,
  CheckCircle,
  Heart,
} from 'lucide-react';
import { getFavoriteIds, toggleFavorite } from '../../lib/favorites';

interface MobileStudentHomeScreenProps {
  onSelectLibrary: (library: Library) => void;
  onOpenAuth: () => void;
}

export const MobileStudentHomeScreen: React.FC<MobileStudentHomeScreenProps> = ({
  onSelectLibrary,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'HOURLY' | 'PASSES'>('ALL');
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteIds(user?.id));

  useEffect(() => {
    const handleSync = () => setFavoriteIds(getFavoriteIds(user?.id));
    handleSync();
    window.addEventListener('libspace_favorites_updated', handleSync);
    return () => window.removeEventListener('libspace_favorites_updated', handleSync);
  }, [user]);

  const handleToggleFavorite = (e: React.MouseEvent, libId: string) => {
    e.stopPropagation();
    if (!user) {
      toast('Please sign in to save your favorite libraries.', { icon: '🔐' });
      onOpenAuth();
      return;
    }
    const res = toggleFavorite(libId, user.id);
    if (res.isFav) {
      toast.success('Saved to Favorites ❤️');
    } else {
      toast('Removed from Favorites', { icon: '🗑️' });
    }
    setFavoriteIds(getFavoriteIds(user.id));
  };

  const fetchLibraries = async (coords = userCoords) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { search: search.trim() };
      if (activeCategory === 'HOURLY') params.passType = 'HOURLY';
      if (activeCategory === 'PASSES') params.passType = 'PASSES';
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }

      const res = await api.get('/libraries', { params });
      if (res.data.success) {
        setLibraries(res.data.libraries || []);
      }
    } catch (err: any) {
      setError('Unable to load nearby libraries. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLibraries();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, activeCategory]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device.');
      return;
    }

    setIsGpsActive(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchLibraries(coords);
      },
      () => {
        setIsGpsActive(false);
        alert('Could not retrieve current GPS location. Please ensure location is enabled.');
      }
    );
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Search Header Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by library name, city, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 shadow-lg focus:outline-none focus:border-blue-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* GPS Location & Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={handleUseGps}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
              isGpsActive && userCoords
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${isGpsActive ? 'text-white' : 'text-blue-400'}`} />
            <span>{isGpsActive && userCoords ? 'Near Me (GPS)' : 'Near Me'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All Libraries
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('HOURLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'HOURLY'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Hourly Pay-Per-Study
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('PASSES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'PASSES'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Monthly Passes
          </button>
        </div>
      </div>

      {/* Hero Quick Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/60 via-slate-900 to-indigo-950/80 border border-blue-500/20 p-4 shadow-xl">
        <div className="space-y-1 max-w-[240px]">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
            Instant Study Seats
          </span>
          <h2 className="text-sm font-black text-white leading-tight">
            Reserve Quiet Study Desks in Real-Time
          </h2>
          <p className="text-[11px] text-slate-300">
            5-min double-booking protection & contactless QR passes.
          </p>
        </div>
        <Armchair className="w-16 h-16 text-blue-500/20 absolute -right-2 -bottom-2 pointer-events-none" />
      </div>

      {/* Library Listings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Verified Study Centers ({libraries.length})
          </h3>
          <span className="text-[10px] text-slate-500 font-bold">Auto-Refreshed</span>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-3 animate-pulse space-y-3"
              >
                <div className="h-36 bg-slate-800 rounded-2xl"></div>
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                <div className="h-3 bg-slate-800 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 text-center bg-slate-900 rounded-3xl border border-rose-900/50 space-y-2">
            <p className="text-xs text-rose-300">{error}</p>
            <button
              onClick={() => fetchLibraries()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && libraries.length === 0 && (
          <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
            <Armchair className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Libraries Found</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              We couldn't find any study centers matching your current filters. Try searching a
              different city or resetting filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setActiveCategory('ALL');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Library Cards List */}
        {!loading &&
          !error &&
          libraries.map((library) => {
            const banner =
              library.bannerImage ||
              library.photos?.[0] ||
              'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800';

            return (
              <div
                key={library.id}
                onClick={() => onSelectLibrary(library)}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl overflow-hidden shadow-xl transition active:scale-[0.98] cursor-pointer group space-y-3 p-3"
              >
                {/* Image Banner */}
                <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-950">
                  <img
                    src={banner}
                    alt={library.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  {/* Top Badges: Distance & Rating */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    {typeof library.distanceKm === 'number' ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-black text-blue-400 border border-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>{library.distanceKm.toFixed(1)} km</span>
                      </span>
                    ) : (
                      <span></span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-black text-amber-400 border border-slate-800 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{library.rating || '4.8'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, library.id)}
                        className="p-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-rose-500 hover:scale-110 active:scale-90 transition cursor-pointer"
                        title={favoriteIds.includes(library.id) ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            favoriteIds.includes(library.id)
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Image Overlay: Seats Left */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-950/90 backdrop-blur-md text-emerald-300 border border-emerald-600/50 text-[10px] font-extrabold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{library.availableSeats ?? library.totalSeats} Desks Available</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-black border border-slate-700">
                      ₹{library.hourlyRate}/hr
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-1.5 px-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-white truncate group-hover:text-blue-400 transition">
                      {library.name}
                    </h4>
                    {library.enableMonthly && (
                      <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                        Monthly: ₹{library.monthlyRate || 1200}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span>
                      {library.address}, {library.city}
                    </span>
                  </p>

                  {/* Amenities Badges Row */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                    {library.facilities?.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 text-[9px] font-semibold whitespace-nowrap"
                      >
                        {f}
                      </span>
                    ))}
                    {library.facilities?.length > 3 && (
                      <span className="text-[9px] text-slate-500 font-bold">
                        +{library.facilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Book Action Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Select Desk & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MobileStudentHomeScreen;
