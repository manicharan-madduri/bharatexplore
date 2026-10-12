import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_FAVORITES_KEY,
  USER_FAVORITES_PREFIX,
  getFavoritesStorageKey,
  normalizeFavoriteItem,
  deduplicateFavorites,
  readFavoritesList,
  writeFavoritesList,
  toggleFavoriteInList,
  mergeGuestFavoritesIntoUser,
  clearUserFavoritesStorage,
} from './favoritesStorage.js';

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

const sampleTajMahal = {
  id: 101,
  name: 'Taj Mahal',
  slug: 'taj-mahal',
  city: 'Agra',
  stateName: 'Uttar Pradesh',
  stateSlug: 'uttar-pradesh',
  category: 'Monument',
  rank: 1,
  primaryPhotoUrl: 'https://upload.wikimedia.org/taj.jpg',
  shortDescription: 'Iconic white marble mausoleum in Agra.',
};

const sampleHawaMahal = {
  id: 202,
  name: 'Hawa Mahal',
  slug: 'hawa-mahal',
  city: 'Jaipur',
  stateName: 'Rajasthan',
  stateSlug: 'rajasthan',
  category: 'Palace',
  rank: 2,
  primaryPhotoUrl: 'https://upload.wikimedia.org/hawa.jpg',
  shortDescription: 'Palace of Winds in Jaipur.',
};

test('getFavoritesStorageKey resolves guest key when unauthenticated and user key when authenticated', () => {
  assert.equal(getFavoritesStorageKey(null), GUEST_FAVORITES_KEY);
  assert.equal(getFavoritesStorageKey(undefined), GUEST_FAVORITES_KEY);
  assert.equal(getFavoritesStorageKey({ id: 42, username: 'arjun' }), `${USER_FAVORITES_PREFIX}42`);
  assert.equal(getFavoritesStorageKey({ username: 'Traveler_One' }), `${USER_FAVORITES_PREFIX}traveler_one`);
});

test('normalizeFavoriteItem validates required destination id and name', () => {
  assert.equal(normalizeFavoriteItem(null), null);
  assert.equal(normalizeFavoriteItem({}), null);
  assert.equal(normalizeFavoriteItem({ id: 'invalid', name: 'Nowhere' }), null);
  assert.equal(normalizeFavoriteItem({ id: 15, name: '   ' }), null);

  const normalized = normalizeFavoriteItem(sampleTajMahal, 1700000000000);
  assert.equal(normalized.id, 101);
  assert.equal(normalized.name, 'Taj Mahal');
  assert.equal(normalized.stateName, 'Uttar Pradesh');
  assert.equal(normalized.rankPosition, 1);
  assert.equal(normalized.savedAt, 1700000000000);
});

test('deduplicateFavorites removes duplicate destination IDs and invalid entries', () => {
  const list = [
    { ...sampleTajMahal, savedAt: 1000 },
    { id: 101, name: 'Taj Mahal Duplicate', savedAt: 2000 },
    { id: 'bad', name: 'Invalid ID' },
    { ...sampleHawaMahal, savedAt: 1500 },
  ];

  const deduped = deduplicateFavorites(list);
  assert.equal(deduped.length, 2);
  assert.deepEqual(deduped.map((d) => d.id), [101, 202]);
  assert.equal(deduped[0].name, 'Taj Mahal');
});

test('readFavoritesList safely handles missing, malformed, or non-array localStorage data', () => {
  const storage = createMemoryStorage({
    [GUEST_FAVORITES_KEY]: '{not-valid-json',
    corrupt_object: JSON.stringify({ not: 'an array' }),
    partial_valid: JSON.stringify([
      sampleTajMahal,
      null,
      { id: -5, name: 'Bad ID' },
      sampleHawaMahal,
    ]),
  });

  assert.deepEqual(readFavoritesList('missing_key', storage), []);
  assert.deepEqual(readFavoritesList(GUEST_FAVORITES_KEY, storage), []);
  assert.deepEqual(readFavoritesList('corrupt_object', storage), []);

  const partial = readFavoritesList('partial_valid', storage);
  assert.equal(partial.length, 2);
  assert.deepEqual(partial.map((d) => d.id), [101, 202]);
});

test('toggleFavoriteInList adds and removes destinations by stable ID without duplicates', () => {
  const initial = [];
  const step1 = toggleFavoriteInList(initial, sampleTajMahal, 1000);
  assert.equal(step1.added, true);
  assert.equal(step1.nextList.length, 1);
  assert.equal(step1.nextList[0].id, 101);

  const step2 = toggleFavoriteInList(step1.nextList, sampleHawaMahal, 2000);
  assert.equal(step2.added, true);
  assert.deepEqual(step2.nextList.map((d) => d.id), [202, 101]);

  // Toggling Taj Mahal again removes it
  const step3 = toggleFavoriteInList(step2.nextList, { id: '101', name: 'Taj Mahal' }, 3000);
  assert.equal(step3.added, false);
  assert.deepEqual(step3.nextList.map((d) => d.id), [202]);
});

