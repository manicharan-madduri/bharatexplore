import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  X,
  Compass,
  Tag,
  ArrowRight,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { destinationApi } from '../api/destinationApi';
import { buildAutocompleteModel } from '../utils/searchAutocomplete';
import { applyImageFallback } from '../utils/imageUrl';

// Lightweight session cache for destination autocomplete queries
const destinationQueryCache = new Map();

export default function SearchBar({
  initialQuery = '',
  placeholder = 'Search states, UTs, categories, or tourist places (e.g. Manipur, Taj Mahal)...',
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [destinationResults, setDestinationResults] = useState([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const navigate = useNavigate();
  const rawId = useId();
  const instanceId = rawId.replace(/:/g, '');
  const listboxId = `search-autocomplete-listbox-${instanceId}`;

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const requestSeqRef = useRef(0);

  // Requirement 8: Synchronize input whenever initialQuery prop changes
  useEffect(() => {
    setQuery(initialQuery || '');
  }, [initialQuery]);

  const trimmedQuery = query.trim();

  // Debounced destination search against the live 720-destination API
  useEffect(() => {
    if (!trimmedQuery) {
      requestSeqRef.current += 1;
      setDestinationResults([]);
      setIsLoadingDestinations(false);
      setSearchError(null);
      return;
    }

    const cacheKey = trimmedQuery.toLowerCase();
    if (destinationQueryCache.has(cacheKey)) {
      setDestinationResults(destinationQueryCache.get(cacheKey));
      setIsLoadingDestinations(false);
      setSearchError(null);
      return;
    }

    const currentSeq = ++requestSeqRef.current;
    setIsLoadingDestinations(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await destinationApi.searchDestinations(trimmedQuery);
        if (requestSeqRef.current !== currentSeq) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        destinationQueryCache.set(cacheKey, list);
        setDestinationResults(list);
        setSearchError(null);
      } catch (err) {
        if (requestSeqRef.current !== currentSeq) return;
        setDestinationResults([]);
        setSearchError(err?.message || 'Unable to load destination suggestions right now.');
      } finally {
        if (requestSeqRef.current === currentSeq) {
          setIsLoadingDestinations(false);
        }
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const model = useMemo(
    () => buildAutocompleteModel(trimmedQuery, destinationResults),
    [trimmedQuery, destinationResults]
  );

  const { states, categories, destinations, viewAllOption, flatOptions } = model;
  const showDropdown = Boolean(isOpen && trimmedQuery.length > 0);
  const hasAnyMatches = states.length > 0 || categories.length > 0 || destinations.length > 0;

  // Reset activeIndex when options change
  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmedQuery]);

  // Keep active option visible inside scrollable listbox
  useEffect(() => {
    if (!showDropdown || activeIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `#${CSS.escape(`${listboxId}-opt-${activeIndex}`)}`
    );
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, showDropdown, listboxId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (option) => {
    if (!option?.href) return;
    setIsOpen(false);
    setActiveIndex(-1);
    if (option.type === 'view-all') {
      setQuery(trimmedQuery);
    } else if (option.type === 'destination' || option.type === 'state') {
      setQuery(option.label);
    }
    navigate(option.href);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!trimmedQuery) return;

    if (showDropdown && activeIndex >= 0 && flatOptions[activeIndex]) {
      handleSelectOption(flatOptions[activeIndex]);
      return;
    }

    setIsOpen(false);
    setActiveIndex(-1);
    navigate(`/search?query=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleClear = () => {
    setQuery('');
    setDestinationResults([]);
    setSearchError(null);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!trimmedQuery) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(flatOptions.length > 0 ? 0 : -1);
        return;
      }
      if (flatOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(flatOptions.length > 0 ? flatOptions.length - 1 : -1);
        return;
      }
      if (flatOptions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? flatOptions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      if (showDropdown && activeIndex >= 0 && flatOptions[activeIndex]) {
        e.preventDefault();
        handleSelectOption(flatOptions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const activeOption =
    showDropdown && activeIndex >= 0 && activeIndex < flatOptions.length
      ? flatOptions[activeIndex]
      : null;

  return (
    <div className="search-autocomplete-root" ref={containerRef}>
      <form className="search-container" onSubmit={handleSearch} role="search">
        <div className="search-input-wrapper">
          <MapPin
            size={20}
            className="search-icon"
            style={{ color: 'var(--color-brand)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (trimmedQuery.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-controls={showDropdown ? listboxId : undefined}
            aria-activedescendant={
              activeOption ? `${listboxId}-opt-${activeOption.optionIndex}` : undefined
            }
            aria-label="Search tourist destinations, states, and categories"
            autoComplete="off"
          />
          {query.length > 0 && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClear}
              aria-label="Clear search query"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="search-btn">
          <Search size={18} />
          <span>Search</span>
        </button>
      </form>

      {showDropdown && (
        <div
          id={listboxId}
          ref={listRef}
          className="search-autocomplete-dropdown"
          role="listbox"
          aria-label="Search suggestions"
        >
          {/* ── States & Union Territories ── */}
          {states.length > 0 && (
            <div className="autocomplete-group" role="presentation">
              <div className="autocomplete-group-header" aria-hidden="true">
                <Compass size={13} />
                <span>States &amp; Union Territories</span>
              </div>
              {states.map((opt) => {
                const isSelected = activeIndex === opt.optionIndex;
                return (
                  <div
                    key={opt.id}
                    id={`${listboxId}-opt-${opt.optionIndex}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`autocomplete-item autocomplete-item-state${isSelected ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(opt.optionIndex)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(opt)}
                  >
                    <div className="autocomplete-icon-badge state">
                      <Compass size={16} />
                    </div>
                    <div className="autocomplete-item-body">
                      <div className="autocomplete-item-title">{opt.label}</div>
                      <div className="autocomplete-item-subtitle">{opt.subtitle}</div>
                    </div>
                    <span className="autocomplete-item-pill">{opt.regionType}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Categories & Subcategories ── */}
          {categories.length > 0 && (
            <div className="autocomplete-group" role="presentation">
              <div className="autocomplete-group-header" aria-hidden="true">
                <Tag size={13} />
                <span>Categories</span>
              </div>
              {categories.map((opt) => {
                const isSelected = activeIndex === opt.optionIndex;
                return (
                  <div
                    key={opt.id}
                    id={`${listboxId}-opt-${opt.optionIndex}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`autocomplete-item autocomplete-item-category${isSelected ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(opt.optionIndex)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(opt)}
                  >
                    <div className="autocomplete-icon-badge category">
                      <Tag size={15} />
                    </div>
                    <div className="autocomplete-item-body">
                      <div className="autocomplete-item-title">{opt.label}</div>
                      <div className="autocomplete-item-subtitle">{opt.subtitle}</div>
                    </div>
                    <span className="autocomplete-item-pill category">
                      {opt.isSubcategory ? 'Subcategory' : 'Category'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tourist Destinations ── */}
          {(destinations.length > 0 || isLoadingDestinations || searchError) && (
            <div className="autocomplete-group" role="presentation">
              <div className="autocomplete-group-header" aria-hidden="true">
                <MapPin size={13} />
                <span>Tourist Destinations</span>
                {isLoadingDestinations && (
                  <span className="autocomplete-loading-inline">
                    <Loader2 size={12} className="autocomplete-spin" />
                    Searching...
                  </span>
                )}
              </div>

              {searchError && !isLoadingDestinations && (
                <div className="autocomplete-status autocomplete-error" role="status">
                  <AlertCircle size={15} />
                  <span>{searchError}</span>
                </div>
              )}

              {destinations.map((opt) => {
                const isSelected = activeIndex === opt.optionIndex;
                return (
                  <div
                    key={opt.id}
                    id={`${listboxId}-opt-${opt.optionIndex}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`autocomplete-item autocomplete-item-destination${isSelected ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(opt.optionIndex)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(opt)}
                  >
                    <img
                      src={opt.thumbnailUrl}
                      alt=""
                      className="autocomplete-thumb"
                      loading="lazy"
                      decoding="async"
                      onError={applyImageFallback}
                    />
                    <div className="autocomplete-item-body">
                      <div className="autocomplete-item-title">{opt.label}</div>
                      <div className="autocomplete-item-subtitle">
                        {opt.subtitle}
                        {opt.category ? ` · ${opt.category}` : ''}
                      </div>
                    </div>
                    {opt.rankPosition && (
                      <span className="autocomplete-rank-badge" title={`State Rank #${opt.rankPosition}`}>
                        <Award size={12} />#{opt.rankPosition}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Empty State ── */}
          {!isLoadingDestinations && !searchError && !hasAnyMatches && (
            <div className="autocomplete-status autocomplete-empty" role="status">
              No matching states, categories, or destinations found for &ldquo;{trimmedQuery}&rdquo;.
            </div>
          )}

          {/* ── View All Results Footer Action ── */}
          {viewAllOption && (
            <div
              id={`${listboxId}-opt-${viewAllOption.optionIndex}`}
              role="option"
              aria-selected={activeIndex === viewAllOption.optionIndex}
              className={`autocomplete-item autocomplete-view-all${
                activeIndex === viewAllOption.optionIndex ? ' active' : ''
              }`}
              onMouseEnter={() => setActiveIndex(viewAllOption.optionIndex)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectOption(viewAllOption)}
            >
              <div className="autocomplete-view-all-text">
                <Search size={15} />
                <span>
                  View all results for <strong>&ldquo;{trimmedQuery}&rdquo;</strong>
                </span>
              </div>
              <ArrowRight size={15} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
