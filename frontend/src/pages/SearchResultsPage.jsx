import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DestinationGrid from '../components/DestinationGrid';
import DestinationAccordion from '../components/DestinationAccordion';
import DestinationControls from '../components/DestinationControls';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorMessage from '../components/ErrorMessage';
import SearchBar from '../components/SearchBar';
import { useSearchDestinations } from '../hooks/useDestinations';
import { useStates } from '../hooks/useStates';
import { useSettings } from '../context/ThemeProvider';
import { normalizeStateSlug } from '../data/navigation';
import { Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = [
  'Historical', 'Religious', 'Nature', 'Wildlife',
  'Beach', 'Adventure', 'Cultural', 'Monument',
];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaultViewMode, defaultTopLimit } = useSettings();
  const [viewMode, setViewMode] = useState(defaultViewMode || 'grid');
  const [limit, setLimit] = useState(defaultTopLimit || 15);

  useEffect(() => {
    setViewMode(defaultViewMode || 'grid');
  }, [defaultViewMode]);

  useEffect(() => {
    setLimit(defaultTopLimit || 15);
  }, [defaultTopLimit]);

  const query     = searchParams.get('query')    || '';
  const rawState  = searchParams.get('state')    || '';
  const stateSlug = normalizeStateSlug(rawState);
  const category  = searchParams.get('category') || '';
  const sort      = searchParams.get('sort')      || 'rank';

  const { destinations, loading, error } = useSearchDestinations({ query, state: stateSlug, category, sort });
  const { states } = useStates();
  const selectedStateName = states.find(st => st.slug === stateSlug)?.name || stateSlug.replace(/-/g, ' ');

  const hasFilters = Boolean(query || stateSlug || category || sort !== 'rank');
  const totalMatches = destinations ? destinations.length : 0;
  const effectiveLimit = limit === 'all' ? totalMatches : (Number(limit) || 15);
  const displayedDestinations = destinations ? destinations.slice(0, effectiveLimit) : [];
  const remainingCount = Math.max(0, totalMatches - displayedDestinations.length);
  const accordionDestinations = displayedDestinations.slice(0, 20);

  const set = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    setSearchParams(p);
  };

  return (
    <div className="container" style={{ margin: '2.5rem auto 6rem auto' }}>

      {/* ── Page Header ───────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="section-eyebrow">BharatExplore</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: 'var(--text-primary)', marginBottom: '1.25rem', fontWeight: 800 }}>
          Explore &amp; Search Tourist Places
        </h1>
        <SearchBar initialQuery={query} />
      </div>

      {/* ── Filter Toolbar ────────────────────────────── */}
      <div className="filter-toolbar">
        <div className="filter-label">
          <SlidersHorizontal size={16} />
          <span>Filters</span>
        </div>

        <div className="filter-controls">
          {/* State */}
          <select
            className="filter-select"
            value={stateSlug}
            onChange={e => set('state', e.target.value)}
            aria-label="Filter by state"
          >
            <option value="">All States &amp; UTs</option>
            {states.map(st => (
              <option key={st.slug} value={st.slug}>{st.name}</option>
            ))}
          </select>

          {/* Category */}
          <select
            className="filter-select"
            value={category}
            onChange={e => set('category', e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            {category && !CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase()) && (
              <option value={category}>{category}</option>
            )}
          </select>

          {/* Sort */}
          <select
            className="filter-select"
            value={sort}
            onChange={e => set('sort', e.target.value)}
            aria-label="Sort results"
          >
            <option value="rank">Sort by Verified Rank</option>
            <option value="name">Sort Alphabetically (A–Z)</option>
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() => {
              setSearchParams({});
              setLimit(defaultTopLimit || 15);
            }}
            aria-label="Clear all filters"
          >
            <RotateCcw size={14} />
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Results Header ────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div
          style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
          aria-live="polite"
        >
          <Filter size={14} />
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{displayedDestinations.length}</strong>
            {totalMatches > displayedDestinations.length && (
              <> of <strong style={{ color: 'var(--text-primary)' }}>{totalMatches}</strong></>
            )}{' '}
            matching destination{totalMatches !== 1 ? 's' : ''}
            {query && <> for keyword&nbsp;"<strong style={{ color: 'var(--color-accent)' }}>{query}</strong>"</>}
            {category && <> in category&nbsp;"<strong style={{ color: 'var(--color-brand)' }}>{category}</strong>"</>}
            {stateSlug && <> in&nbsp;<strong style={{ color: 'var(--color-secondary)' }}>{selectedStateName}</strong></>}
          </span>
        </div>

        {totalMatches > 0 && (
          <DestinationControls
            viewMode={viewMode}
            setViewMode={setViewMode}
            limit={limit}
            setLimit={setLimit}
            totalCount={totalMatches}
            showAllOption={true}
          />
        )}
      </div>

      {/* ── Grid / Accordion ────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton count={6} />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : displayedDestinations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No destinations found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <DestinationGrid destinations={displayedDestinations} />
      ) : (
        <>
          {displayedDestinations.length > 20 && (
            <div className="accordion-cap-banner" role="status">
              <span>
                Accordion view displays up to <strong>20</strong> interactive strips at once for readability.
                Switch to Grid view to browse all <strong>{displayedDestinations.length}</strong> shown destinations together.
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setViewMode('grid')}
              >
                Switch to Grid View
              </button>
            </div>
          )}
          <DestinationAccordion destinations={accordionDestinations} />
        </>
      )}

      {/* ── Load More / Show All Pagination Bar ───────── */}
      {!loading && !error && remainingCount > 0 && (
        <div className="search-load-more-bar" role="region" aria-label="Load more search results">
          <p className="search-load-more-text">
            Showing <strong>{displayedDestinations.length}</strong> of <strong>{totalMatches}</strong> matching destinations
            ({remainingCount} more available)
          </p>
          <div className="search-load-more-actions">
            {remainingCount > 20 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setLimit(displayedDestinations.length + 20)}
              >
                Load Next 20
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setLimit('all')}
            >
              Show All {totalMatches} Results
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
