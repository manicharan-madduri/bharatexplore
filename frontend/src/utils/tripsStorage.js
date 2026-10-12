import { normalizeFavoriteItem } from './favoritesStorage.js';

export const GUEST_TRIPS_KEY = 'bharatExplore_trips_guest';
export const USER_TRIPS_PREFIX = 'bharatExplore_trips_user_';

export function getTripsStorageKey(user) {
  if (!user || typeof user !== 'object') {
    return GUEST_TRIPS_KEY;
  }
  const identifier =
    user.id !== undefined && user.id !== null && String(user.id).trim() !== ''
      ? String(user.id).trim()
      : typeof user.username === 'string' && user.username.trim() !== ''
        ? user.username.trim().toLowerCase()
        : null;

  return identifier ? `${USER_TRIPS_PREFIX}${identifier}` : GUEST_TRIPS_KEY;
}

export function clampDaysCount(days, fallback = 3) {
  const num = Number(days);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(14, Math.trunc(num)));
}

export function normalizeTripStop(raw, maxDays = 14, fallbackOrder = 0) {
  const base = normalizeFavoriteItem(raw);
  if (!base) return null;

  const rawDay = Number(raw?.dayNumber ?? raw?.day ?? 1);
  const dayNumber = Number.isFinite(rawDay)
    ? Math.max(1, Math.min(clampDaysCount(maxDays, 14), Math.trunc(rawDay)))
    : 1;

  const rawOrder = Number(raw?.orderIndex ?? fallbackOrder);
  const orderIndex = Number.isFinite(rawOrder) ? Math.max(0, Math.trunc(rawOrder)) : fallbackOrder;

  const lat = raw?.latitude !== undefined && raw?.latitude !== null && raw?.latitude !== ''
    ? Number(raw.latitude)
    : null;
  const lng = raw?.longitude !== undefined && raw?.longitude !== null && raw?.longitude !== ''
    ? Number(raw.longitude)
    : null;

  return {
    ...base,
    estimatedVisitDuration:
      typeof raw?.estimatedVisitDuration === 'string' ? raw.estimatedVisitDuration.trim() : '',
    entryFees: typeof raw?.entryFees === 'string' ? raw.entryFees.trim() : '',
    openingHours: typeof raw?.openingHours === 'string' ? raw.openingHours.trim() : '',
    travelTips: typeof raw?.travelTips === 'string' ? raw.travelTips.trim() : '',
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    dayNumber,
    orderIndex,
    notes: typeof raw?.notes === 'string' ? raw.notes.trim().slice(0, 300) : '',
    addedAt:
      typeof raw?.addedAt === 'number' && Number.isFinite(raw.addedAt)
        ? raw.addedAt
        : Date.now(),
  };
}

export function normalizeAndOrderStops(items = [], daysCount = 3) {
  if (!Array.isArray(items)) return [];
  const safeDays = clampDaysCount(daysCount, 3);
  const seenIds = new Set();
  const validStops = [];

  items.forEach((raw, idx) => {
    const stop = normalizeTripStop(raw, safeDays, idx);
    if (!stop) return;
    const key = String(stop.id);
    if (seenIds.has(key)) return;
    seenIds.add(key);
    validStops.push(stop);
  });

  // Group by dayNumber (1..safeDays) and assign contiguous orderIndex within each day
  const byDay = new Map();
  for (let d = 1; d <= safeDays; d += 1) {
    byDay.set(d, []);
  }

  validStops.forEach((stop) => {
    const day = Math.max(1, Math.min(safeDays, stop.dayNumber || 1));
    byDay.get(day).push({ ...stop, dayNumber: day });
  });

  const ordered = [];
  for (let d = 1; d <= safeDays; d += 1) {
    const dayStops = byDay.get(d);
    dayStops.sort((a, b) => a.orderIndex - b.orderIndex);
    dayStops.forEach((stop, idx) => {
      ordered.push({
        ...stop,
        dayNumber: d,
        orderIndex: idx,
      });
    });
  }

  return ordered;
}

