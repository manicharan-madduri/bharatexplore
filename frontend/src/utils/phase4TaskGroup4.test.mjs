import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_TRIPS_KEY,
  USER_TRIPS_PREFIX,
  getTripsStorageKey,
  readTripsList,
  writeTripsList,
  createNewTripObject,
  updateTripDetails,
  addDestinationToTrip,
  removeDestinationFromTrip,
  assignStopToDay,
  moveStopInTrip,
  mergeGuestTripsIntoUser,
  clearUserTripsStorage,
} from './tripsStorage.js';
import {
  clampPlannerDays,
  hasValidCoordinates,
  calculateDistanceKm,
  generateSmartItinerary,
  convertPlanToTripPayload,
} from './smartTripPlanner.js';
import {
  LEGACY_THEME_KEY,
  DEFAULT_SETTINGS,
  normalizeSettings,
  readSettings,
  writeSettings,
  resetSettingsToDefault,
  buildUserDataExportPayload,
} from './settingsStorage.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

const sampleAmberFort = {
  id: 301,
  name: 'Amber Fort',
  slug: 'amber-fort',
  cityOrDistrict: 'Jaipur',
  stateName: 'Rajasthan',
  stateSlug: 'rajasthan',
  category: 'Heritage',
  rankPosition: 1,
  coverImageUrl: 'https://upload.wikimedia.org/amber.jpg',
  shortDescription: 'Hilltop fort overlooking Maota Lake.',
  latitude: 26.9855,
  longitude: 75.8513,
  estimatedVisitDuration: '2 to 3 hours',
  entryFees: 'INR 100 for Indians',
  bestTimeToVisit: 'October to March',
};

const sampleHawaMahal = {
  id: 302,
  name: 'Hawa Mahal',
  slug: 'hawa-mahal',
  cityOrDistrict: 'Jaipur',
  stateName: 'Rajasthan',
  stateSlug: 'rajasthan',
  category: 'Heritage',
  rankPosition: 2,
  coverImageUrl: 'https://upload.wikimedia.org/hawa.jpg',
  shortDescription: 'Iconic pink sandstone Palace of Winds.',
  latitude: 26.9239,
  longitude: 75.8267,
  estimatedVisitDuration: '1 to 2 hours',
  entryFees: 'INR 50',
  bestTimeToVisit: 'November to February',
};

const sampleMehrangarh = {
  id: 303,
  name: 'Mehrangarh Fort',
  slug: 'mehrangarh-fort',
  cityOrDistrict: 'Jodhpur',
  stateName: 'Rajasthan',
  stateSlug: 'rajasthan',
  category: 'Heritage',
  rankPosition: 3,
  coverImageUrl: 'https://upload.wikimedia.org/mehrangarh.jpg',
  shortDescription: 'Majestic citadel in Jodhpur.',
  latitude: null,
  longitude: null,
  estimatedVisitDuration: '',
  entryFees: null,
  bestTimeToVisit: '',
};

const sampleDesertPark = {
  id: 304,
  name: 'Desert National Park',
  slug: 'desert-national-park',
  cityOrDistrict: 'Jaisalmer',
  stateName: 'Rajasthan',
  stateSlug: 'rajasthan',
  category: 'Nature & Wildlife',
  rankPosition: 4,
  coverImageUrl: 'https://upload.wikimedia.org/desert.jpg',
  shortDescription: 'Thar desert ecosystem and wildlife sanctuary.',
  latitude: 26.8167,
  longitude: 70.5167,
};

test('getTripsStorageKey resolves guest and per-user storage keys safely', () => {
  assert.equal(getTripsStorageKey(null), GUEST_TRIPS_KEY);
  assert.equal(getTripsStorageKey(undefined), GUEST_TRIPS_KEY);
  assert.equal(getTripsStorageKey({ id: 19, username: 'kavya' }), `${USER_TRIPS_PREFIX}19`);
  assert.equal(getTripsStorageKey({ username: 'Kavya_99' }), `${USER_TRIPS_PREFIX}kavya_99`);
});

test('readTripsList handles missing, malformed, or corrupt storage payloads safely', () => {
  const storage = createMemoryStorage({
    [GUEST_TRIPS_KEY]: '{broken-json',
    not_an_array: JSON.stringify({ hello: 'world' }),
  });

  assert.deepEqual(readTripsList('missing', storage), []);
  assert.deepEqual(readTripsList(GUEST_TRIPS_KEY, storage), []);
  assert.deepEqual(readTripsList('not_an_array', storage), []);
});

