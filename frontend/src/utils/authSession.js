export const GUEST_SESSION_KEY = 'bharatExplore_guest_mode';
export const LEGACY_GUEST_SESSION_KEY = 'bharat_explore_guest_mode';

export const AUTH_ROUTES = ['/auth', '/forgot-password', '/reset-password'];

export function isAuthRoutePath(pathname = '') {
  return AUTH_ROUTES.includes(pathname);
}

/**
 * Reads whether the visitor has chosen "Continue as Guest" in the current browser session.
 * Supports both the canonical `bharatExplore_guest_mode` key and the legacy underscore key.
 */
export function readGuestSession(storage = typeof window !== 'undefined' ? window.sessionStorage : null) {
  if (!storage) return false;
  try {
    const canonical = storage.getItem(GUEST_SESSION_KEY);
    if (canonical === 'true') return true;
    const legacy = storage.getItem(LEGACY_GUEST_SESSION_KEY);
    if (legacy === 'true') {
      storage.setItem(GUEST_SESSION_KEY, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Persists or clears the guest session flag in sessionStorage.
 */
export function writeGuestSession(
  enabled,
  storage = typeof window !== 'undefined' ? window.sessionStorage : null
) {
  if (!storage) return;
  try {
    if (enabled) {
      storage.setItem(GUEST_SESSION_KEY, 'true');
      storage.removeItem(LEGACY_GUEST_SESSION_KEY);
    } else {
      storage.removeItem(GUEST_SESSION_KEY);
      storage.removeItem(LEGACY_GUEST_SESSION_KEY);
    }
  } catch {
    // Ignore storage quota / private mode errors
  }
}

/**
 * Determines whether the visitor should be redirected to the /auth welcome/sign-in gate.
 * - Never redirects while initial session restoration is still loading (unless guestMode is already active).
 * - Never redirects when already on an auth route (/auth, /forgot-password, /reset-password).
 * - Never redirects when an authenticated user or active guest session is present.
 */
export function shouldRedirectToWelcomeGate({ loading, user, guestMode, pathname }) {
  if (isAuthRoutePath(pathname)) return false;
  if (user || guestMode) return false;
  if (loading) return false;
  return true;
}

const ASCII_CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;
const ENCODED_UNSAFE_PATH_REGEX = /%(?:5c|0[0-9a-f]|1[0-9a-f]|7f)/i;
const LEADING_SCHEME_SEGMENT_REGEX = /^\/[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Validates that a candidate redirect path is a safe internal application path.
 * Rejects external URLs, protocol-relative URLs (//), backslashes (\ or %5c),
 * ASCII control characters, and embedded scheme segments (e.g., /javascript:).
 */
export function isSafeInternalPath(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  if (ASCII_CONTROL_CHAR_REGEX.test(candidate) || candidate.includes('\\')) return false;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return false;

  const pathnameOnly = candidate.split('?')[0].split('#')[0];
  if (!pathnameOnly.startsWith('/') || pathnameOnly.startsWith('//')) return false;
  if (ENCODED_UNSAFE_PATH_REGEX.test(pathnameOnly)) return false;
  if (LEADING_SCHEME_SEGMENT_REGEX.test(pathnameOnly)) return false;

  return true;
}

/**
 * Resolves the target URL to navigate to after Sign In, Create Account, or Continue as Guest.
 * Preserves pathname, query parameters (search), and hash from valid internal URLs while
 * rejecting external, protocol-relative, backslash-based, or control-character redirect targets.
 */
export function resolvePostAuthRedirect(fromLocation, { isGuest = false } = {}) {
  if (!fromLocation) return '/';

  if (typeof fromLocation === 'string') {
    if (ASCII_CONTROL_CHAR_REGEX.test(fromLocation) || fromLocation.includes('\\')) {
      return '/';
    }
    const trimmed = fromLocation.trim();
    if (!isSafeInternalPath(trimmed)) return '/';
    const pathnameOnly = trimmed.split('?')[0].split('#')[0];
    if (isAuthRoutePath(pathnameOnly)) return '/';
    if (isGuest && pathnameOnly === '/account') return '/';
    return trimmed;
  }

  if (typeof fromLocation === 'object') {
    const rawPathname = fromLocation.pathname;
    if (typeof rawPathname !== 'string' || !isSafeInternalPath(rawPathname)) {
      return '/';
    }
    const pathnameOnly = rawPathname.split('?')[0].split('#')[0];
    if (isAuthRoutePath(pathnameOnly)) return '/';
    if (isGuest && pathnameOnly === '/account') return '/';

    const search = typeof fromLocation.search === 'string' ? fromLocation.search : '';
    const hash = typeof fromLocation.hash === 'string' ? fromLocation.hash : '';
    if (
      ASCII_CONTROL_CHAR_REGEX.test(search) ||
      ASCII_CONTROL_CHAR_REGEX.test(hash) ||
      search.includes('\\') ||
      hash.includes('\\')
    ) {
      return '/';
    }

    const combined = `${pathnameOnly}${search}${hash}`;
    return isSafeInternalPath(combined) ? combined : '/';
  }

  return '/';
}

/**
 * Resolves the target route and location state when an authenticated user signs out.
 * Always directs the visitor to the `/auth` Welcome / Sign-In Gate while preserving
 * a safe post-login / post-guest return path (normalizing protected `/account` to `/`).
 */
export function resolvePostLogoutRedirect(currentLocation) {
  const safePath = resolvePostAuthRedirect(currentLocation, { isGuest: true });
  return {
    pathname: '/auth',
    state: {
      from: safePath,
    },
  };
}