export function normalizeTrip(raw, fallbackTimestamp = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;

  const rawId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
  const id = rawId || `trip_${fallbackTimestamp}_${Math.random().toString(36).slice(2, 8)}`;

  const daysCount = clampDaysCount(raw.daysCount, 3);
  const items = normalizeAndOrderStops(raw.items, daysCount);

  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : fallbackTimestamp;
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : createdAt;

  return {
    id,
    title: title.slice(0, 120),
    description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 500) : '',
    daysCount,
    startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : '',
    stateSummary: typeof raw.stateSummary === 'string' ? raw.stateSummary.trim() : '',
    pace: typeof raw.pace === 'string' ? raw.pace.trim() : 'balanced',
    source: raw.source === 'planner' ? 'planner' : 'manual',
    createdAt,
    updatedAt,
    items,
  };
}

function getTripSignature(trip) {
  const stopSig = (trip.items || []).map((i) => `${i.id}:${i.dayNumber}`).join(',');
  return `${trip.title.toLowerCase()}__${trip.daysCount}__${stopSig}`;
}

export function deduplicateTrips(trips = []) {
  if (!Array.isArray(trips)) return [];
  const byId = new Map();
  const bySig = new Set();

  trips.forEach((raw, idx) => {
    const normalized = normalizeTrip(raw, Date.now() - idx);
    if (!normalized) return;

    const sig = getTripSignature(normalized);
    if (byId.has(normalized.id)) {
      return;
    }
    if (bySig.has(sig)) {
      return;
    }
    byId.set(normalized.id, normalized);
    bySig.add(sig);
  });

  return Array.from(byId.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function readTripsList(
  storageKey,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage || !storageKey) return [];
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateTrips(parsed);
  } catch {
    return [];
  }
}

export function writeTripsList(
  storageKey,
  trips,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const clean = deduplicateTrips(trips);
  if (!storage || !storageKey) return clean;
  try {
    storage.setItem(storageKey, JSON.stringify(clean));
  } catch {
    // Ignore storage quota errors
  }
  return clean;
}

