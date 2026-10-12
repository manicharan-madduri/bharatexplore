import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  Sparkles,
  Trash2,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  Compass,
  Search,
  UserCheck,
  CheckCircle2,
  X,
  RotateCcw,
  FolderPlus,
} from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/ThemeProvider';
import DestinationGrid from '../components/DestinationGrid';
import DestinationAccordion from '../components/DestinationAccordion';
import AddToTripModal from '../components/AddToTripModal';

export default function FavoritesPage() {
  const {
    favorites,
    favoritesCount,
    clearFavorites,
    lastMergedCount,
    dismissMergeNotice,
  } = useFavorites();
  const { user } = useAuth();
  const { defaultViewMode } = useSettings();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState(defaultViewMode || 'grid');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);

  useEffect(() => {
    setViewMode(defaultViewMode || 'grid');
  }, [defaultViewMode]);

  const availableStates = useMemo(() => {
    const map = new Map();
    favorites.forEach((item) => {
      if (item.stateName) {
        const key = item.stateSlug || item.stateName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { key, name: item.stateName });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [favorites]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    favorites.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = favorites.filter((item) => {
      if (selectedState) {
        const itemStateKey = item.stateSlug || (item.stateName || '').toLowerCase();
        if (itemStateKey !== selectedState) return false;
      }
      if (selectedCategory && item.category !== selectedCategory) {
        return false;
      }
      if (q) {
        const hay = `${item.name || ''} ${item.cityOrDistrict || ''} ${item.stateName || ''} ${
          item.category || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'rank') {
        const rankA = typeof a.rankPosition === 'number' ? a.rankPosition : 999;
        const rankB = typeof b.rankPosition === 'number' ? b.rankPosition : 999;
        return rankA - rankB || (a.name || '').localeCompare(b.name || '');
      }
      return (b.savedAt || 0) - (a.savedAt || 0);
    });
  }, [favorites, searchQuery, selectedState, selectedCategory, sortBy]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedState || selectedCategory || sortBy !== 'recent'
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedState('');
    setSelectedCategory('');
    setSortBy('recent');
  };

  const handleConfirmClear = () => {
    clearFavorites();
    setConfirmingClear(false);
    resetFilters();
  };

  return (
    <div className="container" style={{ margin: '2.5rem auto 6rem auto' }}>
      {/* ── Page Header ── */}
      <div className="favorites-page-header">
        <div>
          <p className="section-eyebrow">Saved Collection</p>
          <h1 className="favorites-page-title">
            My Favorite Places
            {favoritesCount > 0 && (
              <span className="favorites-total-pill">{favoritesCount}</span>
            )}
          </h1>
          <p className="section-subtitle">
            Curate your personal shortlist of verified monuments, heritage sites, and natural wonders across India.
          </p>
        </div>

        <div className="favorites-session-card">
          {user ? (
            <div className="favorites-sync-badge synced">
              <UserCheck size={16} />
              <span>
                Saved to account <strong>@{user.username}</strong>
              </span>
            </div>
          ) : (
            <div className="favorites-sync-badge guest">
              <Sparkles size={16} />
              <span>Saved in Guest Mode · </span>
              <Link
                to="/auth"
                state={{ from: location }}
                className="favorites-signin-link"
              >
                Sign in to sync with your account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Guest-to-User Merge Notice ── */}
      {lastMergedCount > 0 && (
        <div className="favorites-merge-banner" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>
              Merged <strong>{lastMergedCount}</strong> guest favorite
              {lastMergedCount === 1 ? '' : 's'} into your account collection.
            </span>
          </div>
          <button
            type="button"
            className="favorites-merge-dismiss"
            onClick={dismissMergeNotice}
            aria-label="Dismiss merge notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {favoritesCount === 0 ? (
        <div className="glass-panel favorites-empty-state">
          <div className="favorites-empty-icon">
            <Heart size={36} />
          </div>
          <h2>No saved destinations yet</h2>
          <p>
            Click the heart icon on any destination card, accordion item, or place detail page to
            save your favorite attractions here.
          </p>
          <div className="favorites-empty-actions">
            <Link to="/" className="btn btn-primary">
              <Compass size={17} />
              <span>Explore 36 States &amp; UTs</span>
            </Link>
            <Link to="/search" className="btn btn-ghost">
              <Search size={17} />
              <span>Browse All 720 Places</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Filter & View Toolbar ── */}
          <div className="filter-toolbar favorites-toolbar">
            <div className="filter-label">
              <SlidersHorizontal size={16} />
              <span>Filter &amp; Sort</span>
            </div>

            <div className="filter-controls" style={{ flex: 1 }}>
              <input
                type="search"
                className="filter-select favorites-search-input"
                placeholder="Filter saved places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter saved places by keyword"
              />

              <select
                className="filter-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                aria-label="Filter favorites by state"
              >
                <option value="">All Saved States ({availableStates.length})</option>
                {availableStates.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.name}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter favorites by category"
              >
                <option value="">All Saved Categories ({availableCategories.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort favorites"
              >
                <option value="recent">Sort: Recently Saved</option>
                <option value="rank">Sort: Verified State Rank</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>
            </div>

            <div className="favorites-toolbar-actions">
              <div className="destination-controls" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`control-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid size={15} />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  className={`control-btn ${viewMode === 'accordion' ? 'active' : ''}`}
                  onClick={() => setViewMode('accordion')}
                  aria-pressed={viewMode === 'accordion'}
                >
                  <Rows3 size={15} />
                  <span>Accordion</span>
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={resetFilters}
                  aria-label="Reset favorite filters"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}

              {filteredFavorites.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setTripModalOpen(true)}
                  aria-label="Add displayed favorite destinations to a trip"
                >
                  <FolderPlus size={15} />
                  <span>
                    Add {filteredFavorites.length === 1 ? 'Place' : `${filteredFavorites.length} Places`} to Trip
                  </span>
                </button>
              )}

              {!confirmingClear ? (
                <button
                  type="button"
                  className="favorites-clear-btn"
                  onClick={() => setConfirmingClear(true)}
                >
                  <Trash2 size={15} />
                  <span>Clear All</span>
                </button>
              ) : (
                <div className="favorites-confirm-inline" role="alert">
                  <span>Remove all {favoritesCount}?</span>
                  <button
                    type="button"
                    className="favorites-confirm-yes"
                    onClick={handleConfirmClear}
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    className="favorites-confirm-no"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Results Count Summary ── */}
          <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredFavorites.length}</strong>{' '}
            of <strong style={{ color: 'var(--text-primary)' }}>{favoritesCount}</strong> saved
            destination{favoritesCount === 1 ? '' : 's'}
          </div>

          {filteredFavorites.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No saved places match your current filter
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Try clearing the keyword or selecting another state or category.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                <RotateCcw size={14} /> Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <DestinationGrid destinations={filteredFavorites} />
          ) : (
            <DestinationAccordion destinations={filteredFavorites} />
          )}
        </>
      )}

      {tripModalOpen && (
        <AddToTripModal
          isOpen={tripModalOpen}
          onClose={() => setTripModalOpen(false)}
          destinations={filteredFavorites}
          defaultTripTitle="My Saved Favorites Trip"
        />
      )}
    </div>
  );
}
