export const GUEST_FAVORITES_KEY = 'bharatExplore_favorites_guest';
export const USER_FAVORITES_PREFIX = 'bharatExplore_favorites_user_';

/**
 * Resolves the canonical per-user localStorage key for an authenticated user,
 * or returns the guest localStorage key when no user is signed in.
 */
export function getFavoritesStorageKey(user) {
  if (!user || typeof user !== 'object') {
    return GUEST_FAVORITES_KEY;
  }
  const identifier =
    user.id !== undefined && user.id !== null && String(user.id).trim() !== ''
      ? String(user.id).trim()
      : typeof user.username === 'string' && user.username.trim() !== ''
        ? user.username.trim().toLowerCase()
        : null;

  return identifier ? `${USER_FAVORITES_PREFIX}${identifier}` : GUEST_FAVORITES_KEY;
}

/**
 * Normalizes a destination object into a compact, consistent favorite record
 * suitable for DestinationCard, DestinationAccordion, and FavoritesPage.
 * Returns null if the input lacks a valid destination id or name.
 */
export function normalizeFavoriteItem(raw, fallbackTimestamp = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;

  const rawId = raw.id ?? raw.destinationId;
  if (rawId === undefined || rawId === null || typeof rawId === 'boolean' || String(rawId).trim() === '') {
    return null;
  }

  const numericId = Number(rawId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }
  const id = Math.trunc(numericId);

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const rawCity =
    typeof raw.cityOrDistrict === 'string' && raw.cityOrDistrict.trim()
      ? raw.cityOrDistrict.trim()
      : typeof raw.city === 'string'
        ? raw.city.trim()
        : '';

  const rawCover =
    typeof raw.coverImageUrl === 'string' && raw.coverImageUrl.trim()
      ? raw.coverImageUrl.trim()
      : typeof raw.primaryPhotoUrl === 'string'
        ? raw.primaryPhotoUrl.trim()
        : '';

  const rawRank =
    typeof raw.rankPosition === 'number' && Number.isFinite(raw.rankPosition)
      ? raw.rankPosition
      : typeof raw.rank === 'number' && Number.isFinite(raw.rank)
        ? raw.rank
        : typeof raw.rankingInfo?.rankPosition === 'number'
          ? raw.rankingInfo.rankPosition
          : null;

  return {
    id,
    slug: typeof raw.slug === 'string' ? raw.slug.trim() : '',
    name,
    stateName: typeof raw.stateName === 'string' ? raw.stateName.trim() : '',
    stateSlug: typeof raw.stateSlug === 'string' ? raw.stateSlug.trim() : '',
    cityOrDistrict: rawCity,
    category: typeof raw.category === 'string' ? raw.category.trim() : '',
    coverImageUrl: rawCover,
    shortDescription:
      typeof raw.shortDescription === 'string'
        ? raw.shortDescription.trim()
        : typeof raw.fullDescription === 'string'
          ? raw.fullDescription.trim().slice(0, 220)
          : '',
    bestTimeToVisit: typeof raw.bestTimeToVisit === 'string' ? raw.bestTimeToVisit.trim() : '',
    rankPosition: rawRank,
    reportingYear:
      typeof raw.reportingYear === 'number' && Number.isFinite(raw.reportingYear)
        ? raw.reportingYear
        : typeof raw.rankingInfo?.reportingYear === 'number'
          ? raw.rankingInfo.reportingYear
          : null,
    savedAt:
      typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt)
        ? raw.savedAt
        : fallbackTimestamp,
  };
}

/**
 * Deduplicates an array of favorite destination objects by canonical destination ID,
 * preserving the first occurrence's order while keeping the most complete metadata.
 */
export function deduplicateFavorites(items = []) {
  if (!Array.isArray(items)) return [];
  const seen = new Map();

  items.forEach((raw, idx) => {
    const normalized = normalizeFavoriteItem(raw, Date.now() - idx);
    if (!normalized) return;
    const key = String(normalized.id);
    if (!seen.has(key)) {
      seen.set(key, normalized);
    } else {
      const existing = seen.get(key);
      seen.set(key, {
        ...normalized,
        ...existing,
        savedAt: Math.max(existing.savedAt || 0, normalized.savedAt || 0),
      });
    }
  });

  return Array.from(seen.values());
}

