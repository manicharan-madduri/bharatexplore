import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  GUEST_FAVORITES_KEY,
  getFavoritesStorageKey,
  readFavoritesList,
  writeFavoritesList,
  toggleFavoriteInList,
  mergeGuestFavoritesIntoUser,
  normalizeFavoriteItem,
} from '../utils/favoritesStorage';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const activeStorageKey = useMemo(() => getFavoritesStorageKey(user), [user]);

  const [favorites, setFavorites] = useState(() => readFavoritesList(GUEST_FAVORITES_KEY));
  const [lastMergedCount, setLastMergedCount] = useState(0);

  // Sync and merge guest favorites into user storage when auth resolves or user logs in/out
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const { favorites: mergedList, mergedCount } = mergeGuestFavoritesIntoUser(user);
      setFavorites(mergedList);
      if (mergedCount > 0) {
        setLastMergedCount(mergedCount);
      }
    } else {
      setFavorites(readFavoritesList(GUEST_FAVORITES_KEY));
      setLastMergedCount(0);
    }
  }, [user, authLoading]);

  // Synchronize across tabs if localStorage changes externally
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === activeStorageKey || e.key === GUEST_FAVORITES_KEY) {
        setFavorites(readFavoritesList(activeStorageKey));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [activeStorageKey]);

  const favoriteIdSet = useMemo(
    () => new Set(favorites.map((item) => String(item.id))),
    [favorites]
  );

  const isFavorite = useCallback(
    (destinationId) => {
      if (destinationId === undefined || destinationId === null) return false;
      return favoriteIdSet.has(String(destinationId));
    },
    [favoriteIdSet]
  );

  const toggleFavorite = useCallback(
    (destination) => {
      let wasAdded = false;
      setFavorites((prev) => {
        const { nextList, added } = toggleFavoriteInList(prev, destination);
        wasAdded = added;
        writeFavoritesList(activeStorageKey, nextList);
        return nextList;
      });
      return wasAdded;
    },
    [activeStorageKey]
  );

  const addFavorite = useCallback(
    (destination) => {
      const normalized = normalizeFavoriteItem(destination);
      if (!normalized) return false;
      setFavorites((prev) => {
        if (prev.some((item) => String(item.id) === String(normalized.id))) {
          return prev;
        }
        const nextList = writeFavoritesList(activeStorageKey, [normalized, ...prev]);
        return nextList;
      });
      return true;
    },
    [activeStorageKey]
  );

  const removeFavorite = useCallback(
    (destinationId) => {
      if (destinationId === undefined || destinationId === null) return;
      const targetKey = String(destinationId);
      setFavorites((prev) => {
        const nextList = prev.filter((item) => String(item.id) !== targetKey);
        writeFavoritesList(activeStorageKey, nextList);
        return nextList;
      });
    },
    [activeStorageKey]
  );

  const clearFavorites = useCallback(() => {
    writeFavoritesList(activeStorageKey, []);
    setFavorites([]);
  }, [activeStorageKey]);

  const dismissMergeNotice = useCallback(() => {
    setLastMergedCount(0);
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      favoritesCount: favorites.length,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      clearFavorites,
      lastMergedCount,
      dismissMergeNotice,
    }),
    [
      favorites,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      clearFavorites,
      lastMergedCount,
      dismissMergeNotice,
    ]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}
