export const SETTINGS_STORAGE_KEY = 'bharatExplore_settings';
export const LEGACY_THEME_KEY = 'bharat_explore_theme';

export const VALID_VIEW_MODES = ['grid', 'accordion'];
export const VALID_TOP_LIMITS = [3, 5, 10, 15, 20];
export const VALID_THEMES = ['dark', 'light'];

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'dark',
  defaultViewMode: 'grid',
  defaultTopLimit: 15,
  reducedMotion: false,
});

export function normalizeSettings(raw = {}, fallbackTheme = DEFAULT_SETTINGS.theme) {
  const obj = raw && typeof raw === 'object' ? raw : {};

  const theme = VALID_THEMES.includes(obj.theme)
    ? obj.theme
    : VALID_THEMES.includes(fallbackTheme)
      ? fallbackTheme
      : DEFAULT_SETTINGS.theme;

  const defaultViewMode = VALID_VIEW_MODES.includes(obj.defaultViewMode)
    ? obj.defaultViewMode
    : DEFAULT_SETTINGS.defaultViewMode;

  const numericLimit = Number(obj.defaultTopLimit);
  const defaultTopLimit = VALID_TOP_LIMITS.includes(numericLimit)
    ? numericLimit
    : DEFAULT_SETTINGS.defaultTopLimit;

  const reducedMotion = Boolean(obj.reducedMotion);

  return {
    theme,
    defaultViewMode,
    defaultTopLimit,
    reducedMotion,
  };
}

export function readSettings(
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }

  let legacyTheme = DEFAULT_SETTINGS.theme;
  try {
    const storedLegacyTheme = storage.getItem(LEGACY_THEME_KEY);
    if (VALID_THEMES.includes(storedLegacyTheme)) {
      legacyTheme = storedLegacyTheme;
    } else if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      legacyTheme = 'light';
    }
  } catch {
    // Ignore storage read errors
  }

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return normalizeSettings({ theme: legacyTheme }, legacyTheme);
    }
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed, legacyTheme);
  } catch {
    return normalizeSettings({ theme: legacyTheme }, legacyTheme);
  }
}

export function writeSettings(
  partialOrFull,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const current = readSettings(storage);
  const merged = normalizeSettings(
    { ...current, ...(partialOrFull && typeof partialOrFull === 'object' ? partialOrFull : {}) },
    current.theme
  );

  if (storage) {
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      storage.setItem(LEGACY_THEME_KEY, merged.theme);
    } catch {
      // Ignore storage quota errors
    }
  }

  return merged;
}

export function resetSettingsToDefault(
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const defaults = { ...DEFAULT_SETTINGS };
  if (storage) {
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
      storage.setItem(LEGACY_THEME_KEY, defaults.theme);
    } catch {
      // Ignore storage errors
    }
  }
  return defaults;
}

export function buildUserDataExportPayload({
  user = null,
  settings = DEFAULT_SETTINGS,
  favorites = [],
  trips = [],
  exportedAt = new Date().toISOString(),
} = {}) {
  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeTrips = Array.isArray(trips) ? trips : [];
  const totalTripStops = safeTrips.reduce(
    (sum, trip) => sum + (Array.isArray(trip?.items) ? trip.items.length : 0),
    0
  );

  return {
    application: 'BharatExplore',
    schemaVersion: '1.0',
    exportedAt,
    scope: user
      ? {
          mode: 'authenticated',
          userId: user.id ?? null,
          username: user.username || '',
        }
      : {
          mode: 'guest',
          userId: null,
          username: 'Guest',
        },
    summary: {
      favoritesCount: safeFavorites.length,
      tripsCount: safeTrips.length,
      totalTripStops,
    },
    settings: normalizeSettings(settings),
    favorites: safeFavorites,
    trips: safeTrips,
  };
}