/**
 * Safely reads and validates a favorites list from storage.
 * Handles missing keys, corrupted JSON, non-array payloads, and malformed items without throwing.
 */
export function readFavoritesList(
  storageKey,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage || !storageKey) return [];
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateFavorites(parsed);
  } catch {
    return [];
  }
}

/**
 * Safely writes a deduplicated favorites list to storage.
 */
export function writeFavoritesList(
  storageKey,
  items,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const clean = deduplicateFavorites(items);
  if (!storage || !storageKey) return clean;
  try {
    storage.setItem(storageKey, JSON.stringify(clean));
  } catch {
    // Ignore storage quota errors
  }
  return clean;
}

/**
 * Toggles a destination inside an existing favorites array (adds to front if absent, removes if present).
 */
export function toggleFavoriteInList(currentList, destination, now = Date.now()) {
  const safeList = deduplicateFavorites(currentList);
  const candidate = normalizeFavoriteItem(destination, now);
  if (!candidate) {
    return { nextList: safeList, added: false };
  }

  const targetKey = String(candidate.id);
  const exists = safeList.some((item) => String(item.id) === targetKey);

  if (exists) {
    return {
      nextList: safeList.filter((item) => String(item.id) !== targetKey),
      added: false,
    };
  }

  return {
    nextList: [candidate, ...safeList],
    added: true,
  };
}

/**
 * Atomically merges guest favorites (`bharatExplore_favorites_guest`) into the authenticated
 * user's favorites (`bharatExplore_favorites_user_<id>`), deduplicating by destination ID
 * and clearing guest storage only after user storage is updated.
 */
export function mergeGuestFavoritesIntoUser(
  user,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const userKey = getFavoritesStorageKey(user);
  if (!storage || userKey === GUEST_FAVORITES_KEY) {
    return {
      favorites: readFavoritesList(GUEST_FAVORITES_KEY, storage),
      mergedCount: 0,
    };
  }

  const guestList = readFavoritesList(GUEST_FAVORITES_KEY, storage);
  const userList = readFavoritesList(userKey, storage);

  if (guestList.length === 0) {
    return {
      favorites: userList,
      mergedCount: 0,
    };
  }

  const existingUserIds = new Set(userList.map((item) => String(item.id)));
  const newlyMergedCount = guestList.filter((item) => !existingUserIds.has(String(item.id))).length;

  // Place newly added guest favorites at the top, followed by existing user favorites
  const merged = deduplicateFavorites([...guestList, ...userList]);
  writeFavoritesList(userKey, merged, storage);

  try {
    storage.removeItem(GUEST_FAVORITES_KEY);
  } catch {
    // Ignore storage errors
  }

  return {
    favorites: merged,
    mergedCount: newlyMergedCount,
  };
}

/**
 * Removes only the specified authenticated user's favorites from localStorage
 * after permanent account deletion, while preserving guest favorites and any
 * other user accounts' entries.
 */
export function clearUserFavoritesStorage(
  user,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage || !user || typeof user !== 'object') {
    return false;
  }

  const primaryKey = getFavoritesStorageKey(user);
  if (!primaryKey || primaryKey === GUEST_FAVORITES_KEY || !primaryKey.startsWith(USER_FAVORITES_PREFIX)) {
    return false;
  }

  let removed = false;
  try {
    storage.removeItem(primaryKey);
    removed = true;

    if (typeof user.username === 'string' && user.username.trim() !== '') {
      const usernameKey = `${USER_FAVORITES_PREFIX}${user.username.trim().toLowerCase()}`;
      if (usernameKey !== GUEST_FAVORITES_KEY && usernameKey !== primaryKey) {
        storage.removeItem(usernameKey);
      }
    }
  } catch {
    // Ignore storage errors
  }

  return removed;
}