test('Trips workflow: create, edit details, add/remove destinations, assign days, and reorder stops', () => {
  let trip = createNewTripObject({
    title: 'Pink City Escape',
    daysCount: 3,
    description: 'Winter heritage tour',
    items: [sampleAmberFort],
    now: 1000,
  });

  assert.equal(trip.title, 'Pink City Escape');
  assert.equal(trip.daysCount, 3);
  assert.equal(trip.items.length, 1);
  assert.equal(trip.items[0].id, 301);
  assert.equal(trip.items[0].dayNumber, 1);

  // Add second stop to Day 1
  const addStep1 = addDestinationToTrip(trip, sampleHawaMahal, 1, 2000);
  assert.equal(addStep1.added, true);
  trip = addStep1.trip;
  assert.equal(trip.items.length, 2);

  // Adding duplicate destination ID is prevented without duplicating
  const addDup = addDestinationToTrip(trip, sampleHawaMahal, 1, 2500);
  assert.equal(addDup.added, false);
  assert.equal(addDup.alreadyExists, true);
  trip = addDup.trip;
  assert.equal(trip.items.length, 2);

  // Reorder Hawa Mahal (302) up before Amber Fort (301) on Day 1
  trip = moveStopInTrip(trip, 302, 'up', 3000);
  const day1Ids = trip.items.filter((i) => i.dayNumber === 1).map((i) => i.id);
  assert.deepEqual(day1Ids, [302, 301]);

  // Assign Amber Fort (301) to Day 3
  trip = assignStopToDay(trip, 301, 3, 3500);
  assert.equal(trip.items.find((i) => i.id === 301).dayNumber, 3);

  // Edit trip details and shrink daysCount from 3 to 2 -> Day 3 stop is clamped to Day 2
  trip = updateTripDetails(trip, { title: 'Short Jaipur Trip', daysCount: 2 }, 4000);
  assert.equal(trip.title, 'Short Jaipur Trip');
  assert.equal(trip.daysCount, 2);
  assert.equal(trip.items.find((i) => i.id === 301).dayNumber, 2);

  // Remove stop
  trip = removeDestinationFromTrip(trip, 302, 4500);
  assert.equal(trip.items.length, 1);
  assert.equal(trip.items[0].id, 301);
});

test('mergeGuestTripsIntoUser merges guest trips into authenticated user without duplicates or cross-account leakage', () => {
  const storage = createMemoryStorage();
  const userA = { id: 10, username: 'rohan' };
  const userB = { id: 20, username: 'ananya' };
  const userAKey = getTripsStorageKey(userA);

  // User A already has a "Rajasthan Heritage" trip with Amber Fort
  const existingUserTrip = createNewTripObject({
    title: 'Rajasthan Heritage',
    daysCount: 2,
    items: [sampleAmberFort],
    now: 1000,
  });
  writeTripsList(userAKey, [existingUserTrip], storage);

  // Guest creates a duplicate trip (exact same title, daysCount, and stop signature) and a brand new trip ("Desert Safari")
  const guestDuplicateTrip = createNewTripObject({
    title: 'Rajasthan Heritage',
    daysCount: 2,
    items: [sampleAmberFort],
    now: 2000,
  });
  const guestNewTrip = createNewTripObject({
    title: 'Desert Safari',
    daysCount: 2,
    items: [sampleDesertPark],
    now: 2500,
  });
  writeTripsList(GUEST_TRIPS_KEY, [guestDuplicateTrip, guestNewTrip], storage);

  // Merge into User A on login -> duplicate trip is skipped, new trip is merged
  const mergeResult = mergeGuestTripsIntoUser(userA, storage);
  assert.equal(mergeResult.mergedCount, 1);
  assert.equal(mergeResult.trips.length, 2);

  const titles = mergeResult.trips.map((t) => t.title).sort();
  assert.deepEqual(titles, ['Desert Safari', 'Rajasthan Heritage']);

  // Guest key is cleared after merge
  assert.equal(storage.getItem(GUEST_TRIPS_KEY), null);

  // User B logs in afterwards -> does NOT receive User A's or Guest's trips
  const userBMerge = mergeGuestTripsIntoUser(userB, storage);
  assert.equal(userBMerge.mergedCount, 0);
  assert.deepEqual(userBMerge.trips, []);
});

test('Smart Trip Planner generates multi-day itinerary using real rankings/coordinates and labels missing fields honestly', () => {
  assert.equal(clampPlannerDays(1), 2);
  assert.equal(clampPlannerDays(10), 7);
  assert.equal(clampPlannerDays(4), 4);

  assert.equal(hasValidCoordinates(sampleAmberFort), true);
  assert.equal(hasValidCoordinates(sampleMehrangarh), false);

  const distKm = calculateDistanceKm(sampleAmberFort, sampleHawaMahal);
  assert.ok(distKm > 5 && distKm < 10);

  const itinerary = generateSmartItinerary({
    candidates: [sampleAmberFort, sampleHawaMahal, sampleMehrangarh, sampleDesertPark],
    days: 2,
    pace: 'relaxed', // 2 stops per day => 4 stops total
    interests: ['Heritage'],
    scopeLabel: 'Rajasthan',
  });

  assert.equal(itinerary.daysCount, 2);
  assert.equal(itinerary.totalStops, 4);
  assert.equal(itinerary.matchedInterestCount, 3);
  assert.equal(itinerary.fallbackRankCount, 1);
  assert.equal(itinerary.days.length, 2);
  assert.equal(itinerary.days[0].stops.length, 2);
  assert.equal(itinerary.days[1].stops.length, 2);

  // Verify real metadata is preserved for Amber Fort and missing metadata is honestly null for Mehrangarh
  const allStops = itinerary.days.flatMap((d) => d.stops);
  const amberStop = allStops.find((s) => s.id === 301);
  const mehrangarhStop = allStops.find((s) => s.id === 303);

  assert.equal(amberStop.estimatedVisitDuration, '2 to 3 hours');
  assert.equal(amberStop.entryFees, 'INR 100 for Indians');
  assert.equal(amberStop.hasCoordinates, true);

  assert.equal(mehrangarhStop.estimatedVisitDuration, null);
  assert.equal(mehrangarhStop.entryFees, null);
  assert.equal(mehrangarhStop.hasCoordinates, false);
  assert.equal(mehrangarhStop.distanceFromPrevKm, null);

  // Convert plan to My Trips payload
  const payload = convertPlanToTripPayload(itinerary);
  assert.equal(payload.daysCount, 2);
  assert.equal(payload.items.length, 4);
  assert.equal(payload.source, 'planner');
});

