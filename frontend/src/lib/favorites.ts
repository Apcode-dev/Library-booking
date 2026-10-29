// User-Scoped LocalStorage manager for student favorite libraries
// Ensures favorites are strictly private to each logged-in user and hidden when logged out.

const getStorageKey = (userId?: string): string | null => {
  const effectiveId = userId || localStorage.getItem('libspace_user_id');
  if (!effectiveId) return null;
  return `libspace_favorites_${effectiveId}`;
};

export const getFavoriteIds = (userId?: string): string[] => {
  const key = getStorageKey(userId);
  if (!key) return []; // Strictly return empty if not logged in

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isFavorite = (libraryId: string, userId?: string): boolean => {
  const ids = getFavoriteIds(userId);
  return ids.includes(libraryId);
};

export const toggleFavorite = (libraryId: string, userId?: string): { success: boolean; isFav: boolean } => {
  const key = getStorageKey(userId);
  if (!key) {
    return { success: false, isFav: false }; // Cannot favorite without logged-in account
  }

  const ids = getFavoriteIds(userId);
  const exists = ids.includes(libraryId);
  const updated = exists ? ids.filter((id) => id !== libraryId) : [...ids, libraryId];

  try {
    localStorage.setItem(key, JSON.stringify(updated));
    // Dispatch custom event for cross-component realtime sync
    window.dispatchEvent(new Event('libspace_favorites_updated'));
    return { success: true, isFav: !exists };
  } catch (err) {
    console.error('Failed to save favorite', err);
    return { success: false, isFav: exists };
  }
};

export const clearFavoritesForUser = (userId?: string): void => {
  const key = getStorageKey(userId);
  if (key) {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event('libspace_favorites_updated'));
  }
};