test('mergeGuestFavoritesIntoUser merges guest items into user key, deduplicates, and clears guest storage', () => {
  const storage = createMemoryStorage();
  const user = { id: 7, username: 'priya' };
  const userKey = getFavoritesStorageKey(user);

  // Existing user has Taj Mahal saved earlier
  writeFavoritesList(
    userKey,
    [{ ...sampleTajMahal, shortDescription: 'Old description', savedAt: 1000 }],
    storage
  );

  // Guest session saved Taj Mahal (updated metadata) and Hawa Mahal (new)
  writeFavoritesList(
    GUEST_FAVORITES_KEY,
    [
      { ...sampleHawaMahal, savedAt: 2500 },
      { ...sampleTajMahal, shortDescription: 'Updated Taj description', savedAt: 2000 },
    ],
    storage
  );

  const result = mergeGuestFavoritesIntoUser(user, storage);
  assert.equal(result.mergedCount, 1);
  assert.equal(result.favorites.length, 2);
  assert.deepEqual(result.favorites.map((d) => d.id), [202, 101]);

  // Guest storage is cleared after merge so logging into another account won't leak
  assert.equal(storage.getItem(GUEST_FAVORITES_KEY), null);
  assert.equal(readFavoritesList(userKey, storage).length, 2);
});

test('signing out preserves user favorites across re-login and never leaks into guest or another user account', () => {
  const storage = createMemoryStorage();
  const userA = { id: 11, username: 'arjun' };
  const userB = { id: 22, username: 'meera' };

  // User A saves Taj Mahal while signed in
  const userAKey = getFavoritesStorageKey(userA);
  writeFavoritesList(userAKey, [sampleTajMahal], storage);

  // User A signs out -> active key reverts to GUEST_FAVORITES_KEY (empty)
  const guestKeyAfterLogout = getFavoritesStorageKey(null);
  assert.equal(guestKeyAfterLogout, GUEST_FAVORITES_KEY);
  assert.deepEqual(readFavoritesList(guestKeyAfterLogout, storage), []);

  // User B signs in -> receives 0 merged items and does NOT inherit User A's favorites
  const userBMerge = mergeGuestFavoritesIntoUser(userB, storage);
  assert.equal(userBMerge.mergedCount, 0);
  assert.deepEqual(userBMerge.favorites, []);

  // User A signs back in -> User A's saved Taj Mahal is restored intact
  const userARelogin = mergeGuestFavoritesIntoUser(userA, storage);
  assert.equal(userARelogin.mergedCount, 0);
  assert.equal(userARelogin.favorites.length, 1);
  assert.equal(userARelogin.favorites[0].id, 101);
});

test('clearUserFavoritesStorage removes only the deleted account entry while preserving guest and unrelated accounts', () => {
  const storage = createMemoryStorage();
  const deletedUser = { id: 11, username: 'Arjun' };
  const otherUser = { id: 22, username: 'Meera' };

  const deletedUserKey = getFavoritesStorageKey(deletedUser);
  const deletedUsernameAliasKey = `${USER_FAVORITES_PREFIX}arjun`;
  const otherUserKey = getFavoritesStorageKey(otherUser);

  writeFavoritesList(deletedUserKey, [sampleTajMahal], storage);
  writeFavoritesList(deletedUsernameAliasKey, [sampleTajMahal], storage);
  writeFavoritesList(otherUserKey, [sampleHawaMahal], storage);
  writeFavoritesList(GUEST_FAVORITES_KEY, [sampleHawaMahal], storage);

  // Calling with null or invalid user does nothing and never deletes guest storage
  assert.equal(clearUserFavoritesStorage(null, storage), false);
  assert.equal(clearUserFavoritesStorage({}, storage), false);
  assert.equal(readFavoritesList(GUEST_FAVORITES_KEY, storage).length, 1);

  // Permanent deletion of deletedUser removes its keys only
  assert.equal(clearUserFavoritesStorage(deletedUser, storage), true);
  assert.equal(storage.getItem(deletedUserKey), null);
  assert.equal(storage.getItem(deletedUsernameAliasKey), null);

  // Guest and otherUser favorites remain completely untouched
  assert.equal(readFavoritesList(otherUserKey, storage).length, 1);
  assert.equal(readFavoritesList(GUEST_FAVORITES_KEY, storage).length, 1);
});