export function createNewTripObject({
  title,
  description = '',
  daysCount = 3,
  startDate = '',
  stateSummary = '',
  pace = 'balanced',
  source = 'manual',
  items = [],
  now = Date.now(),
} = {}) {
  return normalizeTrip(
    {
      id: `trip_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      daysCount,
      startDate,
      stateSummary,
      pace,
      source,
      createdAt: now,
      updatedAt: now,
      items,
    },
    now
  );
}

export function updateTripDetails(trip, patch = {}, now = Date.now()) {
  const current = normalizeTrip(trip, now);
  if (!current) return null;

  const nextDaysCount =
    patch.daysCount !== undefined ? clampDaysCount(patch.daysCount, current.daysCount) : current.daysCount;

  const adjustedItems = (current.items || []).map((item) => ({
    ...item,
    dayNumber: Math.min(item.dayNumber || 1, nextDaysCount),
  }));

  return normalizeTrip(
    {
      ...current,
      ...patch,
      title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : current.title,
      daysCount: nextDaysCount,
      items: patch.items !== undefined ? patch.items : adjustedItems,
      updatedAt: now,
    },
    now
  );
}

export function addDestinationToTrip(trip, destination, dayNumber = 1, now = Date.now()) {
  const current = normalizeTrip(trip, now);
  if (!current) return { trip: null, added: false, alreadyExists: false };

  const targetDay = Math.max(1, Math.min(current.daysCount, Number(dayNumber) || 1));
  const stopCandidate = normalizeTripStop(
    { ...destination, dayNumber: targetDay, addedAt: now },
    current.daysCount,
    current.items.length
  );

  if (!stopCandidate) {
    return { trip: current, added: false, alreadyExists: false };
  }

  const alreadyExists = current.items.some((item) => String(item.id) === String(stopCandidate.id));
  if (alreadyExists) {
    return { trip: current, added: false, alreadyExists: true };
  }

  const nextItems = normalizeAndOrderStops([...current.items, stopCandidate], current.daysCount);
  const nextStateSummary =
    current.stateSummary || stopCandidate.stateName || '';

  const updated = normalizeTrip(
    {
      ...current,
      stateSummary: nextStateSummary,
      items: nextItems,
      updatedAt: now,
    },
    now
  );

  return { trip: updated, added: true, alreadyExists: false };
}

export function removeDestinationFromTrip(trip, destinationId, now = Date.now()) {
  const current = normalizeTrip(trip, now);
  if (!current) return null;

  const nextItems = current.items.filter((item) => String(item.id) !== String(destinationId));
  return normalizeTrip(
    {
      ...current,
      items: nextItems,
      updatedAt: now,
    },
    now
  );
}

export function assignStopToDay(trip, destinationId, targetDay, now = Date.now()) {
  const current = normalizeTrip(trip, now);
  if (!current) return null;

  const clampedDay = Math.max(1, Math.min(current.daysCount, Number(targetDay) || 1));
  const nextItems = current.items.map((item) =>
    String(item.id) === String(destinationId)
      ? { ...item, dayNumber: clampedDay, orderIndex: 9999 }
      : item
  );

  return normalizeTrip(
    {
      ...current,
      items: nextItems,
      updatedAt: now,
    },
    now
  );
}

export function moveStopInTrip(trip, destinationId, direction = 'up', now = Date.now()) {
  const current = normalizeTrip(trip, now);
  if (!current) return null;

  const targetStop = current.items.find((item) => String(item.id) === String(destinationId));
  if (!targetStop) return current;

  const dayNumber = targetStop.dayNumber;
  const dayStops = current.items
    .filter((item) => item.dayNumber === dayNumber)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const indexInDay = dayStops.findIndex((item) => String(item.id) === String(destinationId));
  if (indexInDay === -1) return current;

  const swapIndex = direction === 'up' ? indexInDay - 1 : indexInDay + 1;

  // If moving within the same day
  if (swapIndex >= 0 && swapIndex < dayStops.length) {
    const reorderedDayStops = [...dayStops];
    const [moved] = reorderedDayStops.splice(indexInDay, 1);
    reorderedDayStops.splice(swapIndex, 0, moved);

    const updatedDayMap = new Map(
      reorderedDayStops.map((stop, idx) => [String(stop.id), idx])
    );

    const nextItems = current.items.map((item) =>
      updatedDayMap.has(String(item.id))
        ? { ...item, orderIndex: updatedDayMap.get(String(item.id)) }
        : item
    );

    return normalizeTrip(
      {
        ...current,
        items: nextItems,
        updatedAt: now,
      },
      now
    );
  }

  // If at top of day and moving up -> move to previous day if available
  if (direction === 'up' && dayNumber > 1) {
    return assignStopToDay(current, destinationId, dayNumber - 1, now);
  }

  // If at bottom of day and moving down -> move to next day if available
  if (direction === 'down' && dayNumber < current.daysCount) {
    return assignStopToDay(current, destinationId, dayNumber + 1, now);
  }

  return current;
}

export function mergeGuestTripsIntoUser(
  user,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  const userKey = getTripsStorageKey(user);
  if (!storage || userKey === GUEST_TRIPS_KEY) {
    return {
      trips: readTripsList(GUEST_TRIPS_KEY, storage),
      mergedCount: 0,
    };
  }

  const guestTrips = readTripsList(GUEST_TRIPS_KEY, storage);
  const userTrips = readTripsList(userKey, storage);

  if (guestTrips.length === 0) {
    return {
      trips: userTrips,
      mergedCount: 0,
    };
  }

  const existingIds = new Set(userTrips.map((t) => t.id));
  const existingSigs = new Set(userTrips.map((t) => getTripSignature(t)));

  const newlyAdded = guestTrips.filter(
    (gt) => !existingIds.has(gt.id) && !existingSigs.has(getTripSignature(gt))
  );

  const merged = deduplicateTrips([...newlyAdded, ...userTrips]);
  writeTripsList(userKey, merged, storage);

  try {
    storage.removeItem(GUEST_TRIPS_KEY);
  } catch {
    // Ignore storage errors
  }

  return {
    trips: merged,
    mergedCount: newlyAdded.length,
  };
}

/**
 * Removes only the specified authenticated user's trips from localStorage
 * after permanent account deletion, while preserving guest trips and any
 * other user accounts' entries.
 */
export function clearUserTripsStorage(
  user,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage || !user || typeof user !== 'object') {
    return false;
  }

  const primaryKey = getTripsStorageKey(user);
  if (!primaryKey || primaryKey === GUEST_TRIPS_KEY || !primaryKey.startsWith(USER_TRIPS_PREFIX)) {
    return false;
  }

  let removed = false;
  try {
    storage.removeItem(primaryKey);
    removed = true;

    if (typeof user.username === 'string' && user.username.trim() !== '') {
      const usernameKey = `${USER_TRIPS_PREFIX}${user.username.trim().toLowerCase()}`;
      if (usernameKey !== GUEST_TRIPS_KEY && usernameKey !== primaryKey) {
        storage.removeItem(usernameKey);
      }
    }
  } catch {
    // Ignore storage errors
  }

  return removed;
}

