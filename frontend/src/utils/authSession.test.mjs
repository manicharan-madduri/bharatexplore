import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_SESSION_KEY,
  LEGACY_GUEST_SESSION_KEY,
  isAuthRoutePath,
  isSafeInternalPath,
  readGuestSession,
  writeGuestSession,
  shouldRedirectToWelcomeGate,
  resolvePostAuthRedirect,
  resolvePostLogoutRedirect,
} from './authSession.js';

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
  };
}

test('shouldRedirectToWelcomeGate redirects first-time visitors on non-auth routes after loading completes', () => {
  assert.equal(
    shouldRedirectToWelcomeGate({ loading: false, user: null, guestMode: false, pathname: '/' }),
    true
  );
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: null,
      guestMode: false,
      pathname: '/state/rajasthan',
    }),
    true
  );
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: null,
      guestMode: false,
      pathname: '/search',
    }),
    true
  );
});

test('shouldRedirectToWelcomeGate does not redirect while loading or when on auth routes', () => {
  assert.equal(
    shouldRedirectToWelcomeGate({ loading: true, user: null, guestMode: false, pathname: '/' }),
    false
  );
  assert.equal(
    shouldRedirectToWelcomeGate({ loading: false, user: null, guestMode: false, pathname: '/auth' }),
    false
  );
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: null,
      guestMode: false,
      pathname: '/forgot-password',
    }),
    false
  );
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: null,
      guestMode: false,
      pathname: '/reset-password',
    }),
    false
  );
});

test('shouldRedirectToWelcomeGate allows navigation for guests and authenticated users without redirect', () => {
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: null,
      guestMode: true,
      pathname: '/state/kerala',
    }),
    false
  );
  assert.equal(
    shouldRedirectToWelcomeGate({
      loading: false,
      user: { id: 1, username: 'traveler' },
      guestMode: false,
      pathname: '/',
    }),
    false
  );
});

test('readGuestSession and writeGuestSession persist bharatExplore_guest_mode and migrate legacy key', () => {
  const storage = createMemoryStorage();
  assert.equal(readGuestSession(storage), false);

  writeGuestSession(true, storage);
  assert.equal(storage.getItem(GUEST_SESSION_KEY), 'true');
  assert.equal(readGuestSession(storage), true);

  writeGuestSession(false, storage);
  assert.equal(storage.getItem(GUEST_SESSION_KEY), null);
  assert.equal(readGuestSession(storage), false);

  const legacyStorage = createMemoryStorage({ [LEGACY_GUEST_SESSION_KEY]: 'true' });
  assert.equal(readGuestSession(legacyStorage), true);
  assert.equal(legacyStorage.getItem(GUEST_SESSION_KEY), 'true');
});

test('resolvePostAuthRedirect preserves direct URLs with search params and guards /account for guests', () => {
  assert.equal(resolvePostAuthRedirect(null), '/');
  assert.equal(
    resolvePostAuthRedirect({ pathname: '/search', search: '?category=heritage', hash: '' }),
    '/search?category=heritage'
  );
  assert.equal(
    resolvePostAuthRedirect(
      { pathname: '/state/andaman-and-nicobar-islands', search: '', hash: '#top' },
      { isGuest: true }
    ),
    '/state/andaman-and-nicobar-islands#top'
  );
  assert.equal(
    resolvePostAuthRedirect({ pathname: '/account', search: '', hash: '' }, { isGuest: true }),
    '/'
  );
  assert.equal(
    resolvePostAuthRedirect({ pathname: '/account', search: '', hash: '' }, { isGuest: false }),
    '/account'
  );
  assert.equal(resolvePostAuthRedirect({ pathname: '/auth', search: '?mode=register' }), '/');
  assert.equal(isAuthRoutePath('/auth'), true);
  assert.equal(isAuthRoutePath('/state/goa'), false);
});

test('resolvePostLogoutRedirect routes to /auth welcome gate and normalizes /account to /', () => {
  assert.deepEqual(
    resolvePostLogoutRedirect({ pathname: '/favorites', search: '', hash: '' }),
    {
      pathname: '/auth',
      state: { from: '/favorites' },
    }
  );
  assert.deepEqual(
    resolvePostLogoutRedirect({ pathname: '/search', search: '?q=Taj', hash: '' }),
    {
      pathname: '/auth',
      state: { from: '/search?q=Taj' },
    }
  );
  assert.deepEqual(
    resolvePostLogoutRedirect({ pathname: '/account', search: '', hash: '' }),
    {
      pathname: '/auth',
      state: { from: '/' },
    }
  );
});

test('resolvePostAuthRedirect rejects backslashes, ASCII control characters, protocol-relative, and external URLs', () => {
  // Backslash-based open redirect vectors
  assert.equal(resolvePostAuthRedirect('/\\evil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('/\\\\evil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('/state\\evil'), '/');
  assert.equal(resolvePostAuthRedirect('/%5cevil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('/%5Cevil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '/\\evil.example.com', search: '', hash: '' }), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '/search', search: '?q=\\evil', hash: '' }), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '/state/goa', search: '', hash: '#\\evil' }), '/');

  // ASCII control characters (tabs, newlines, carriage returns, null bytes, DEL)
  assert.equal(resolvePostAuthRedirect('/\tevil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('/\r\n//evil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('/state/goa\u0000'), '/');
  assert.equal(resolvePostAuthRedirect('/state/goa\u007F'), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '/state/\tgoa', search: '', hash: '' }), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '/search', search: '?q=taj\r\n', hash: '' }), '/');

  // Protocol-relative and external schemes
  assert.equal(resolvePostAuthRedirect('//evil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('https://evil.example.com'), '/');
  assert.equal(resolvePostAuthRedirect('javascript:alert(1)'), '/');
  assert.equal(resolvePostAuthRedirect('/javascript:alert(1)'), '/');
  assert.equal(resolvePostAuthRedirect({ pathname: '//evil.example.com', search: '', hash: '' }), '/');
  assert.equal(isSafeInternalPath('/\\evil.example.com'), false);

  // Valid internal routes continue working normally
  assert.equal(isSafeInternalPath('/state/rajasthan'), true);
  assert.equal(resolvePostAuthRedirect('/state/rajasthan?limit=10#highlights'), '/state/rajasthan?limit=10#highlights');
  assert.equal(
    resolvePostAuthRedirect({ pathname: '/destination/taj-mahal', search: '?from=state', hash: '#overview' }),
    '/destination/taj-mahal?from=state#overview'
  );
});


