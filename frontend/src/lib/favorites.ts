// LocalStorage manager for student favorite libraries

const FAVORITES_KEY = 'libspace_favorites';

export const getFavoriteIds = (): string[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isFavorite = (libraryId: string): boolean => {
  const ids = getFavoriteIds();
  return ids.includes(libraryId);
};

export const toggleFavorite = (libraryId: string): boolean => {
  const ids = getFavoriteIds();
  const exists = ids.includes(libraryId);
  const updated = exists ? ids.filter((id) => id !== libraryId) : [...ids, libraryId];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    // Dispatch custom event for cross-component sync
    window.dispatchEvent(new Event('libspace_favorites_updated'));
  } catch (err) {
    console.error('Failed to save favorite', err);
  }
  return !exists;
};
