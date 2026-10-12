import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Settings,
  Sun,
  Moon,
  LayoutGrid,
  List,
  Sliders,
  Sparkles,
  Database,
  Download,
  RotateCcw,
  Trash2,
  User as UserIcon,
  LogIn,
  UserPlus,
  Heart,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useSettings } from '../context/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useTrips } from '../context/TripsContext';
import { VALID_TOP_LIMITS, buildUserDataExportPayload } from '../utils/settingsStorage';

export default function SettingsPage() {
  const location = useLocation();
  const {
    theme,
    defaultViewMode,
    defaultTopLimit,
    reducedMotion,
    setTheme,
    setDefaultViewMode,
    setDefaultTopLimit,
    setReducedMotion,
    resetPreferences,
  } = useSettings();
  const { user } = useAuth();
  const { favorites, favoritesCount, clearFavorites } = useFavorites();
  const { trips, tripsCount, clearTrips } = useTrips();

  const [statusBanner, setStatusBanner] = useState('');
  const [confirmClearData, setConfirmClearData] = useState(false);

  const totalTripStops = trips.reduce(
    (sum, trip) => sum + (Array.isArray(trip?.items) ? trip.items.length : 0),
    0
  );

  const showNotice = (msg) => {
    setStatusBanner(msg);
  };

  const handleExportJson = () => {
    const payload = buildUserDataExportPayload({
      user,
      settings: {
        theme,
        defaultViewMode,
        defaultTopLimit,
        reducedMotion,
      },
      favorites,
      trips,
    });

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const scopeSlug = user?.username
      ? user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : 'guest';

    const link = document.createElement('a');
    link.href = url;
    link.download = `bharatexplore-backup-${scopeSlug}-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotice('Exported your preferences, saved favorites, and itineraries as a JSON backup.');
  };

  const handleResetPreferencesOnly = () => {
    resetPreferences();
    showNotice('Display and browsing preferences have been restored to defaults.');
  };

  const handleConfirmClearLocalData = () => {
    clearFavorites();
    clearTrips();
    resetPreferences();
    setConfirmClearData(false);
    showNotice(
      user
        ? `Cleared local favorites, trips, and reset preferences for @${user.username}.`
        : 'Cleared guest favorites, trips, and restored default preferences.'
    );
  };

  return (
    <div className="container section-padding settings-page">
      {/* Header */}
      <div className="settings-hero">
        <div className="settings-hero-title-group">
          <span className="settings-eyebrow">
            <Settings size={15} /> Application Preferences & Data
          </span>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">
            Customize how BharatExplore displays destinations, rankings, and motion across all 36 States & Union Territories, or manage your saved browser data.
          </p>
        </div>
      </div>

      {statusBanner && (
        <div className="settings-status-banner" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{statusBanner}</span>
          <button
            type="button"
            className="favorites-toast-dismiss"
            onClick={() => setStatusBanner('')}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="settings-grid">
        {/* Appearance & Motion */}
        <section className="settings-card" aria-labelledby="settings-appearance-heading">
          <div className="settings-card-header">
            <h2>
              <Sun size={18} /> <span id="settings-appearance-heading">Appearance & Accessibility</span>
            </h2>
            <p>Control the color theme and animation behavior across the application.</p>
          </div>

          <div className="settings-control-list">
            {/* Theme Selector */}
            <div className="settings-control-row">
              <div className="settings-control-info">
                <label className="settings-control-label">Color Theme</label>
                <span className="settings-control-desc">
                  Switch between dark mode and high-contrast warm ivory light mode.
                </span>
              </div>
              <div className="settings-segmented-group" role="group" aria-label="Color Theme">
                <button
                  type="button"
                  className={`settings-segment-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    setTheme('dark');
                    showNotice('Theme updated to Dark mode.');
                  }}
                  aria-pressed={theme === 'dark'}
                >
                  <Moon size={15} /> Dark
                </button>
                <button
                  type="button"
                  className={`settings-segment-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    setTheme('light');
                    showNotice('Theme updated to Light mode.');
                  }}
                  aria-pressed={theme === 'light'}
                >
                  <Sun size={15} /> Light
                </button>
              </div>
            </div>

            {/* Reduced Motion */}
            <div className="settings-control-row">
              <div className="settings-control-info">
                <label htmlFor="settings-reduced-motion-toggle" className="settings-control-label">
                  Reduced Motion
                </label>
                <span className="settings-control-desc">
                  Minimize hover elevation, accordion transitions, and decorative animations.
                </span>
              </div>
              <div className="settings-toggle-wrapper">
                <button
                  id="settings-reduced-motion-toggle"
                  type="button"
                  role="switch"
                  aria-checked={reducedMotion}
                  className={`settings-switch-btn ${reducedMotion ? 'on' : 'off'}`}
                  onClick={() => {
                    const next = !reducedMotion;
                    setReducedMotion(next);
                    showNotice(
                      next
                        ? 'Reduced motion enabled.'
                        : 'Standard animations restored.'
                    );
                  }}
                >
                  <span className="settings-switch-thumb" />
                  <span className="settings-switch-text">{reducedMotion ? 'Enabled' : 'Off'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Browsing Defaults */}
        <section className="settings-card" aria-labelledby="settings-browsing-heading">
          <div className="settings-card-header">
            <h2>
              <Sliders size={18} /> <span id="settings-browsing-heading">Browsing & Ranking Defaults</span>
            </h2>
            <p>
              Choose the default layout and Top-N destination limit used when opening State pages, Search Results, and Favorites.
            </p>
          </div>

          <div className="settings-control-list">
            {/* Default View Mode */}
            <div className="settings-control-row">
              <div className="settings-control-info">
                <label className="settings-control-label">Default Destination View</label>
                <span className="settings-control-desc">
                  Choose between responsive photo cards (Grid) or expandable horizontal strips (Accordion).
                </span>
              </div>
              <div className="settings-segmented-group" role="group" aria-label="Default Destination View">
                <button
                  type="button"
                  className={`settings-segment-btn ${defaultViewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => {
                    setDefaultViewMode('grid');
                    showNotice('Default destination view set to Grid.');
                  }}
                  aria-pressed={defaultViewMode === 'grid'}
                >
                  <LayoutGrid size={15} /> Grid View
                </button>
                <button
                  type="button"
                  className={`settings-segment-btn ${defaultViewMode === 'accordion' ? 'active' : ''}`}
                  onClick={() => {
                    setDefaultViewMode('accordion');
                    showNotice('Default destination view set to Accordion.');
                  }}
                  aria-pressed={defaultViewMode === 'accordion'}
                >
                  <List size={15} /> Accordion
                </button>
              </div>
            </div>

            {/* Default Top-N Limit */}
            <div className="settings-control-row">
              <div className="settings-control-info">
                <label htmlFor="settings-top-limit-select" className="settings-control-label">
                  Default Top-N Ranking Limit
                </label>
                <span className="settings-control-desc">
                  Each State & Union Territory features 20 ranked destinations. Select how many to show initially.
                </span>
              </div>
              <div className="settings-select-wrapper">
                <select
                  id="settings-top-limit-select"
                  className="settings-select"
                  value={defaultTopLimit}
                  onChange={(e) => {
                    const nextLimit = Number(e.target.value);
                    setDefaultTopLimit(nextLimit);
                    showNotice(`Default ranking limit set to Top ${nextLimit}.`);
                  }}
                >
                  {VALID_TOP_LIMITS.map((num) => (
                    <option key={num} value={num}>
                      Top {num} Destinations {num === 20 ? '(All)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="settings-control-footer">
              <button
                type="button"
                className="btn btn-outline settings-reset-prefs-btn"
                onClick={handleResetPreferencesOnly}
              >
                <RotateCcw size={15} /> Restore Default Preferences
              </button>
            </div>
          </div>
        </section>

        {/* Account & Session Scope */}
        <section className="settings-card" aria-labelledby="settings-account-heading">
          <div className="settings-card-header">
            <h2>
              <UserIcon size={18} /> <span id="settings-account-heading">Account & Session Status</span>
            </h2>
            <p>
              View your current session mode and manage your BharatExplore account credentials.
            </p>
          </div>

          <div className="settings-account-box">
            {user ? (
              <div className="settings-account-authenticated">
                <div className="settings-account-badge-row">
                  <span className="settings-scope-badge authenticated">Signed In</span>
                  <strong>@{user.username}</strong>
                  {user.email && <span className="settings-account-email">({user.email})</span>}
                </div>
                <p className="settings-account-note">
                  Your favorites and trips are stored in your dedicated account namespace (<code>user_{user.id}</code>) and remain isolated from guest sessions.
                </p>
                <div className="settings-account-actions">
                  <Link to="/account" className="btn btn-primary">
                    <UserIcon size={16} /> Manage Account & Security
                  </Link>
                </div>
              </div>
            ) : (
              <div className="settings-account-guest">
                <div className="settings-account-badge-row">
                  <span className="settings-scope-badge guest">Guest Session</span>
                  <strong>Browsing as Guest</strong>
                </div>
                <p className="settings-account-note">
                  Your favorites and trips are saved locally in this browser. Sign in or create an account to automatically merge your guest items into your personal profile.
                </p>
                <div className="settings-account-actions">
                  <Link
                    to="/auth"
                    state={{ from: location, mode: 'login' }}
                    className="btn btn-primary"
                  >
                    <LogIn size={16} /> Sign In
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    state={{ from: location, mode: 'register' }}
                    className="btn btn-outline"
                  >
                    <UserPlus size={16} /> Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Saved Data Summary, Export & Local Reset */}
        <section className="settings-card" aria-labelledby="settings-data-heading">
          <div className="settings-card-header">
            <h2>
              <Database size={18} /> <span id="settings-data-heading">Saved Data & Backup</span>
            </h2>
            <p>
              Inspect your saved favorites and trip itineraries, export a portable JSON backup, or clear local browser data for the current profile.
            </p>
          </div>

          <div className="settings-data-stats">
            <Link to="/favorites" className="settings-stat-box">
              <div className="settings-stat-icon">
                <Heart size={20} />
              </div>
              <div>
                <span className="settings-stat-value">{favoritesCount}</span>
                <span className="settings-stat-label">Saved Favorites</span>
              </div>
            </Link>

            <Link to="/trips" className="settings-stat-box">
              <div className="settings-stat-icon">
                <Briefcase size={20} />
              </div>
              <div>
                <span className="settings-stat-value">{tripsCount}</span>
                <span className="settings-stat-label">Saved Trips</span>
              </div>
            </Link>

            <Link to="/ai-planner" className="settings-stat-box">
              <div className="settings-stat-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="settings-stat-value">{totalTripStops}</span>
                <span className="settings-stat-label">Total Planned Stops</span>
              </div>
            </Link>
          </div>

          <div className="settings-data-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExportJson}
            >
              <Download size={16} /> Export Data as JSON
            </button>

            {!confirmClearData ? (
              <button
                type="button"
                className="btn btn-outline settings-danger-btn"
                onClick={() => setConfirmClearData(true)}
              >
                <Trash2 size={16} /> Clear Local Saved Data
              </button>
            ) : (
              <div
                className="settings-confirm-clear-box"
                role="alertdialog"
                aria-label="Confirm clearing local data"
              >
                <div className="settings-confirm-clear-text">
                  <AlertTriangle size={18} />
                  <span>
                    Clear all {favoritesCount} favorite(s), {tripsCount} trip(s), and reset preferences for{' '}
                    <strong>{user ? `@${user.username}` : 'Guest'}</strong>?
                  </span>
                </div>
                <div className="settings-confirm-clear-buttons">
                  <button
                    type="button"
                    className="btn btn-primary settings-confirm-delete-btn"
                    onClick={handleConfirmClearLocalData}
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmClearData(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
