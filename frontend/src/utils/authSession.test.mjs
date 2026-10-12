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

test('AuthPage.jsx and auth.css provide bidirectional mobile Sign In / Create Account switching without CSS cascade override bugs', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const authPageSource = fs.readFileSync(path.resolve(currentDir, '../pages/AuthPage.jsx'), 'utf8');
  const authCssSource = fs.readFileSync(path.resolve(currentDir, '../styles/auth.css'), 'utf8');

  // 1. Verify AuthPage.jsx has both top mobile segmented tabs and bottom bidirectional switch prompts
  assert.match(authPageSource, /className="auth-mobile-header"/);
  assert.match(authPageSource, /className="auth-mobile-tabs"\s+role="tablist"/);
  assert.match(authPageSource, /Don&apos;t have an account\?/);
  assert.match(authPageSource, /Already have an account\?/);
  assert.match(authPageSource, /onClick=\{\(\) => switchMode\(true\)\}[\s\S]*?>\s*Create Account\s*<\/button>/);
  assert.match(authPageSource, /onClick=\{\(\) => switchMode\(false\)\}[\s\S]*?>\s*Sign In\s*<\/button>/);

  // 2. Verify desktop hero panel and guest navigation remain intact
  assert.match(authPageSource, /className="auth-hero-panel"/);
  assert.match(authPageSource, /Back to BharatExplore/);
  assert.match(authPageSource, /Continue as Guest/);

  // 3. Verify CSS cascade order: base display: none on .mobile-auth-switch MUST appear BEFORE @media (max-width: 860px)
  const baseHideIdx = authCssSource.indexOf('.auth-mobile-header,\n.mobile-auth-switch {\n  display: none;\n}') !== -1
    ? authCssSource.indexOf('.auth-mobile-header,\n.mobile-auth-switch {\n  display: none;\n}')
    : authCssSource.indexOf('.mobile-auth-switch {\r\n  display: none;\r\n}') !== -1
      ? authCssSource.indexOf('.mobile-auth-switch {\r\n  display: none;\r\n}')
      : authCssSource.search(/\.mobile-auth-switch\s*\{\s*display:\s*none;/);
  const mobileMediaIdx = authCssSource.indexOf('@media (max-width: 860px)');
  const mobileShowIdx = authCssSource.indexOf('.mobile-auth-switch {', mobileMediaIdx);
  const lastDisplayNoneIdx = authCssSource.lastIndexOf('display: none;');

  assert.ok(baseHideIdx !== -1, 'Base desktop display: none rule for .mobile-auth-switch must exist');
  assert.ok(mobileMediaIdx > baseHideIdx, '@media (max-width: 860px) must come AFTER base display: none rule');
  assert.ok(mobileShowIdx > mobileMediaIdx, 'Mobile .mobile-auth-switch display rule must be inside @media (max-width: 860px)');
  assert.ok(
    lastDisplayNoneIdx < mobileShowIdx,
    'No trailing display: none rule may appear after the mobile .mobile-auth-switch rule'
  );

  // 4. Verify smooth vertical grid-stack transition and 1rem mobile input font-size (no min-height: 580px gap)
  assert.doesNotMatch(authCssSource, /min-height:\s*580px/);
  assert.match(authCssSource, /grid-template-columns:\s*100%/);
  assert.match(authCssSource, /transform:\s*translateY\(14px\)\s*!important/);
  assert.match(authCssSource, /transform:\s*translateY\(0\)\s*!important/);
  assert.match(authCssSource, /@media \(max-width: 400px\)/);
});



