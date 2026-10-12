import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Map, Search, Heart, MapPin, Plane, User as UserIcon, UserPlus, LogOut, Settings, ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { INDIAN_STATES, UNION_TERRITORIES, CATEGORIES, normalizeStateSlug } from '../data/navigation';
import { useAuth, resolvePostLogoutRedirect } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useTrips } from '../context/TripsContext';
import ThemeToggle from './ThemeToggle';
import '../styles/sidebar.css';

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, loading, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const { tripsCount } = useTrips();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for accordions
  const [openMenus, setOpenMenus] = useState({
    explore: false,
    states: false,
    uts: false,
    categories: false,
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const closeMobile = () => setMobileOpen(false);

  const handleSignOut = async () => {
    closeMobile();
    const target = resolvePostLogoutRedirect(location);
    await logout();
    navigate(target.pathname, { replace: true, state: target.state });
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const activeStateSlug = location.pathname.startsWith('/state/')
    ? normalizeStateSlug(location.pathname.slice('/state/'.length))
    : '';
  const activeCategoryParam = location.pathname === '/search'
    ? new URLSearchParams(location.search).get('category') || ''
    : '';
  
  // Helper to check if any child of a submenu is active
  const isExploreActive = location.pathname.startsWith('/state/');
  const isStateSubgroupActive = Boolean(activeStateSlug) && INDIAN_STATES.some(s => s.slug === activeStateSlug);
  const isUtSubgroupActive = Boolean(activeStateSlug) && UNION_TERRITORIES.some(u => u.slug === activeStateSlug);
  const isCategoriesActive = location.pathname.startsWith('/search') && Boolean(activeCategoryParam);

  return (
    <>
      {/* Mobile Overlay - Conditionally rendered to prevent any phantom backdrop-filter bugs */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay visible" 
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        
        {/* Header / Brand */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" onClick={closeMobile}>
            <Compass size={24} color="var(--color-brand)" />
            <span className="brand-text">BharatExplore</span>
          </Link>
          
          {/* Desktop Toggle Button */}
          <button 
            type="button"
            className="collapse-toggle desktop-collapse-toggle" 
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            type="button"
            className="collapse-toggle mobile-close-toggle"
            onClick={closeMobile}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Area */}
        <nav className="sidebar-nav" aria-label="Primary sidebar navigation">
          <ul>
            <li className="nav-item">
              <NavLink to="/" className="nav-button" onClick={closeMobile} end>
                <span className="nav-icon"><Map size={20} /></span>
                <span className="nav-text">Home</span>
              </NavLink>
              <div className="nav-tooltip">Home</div>
            </li>

            {/* Accordion: Explore India */}
            <li className="nav-item">
              <button 
                type="button"
                className={`nav-button ${isExploreActive ? 'active' : ''}`}
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                  toggleMenu('explore');
                }}
                aria-expanded={openMenus.explore && !collapsed}
              >
                <span className="nav-icon"><Search size={20} /></span>
                <span className="nav-text">Explore India</span>
                <ChevronDown size={16} className="nav-chevron" style={{ marginLeft: 'auto' }} />
              </button>
              <div className="nav-tooltip">Explore India</div>
              
              <div className={`submenu-wrapper ${openMenus.explore && !collapsed ? 'open' : ''}`}>
                <div className="submenu-inner">
                  <ul className="submenu-list">

                    {/* ── States sub-accordion ── */}
                    <li>
                      <button
                        type="button"
                        className={`submenu-group-btn ${isStateSubgroupActive ? 'active' : ''}`}
                        onClick={() => setOpenMenus(prev => ({ ...prev, states: !prev.states }))}
                        aria-expanded={openMenus.states}
                      >
                        <span>States (28)</span>
                        <ChevronDown size={13} style={{ transform: openMenus.states ? 'rotate(-180deg)' : 'none', transition: 'transform 0.25s' }} />
                      </button>
                      <div className={`submenu-wrapper ${openMenus.states ? 'open' : ''}`}>
                        <div className="submenu-inner">
                          <ul className="submenu-list submenu-list-nested">
                            {INDIAN_STATES.map(state => (
                              <li key={state.slug}>
                                <NavLink
                                  to={`/state/${state.slug}`}
                                  className={({ isActive }) => `submenu-link${isActive || activeStateSlug === state.slug ? ' active' : ''}`}
                                  onClick={closeMobile}
                                >
                                  {state.name}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>

                    {/* ── Union Territories sub-accordion ── */}
                    <li style={{ marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className={`submenu-group-btn ${isUtSubgroupActive ? 'active' : ''}`}
                        onClick={() => setOpenMenus(prev => ({ ...prev, uts: !prev.uts }))}
                        aria-expanded={openMenus.uts}
                      >
                        <span>Union Territories (8)</span>
                        <ChevronDown size={13} style={{ transform: openMenus.uts ? 'rotate(-180deg)' : 'none', transition: 'transform 0.25s' }} />
                      </button>
                      <div className={`submenu-wrapper ${openMenus.uts ? 'open' : ''}`}>
                        <div className="submenu-inner">
                          <ul className="submenu-list submenu-list-nested">
                            {UNION_TERRITORIES.map(ut => (
                              <li key={ut.slug}>
                                <NavLink
                                  to={`/state/${ut.slug}`}
                                  className={({ isActive }) => `submenu-link${isActive || activeStateSlug === ut.slug ? ' active' : ''}`}
                                  onClick={closeMobile}
                                >
                                  {ut.name}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>

                  </ul>
                </div>
              </div>
            </li>

            {/* Accordion: Categories */}
            <li className="nav-item">
              <button 
                type="button"
                className={`nav-button ${isCategoriesActive ? 'active' : ''}`}
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                  toggleMenu('categories');
                }}
                aria-expanded={openMenus.categories && !collapsed}
              >
                <span className="nav-icon"><MapPin size={20} /></span>
                <span className="nav-text">Categories</span>
                <ChevronDown size={16} className="nav-chevron" style={{ marginLeft: 'auto' }} />
              </button>
              <div className="nav-tooltip">Categories</div>
              
              <div className={`submenu-wrapper ${openMenus.categories && !collapsed ? 'open' : ''}`}>
                <div className="submenu-inner">
                  <ul className="submenu-list">
                    {CATEGORIES.map(cat => {
                      const isCatSelected = activeCategoryParam.toLowerCase() === cat.slug.toLowerCase();
                      return (
                        <li key={cat.slug}>
                          <Link
                            to={`/search?category=${cat.slug}`}
                            className={`submenu-link${isCatSelected ? ' active' : ''}`}
                            onClick={closeMobile}
                          >
                            {cat.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </li>

            <div className="nav-divider" />

            <li className="nav-item">
              <NavLink to="/favorites" className="nav-button" onClick={closeMobile}>
                <span className="nav-icon"><Heart size={20} /></span>
                <span className="nav-text">Favorites</span>
                {favoritesCount > 0 && (
                  <span className="sidebar-fav-badge" aria-label={`${favoritesCount} saved favorites`}>
                    {favoritesCount}
                  </span>
                )}
              </NavLink>
              <div className="nav-tooltip">
                {favoritesCount > 0 ? `Favorites (${favoritesCount})` : 'Favorites'}
              </div>
            </li>

            <li className="nav-item">
              <NavLink to="/trips" className="nav-button" onClick={closeMobile}>
                <span className="nav-icon"><Map size={20} /></span>
                <span className="nav-text">My Trips</span>
                {tripsCount > 0 && (
                  <span className="sidebar-fav-badge" aria-label={`${tripsCount} saved trips`}>
                    {tripsCount}
                  </span>
                )}
              </NavLink>
              <div className="nav-tooltip">
                {tripsCount > 0 ? `My Trips (${tripsCount})` : 'My Trips'}
              </div>
            </li>

            <li className="nav-item">
              <NavLink to="/ai-planner" className="nav-button" onClick={closeMobile}>
                <span className="nav-icon"><Plane size={20} /></span>
                <span className="nav-text">Trip Planner</span>
              </NavLink>
              <div className="nav-tooltip">Trip Planner</div>
            </li>
          </ul>
        </nav>

        {/* Pinned Footer (Always Visible) */}
        <div className="sidebar-footer">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
            {!loading && user && (
              <>
                <li className="nav-item">
                  <NavLink to="/account" className="nav-button" onClick={closeMobile}>
                    <span className="nav-icon"><UserIcon size={20} /></span>
                    <span className="nav-text">My Account</span>
                  </NavLink>
                  <div className="nav-tooltip">My Account ({user.username})</div>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className="nav-button nav-button-logout"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                  >
                    <span className="nav-icon"><LogOut size={20} /></span>
                    <span className="nav-text">Sign Out</span>
                  </button>
                  <div className="nav-tooltip">Sign Out</div>
                </li>
              </>
            )}
            {!loading && !user && (
              <>
                <li className="nav-item">
                  <Link
                    to="/auth"
                    state={{ from: location, mode: 'login' }}
                    className="nav-button"
                    onClick={closeMobile}
                  >
                    <span className="nav-icon"><UserIcon size={20} /></span>
                    <span className="nav-text">Sign In</span>
                  </Link>
                  <div className="nav-tooltip">Sign In</div>
                </li>
                <li className="nav-item">
                  <Link
                    to="/auth?mode=register"
                    state={{ from: location, mode: 'register' }}
                    className="nav-button"
                    onClick={closeMobile}
                  >
                    <span className="nav-icon"><UserPlus size={20} /></span>
                    <span className="nav-text">Create Account</span>
                  </Link>
                  <div className="nav-tooltip">Create Account</div>
                </li>
              </>
            )}
            <li className="nav-item">
              <NavLink to="/settings" className="nav-button" onClick={closeMobile}>
                <span className="nav-icon"><Settings size={20} /></span>
                <span className="nav-text">Settings</span>
              </NavLink>
              <div className="nav-tooltip">Settings</div>
            </li>
          </ul>

          <div className="nav-divider" style={{ margin: '1rem 0' }} />
          
          <div className="nav-item theme-toggle-container" style={{ padding: '0.5rem 0', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <ThemeToggle />
          </div>
        </div>

      </aside>
    </>
  );
}