test('Settings storage persists preferences, supports legacy theme key, and builds accurate JSON export payload', () => {
  const storage = createMemoryStorage({
    [LEGACY_THEME_KEY]: 'light',
  });

  // Initial read picks up legacy light theme
  const initial = readSettings(storage);
  assert.equal(initial.theme, 'light');
  assert.equal(initial.defaultViewMode, 'grid');
  assert.equal(initial.defaultTopLimit, 15);
  assert.equal(initial.reducedMotion, false);

  // Write custom preferences
  const updated = writeSettings(
    {
      theme: 'dark',
      defaultViewMode: 'accordion',
      defaultTopLimit: 10,
      reducedMotion: true,
    },
    storage
  );
  assert.deepEqual(updated, {
    theme: 'dark',
    defaultViewMode: 'accordion',
    defaultTopLimit: 10,
    reducedMotion: true,
  });
  assert.equal(storage.getItem(LEGACY_THEME_KEY), 'dark');

  // Invalid values fall back safely
  const sanitized = normalizeSettings({
    theme: 'neon',
    defaultViewMode: 'table',
    defaultTopLimit: 999,
    reducedMotion: 1,
  });
  assert.equal(sanitized.theme, DEFAULT_SETTINGS.theme);
  assert.equal(sanitized.defaultViewMode, 'grid');
  assert.equal(sanitized.defaultTopLimit, 15);
  assert.equal(sanitized.reducedMotion, true);

  // Export payload includes accurate counts and scope
  const trip = createNewTripObject({
    title: 'Sample Trip',
    daysCount: 2,
    items: [sampleAmberFort, sampleHawaMahal],
  });
  const exported = buildUserDataExportPayload({
    user: { id: 5, username: 'vikram' },
    settings: updated,
    favorites: [sampleAmberFort],
    trips: [trip],
    exportedAt: '2026-10-12T08:00:00.000Z',
  });

  assert.equal(exported.application, 'BharatExplore');
  assert.equal(exported.scope.mode, 'authenticated');
  assert.equal(exported.scope.username, 'vikram');
  assert.equal(exported.summary.favoritesCount, 1);
  assert.equal(exported.summary.tripsCount, 1);
  assert.equal(exported.summary.totalTripStops, 2);

  // Reset restores defaults
  const afterReset = resetSettingsToDefault(storage);
  assert.deepEqual(afterReset, DEFAULT_SETTINGS);
  assert.deepEqual(readSettings(storage), DEFAULT_SETTINGS);
});

test('clearUserTripsStorage removes only the deleted account trips while preserving guest and unrelated accounts', () => {
  const storage = createMemoryStorage();
  const deletedUser = { id: 10, username: 'Rohan' };
  const otherUser = { id: 20, username: 'Ananya' };

  const deletedUserKey = getTripsStorageKey(deletedUser);
  const deletedUsernameAliasKey = `${USER_TRIPS_PREFIX}rohan`;
  const otherUserKey = getTripsStorageKey(otherUser);

  const sampleTrip = createNewTripObject({
    title: 'Rajasthan Heritage',
    daysCount: 2,
    items: [sampleAmberFort],
    now: 1000,
  });

  writeTripsList(deletedUserKey, [sampleTrip], storage);
  writeTripsList(deletedUsernameAliasKey, [sampleTrip], storage);
  writeTripsList(otherUserKey, [sampleTrip], storage);
  writeTripsList(GUEST_TRIPS_KEY, [sampleTrip], storage);

  // Calling with null or invalid user does nothing and never deletes guest trips
  assert.equal(clearUserTripsStorage(null, storage), false);
  assert.equal(clearUserTripsStorage({}, storage), false);
  assert.equal(readTripsList(GUEST_TRIPS_KEY, storage).length, 1);

  // Permanent deletion of deletedUser removes its keys only
  assert.equal(clearUserTripsStorage(deletedUser, storage), true);
  assert.equal(storage.getItem(deletedUserKey), null);
  assert.equal(storage.getItem(deletedUsernameAliasKey), null);

  // Guest and otherUser trips remain intact
  assert.equal(readTripsList(otherUserKey, storage).length, 1);
  assert.equal(readTripsList(GUEST_TRIPS_KEY, storage).length, 1);
});

