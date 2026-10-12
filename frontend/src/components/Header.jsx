import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Compass, Search, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth, resolvePostLogoutRedirect } from '../context/AuthContext';

export default function Header({ mobileOpen, setMobileOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    setMobileOpen(false);
    const target = resolvePostLogoutRedirect(location);
    await logout();
    navigate(target.pathname, { replace: true, state: target.state });
  };

  return (
    <header className={`site-header mobile-nav-header${scrolled ? ' scrolled' : ''}`}>
      <div className="mobile-header-inner">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={Boolean(mobileOpen)}
        >
          <Menu size={22} />
        </button>

        <Link to="/" className="mobile-brand-link" onClick={() => setMobileOpen(false)}>
          <Compass size={22} color="var(--color-brand)" />
          <span>BharatExplore</span>
        </Link>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/search"
            className="mobile-search-btn"
            aria-label="Search destinations"
            onClick={() => setMobileOpen(false)}
          >
            <Search size={19} />
          </Link>

          <Link
            to={user ? '/account' : '/auth'}
            state={user ? undefined : { from: location }}
            className="mobile-search-btn"
            aria-label={user ? 'My Account' : 'Sign in or create account'}
            title={user ? 'My Account' : 'Sign In / Create Account'}
            onClick={() => setMobileOpen(false)}
          >
            <UserIcon size={19} />
          </Link>

          {user && (
            <button
              type="button"
              className="mobile-search-btn mobile-logout-btn"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

