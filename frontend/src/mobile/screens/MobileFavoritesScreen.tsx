import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Library } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getFavoriteIds, toggleFavorite } from '../../lib/favorites';
import {
  Heart,
  MapPin,
  Star,
  Armchair,
  ArrowRight,
  Compass,
  Sparkles,
  Wifi,
  Clock,
  Loader2,
  Lock,
  LogIn,
} from 'lucide-react';

interface MobileFavoritesScreenProps {
  onSelectLibrary: (library: Library) => void;
  onExplore: () => void;
  onOpenAuth?: () => void;
}

export const MobileFavoritesScreen: React.FC<MobileFavoritesScreenProps> = ({
  onSelectLibrary,
  onExplore,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [favoriteLibraries, setFavoriteLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteIds(user?.id));

  const loadFavorites = async () => {
    if (!user) {
      setFavoriteLibraries([]);
      setFavoriteIds([]);
      setLoading(false);
      return;
    }

    const currentIds = getFavoriteIds(user.id);
    setFavoriteIds(currentIds);

    if (currentIds.length === 0) {
      setFavoriteLibraries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/libraries');
      if (res.data.success) {
        const allLibs: Library[] = res.data.libraries || [];
        const filtered = allLibs.filter((lib) => currentIds.includes(lib.id));
        setFavoriteLibraries(filtered);
      }
    } catch (err) {
      console.error('Failed to load favorite libraries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();

    const handleSync = () => {
      loadFavorites();
    };

    window.addEventListener('libspace_favorites_updated', handleSync);
    return () => window.removeEventListener('libspace_favorites_updated', handleSync);
  }, [user]);

  const handleToggle = (e: React.MouseEvent, libId: string) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth?.();
      return;
    }
    toggleFavorite(libId, user.id);
    setFavoriteLibraries((prev) => prev.filter((lib) => lib.id !== libId));
    setFavoriteIds(getFavoriteIds(user.id));
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold uppercase tracking-wider mb-0.5">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Saved Desks</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Your Favorite Libraries
          </h2>
        </div>
        {user && (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black">
            {favoriteLibraries.length} Saved
          </span>
        )}
      </div>

      {/* When Logged Out: Prompt to Sign In */}
      {!user ? (
        <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-4 mt-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-white">Private Favorites</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your saved libraries and preferred desks are personal. Please sign in to view and manage your saved list.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to View Favorites</span>
          </button>
        </div>
      ) : loading ? (
        <div className="py-20 text-center space-y-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500" />
          <p className="text-xs">Loading your saved libraries...</p>
        </div>
      ) : favoriteLibraries.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-4 mt-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">No Favorite Libraries Yet</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              When exploring study halls, tap the <strong>❤️ Heart icon</strong> on any card to save it here for instant 1-tap booking without searching again.
            </p>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Libraries Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteLibraries.map((library) => {
            const banner =
              library.bannerImage ||
              library.photos?.[0] ||
              'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800';

            return (
              <div
                key={library.id}
                onClick={() => onSelectLibrary(library)}
                className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-3xl overflow-hidden shadow-xl transition active:scale-[0.98] cursor-pointer group space-y-3 p-3"
              >
                {/* Image Banner */}
                <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-950">
                  <img
                    src={banner}
                    alt={library.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-black text-amber-400 border border-slate-800 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{library.rating || '4.8'}</span>
                    </span>

                    {/* Remove from favorites button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggle(e, library.id)}
                      className="p-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-rose-500 border border-slate-800 shadow-md hover:scale-110 active:scale-95 transition"
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </button>
                  </div>

                  {/* Bottom Rate & Timing Overlay */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span>
                        {library.openingTime} - {library.closingTime}
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600/90 font-extrabold shadow-sm">
                      ₹{library.hourlyRate}/hr
                    </span>
                  </div>
                </div>

                {/* Library Info */}
                <div className="px-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition leading-snug">
                        {library.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">
                          {library.address}, {library.city}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Amenities Quick Row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Armchair className="w-3 h-3 text-emerald-400" />
                      <span>{library.totalSeats || 50} Desks</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-blue-400" />
                      <span>High-Speed Fiber</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Sparkles className="w-3 h-3" />
                      <span>5m Hold</span>
                    </span>
                  </div>

                  {/* 1-Click Instant Booking Action */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectLibrary(library)}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <span>Book Seat Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileFavoritesScreen;
