import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Heart } from 'lucide-react';
import {
  getOptimizedImageUrl,
  applyImageFallback,
  FALLBACK_DESTINATION_IMAGE,
} from '../utils/imageUrl';
import { useFavorites } from '../context/FavoritesContext';
import '../styles/DestinationAccordion.css';

const HOVER_DELAY_HORIZONTAL_MS = 65;
const HOVER_DELAY_VERTICAL_MS = 110;
const TOUCH_MOUSE_GUARD_MS = 900;
const MOBILE_TRANSITION_LOCK_MS = 720;
const INITIAL_VERTICAL_HYDRATE_COUNT = 4;
const STAGGER_BATCH_SIZE = 2;
const STAGGER_INTERVAL_MS = 180;

export function shouldScheduleAccordionHover({
  isFocusEvent = false,
  pointerType = '',
  lastTouchTimestamp = 0,
  transitionLockUntil = 0,
  now = Date.now(),
  matchMediaFn = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia.bind(window)
    : null,
} = {}) {
  if (isFocusEvent) return false;

  if (pointerType && pointerType !== 'mouse') {
    return false;
  }

  if (lastTouchTimestamp > 0 && now - lastTouchTimestamp < TOUCH_MOUSE_GUARD_MS) {
    return false;
  }

  if (transitionLockUntil > 0 && now < transitionLockUntil) {
    return false;
  }

  if (matchMediaFn) {
    try {
      if (matchMediaFn('(hover: none), (pointer: coarse)').matches) {
        return false;
      }
    } catch {
      // Ignore matchMedia errors in non-standard environments
    }
  }

  return true;
}

const AccordionItem = memo(function AccordionItem({
  dest,
  index,
  isActive,
  isFav,
  shouldLoadImage,
  eagerLoad,
  onItemPointerEnter,
  onItemPointerDown,
  onItemTouchStart,
  onItemMouseEnter,
  onItemMouseLeave,
  onItemActivate,
  onItemKeyDown,
  onExploreClick,
  onToggleFavorite,
  setItemRef,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const optimizedSrc = getOptimizedImageUrl(dest.coverImageUrl, 800);

  useEffect(() => {
    setImgLoaded(false);
  }, [optimizedSrc]);

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
  }, []);

  const handleImgError = useCallback((e) => {
    applyImageFallback(e, FALLBACK_DESTINATION_IMAGE);
    setImgLoaded(true);
  }, []);

  return (
    <div
      ref={(el) => setItemRef(index, el)}
      className={`accordion-item ${isActive ? 'active' : ''}`}
      onPointerEnter={(e) => onItemPointerEnter(index, e)}
      onPointerDown={(e) => onItemPointerDown(index, e)}
      onTouchStart={() => onItemTouchStart(index)}
      onMouseEnter={(e) => onItemMouseEnter(index, false, e)}
      onMouseLeave={onItemMouseLeave}
      onClick={() => onItemActivate(index)}
      onFocus={() => onItemMouseEnter(index, true)}
      onKeyDown={(e) => onItemKeyDown(e, index, dest.id, isActive)}
      tabIndex={0}
      role="listitem"
      aria-expanded={isActive}
      aria-label={`${dest.name}, ${dest.stateName}`}
    >
      {shouldLoadImage && (
        <img
          src={optimizedSrc}
          alt={`Photograph of ${dest.name}`}
          className={`accordion-bg ${imgLoaded ? 'is-loaded' : ''}`}
          onLoad={handleImgLoad}
          onError={handleImgError}
          loading={eagerLoad ? 'eager' : 'lazy'}
          fetchPriority={eagerLoad ? 'high' : 'auto'}
          decoding="async"
          width="800"
          height="600"
        />
      )}

      {/* Rank badge */}
      <div className="accordion-rank-badge" aria-hidden="true">
        #{dest.rankPosition || index + 1}
      </div>

      {/*Collapsed title hint for vertical strips so items remain identifiable even while images stream in */}
      {!isActive && (
        <div className="accordion-collapsed-label" aria-hidden="true">
          <span className="collapsed-name">{dest.name}</span>
          {dest.cityOrDistrict && (
            <span className="collapsed-city">{dest.cityOrDistrict}</span>
          )}
        </div>
      )}

      {/* Category tag — only rendered when active to avoid 20 simultaneous DOM nodes */}
      {isActive && dest.category && (
        <span className="category-tag accordion-tag-top-right">
          {dest.category}
        </span>
      )}

      <div className="accordion-content">
        <div className="content-text">
          <h2>{dest.name}</h2>
          <p>
            <MapPin size={13} style={{ display: 'inline', marginRight: '4px', flexShrink: 0 }} />
            {dest.cityOrDistrict ? `${dest.cityOrDistrict}, ` : ''}{dest.stateName}
          </p>
        </div>
        <div className="accordion-actions">
          <button
            type="button"
            className={`accordion-fav-btn${isFav ? ' active' : ''}`}
            onClick={(e) => onToggleFavorite(e, dest)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(e, dest);
              }
            }}
            aria-pressed={isFav}
            aria-label={
              isFav
                ? `Remove ${dest.name} from favorites`
                : `Save ${dest.name} to favorites`
            }
            title={isFav ? 'Remove from Favorites' : 'Save to Favorites'}
            tabIndex={isActive ? 0 : -1}
          >
            <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          <button
            className="explore-btn"
            type="button"
            onClick={(e) => onExploreClick(e, dest.id)}
            aria-label={`Explore ${dest.name}`}
            tabIndex={isActive ? 0 : -1}
          >
            <span>Explore</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default function DestinationAccordion({ destinations }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hydratedCount, setHydratedCount] = useState(INITIAL_VERTICAL_HYDRATE_COUNT);
  const [primedIndices, setPrimedIndices] = useState(() => new Set([0, 1, 2, 3]));

  const hoverTimerRef = useRef(null);
  const lastPointerTypeRef = useRef('');
  const lastTouchTimestampRef = useRef(0);
  const transitionLockUntilRef = useRef(0);
  const itemRefs = useRef([]);

  const totalCount = destinations ? destinations.length : 0;
  const isVertical = totalCount > 5;
  const effectiveActiveIndex = activeIndex < totalCount ? activeIndex : 0;

  // Reset progressive hydration & clamp active index when destination list changes
  useEffect(() => {
    if (activeIndex >= totalCount && totalCount > 0) {
      setActiveIndex(0);
    }
  }, [totalCount, activeIndex]);

  useEffect(() => {
    if (!isVertical) {
      setHydratedCount(totalCount);
      return;
    }

    setHydratedCount(Math.min(INITIAL_VERTICAL_HYDRATE_COUNT, totalCount));
    setPrimedIndices(new Set([0, 1, 2, 3]));

    let cancelled = false;
    let timerId = null;

    const scheduleNextBatch = () => {
      timerId = setTimeout(() => {
        if (cancelled) return;
        setHydratedCount((prev) => {
          const next = Math.min(prev + STAGGER_BATCH_SIZE, totalCount);
          if (next < totalCount) {
            scheduleNextBatch();
          }
          return next;
        });
      }, STAGGER_INTERVAL_MS);
    };

    scheduleNextBatch();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isVertical, totalCount, destinations]);

  // Clear pending hover timer on unmount or mobile/desktop breakpoint change
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
      };
    }

    const mql = window.matchMedia('(max-width: 768px)');
    const handleBreakpointChange = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      transitionLockUntilRef.current = 0;
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleBreakpointChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handleBreakpointChange);
    }

    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleBreakpointChange);
      } else if (typeof mql.removeListener === 'function') {
        mql.removeListener(handleBreakpointChange);
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const setItemRef = useCallback((index, el) => {
    itemRefs.current[index] = el;
  }, []);

  const primeIndex = useCallback((index) => {
    setPrimedIndices((prev) => {
      if (prev.has(index) && prev.has(index + 1)) return prev;
      const next = new Set(prev);
      next.add(index);
      if (index > 0) next.add(index - 1);
      next.add(index + 1);
      return next;
    });
  }, []);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleItemPointerEnter = useCallback(
    (index, event) => {
      const pType = event?.pointerType || event?.nativeEvent?.pointerType || '';
      lastPointerTypeRef.current = pType;
      if (pType && pType !== 'mouse') {
        lastTouchTimestampRef.current = Date.now();
        clearHoverTimer();
        primeIndex(index);
      }
    },
    [clearHoverTimer, primeIndex]
  );

  const handleItemPointerDown = useCallback(
    (index, event) => {
      const pType = event?.pointerType || event?.nativeEvent?.pointerType || '';
      lastPointerTypeRef.current = pType;
      if (pType && pType !== 'mouse') {
        lastTouchTimestampRef.current = Date.now();
        clearHoverTimer();
        primeIndex(index);
      }
    },
    [clearHoverTimer, primeIndex]
  );

  const handleItemTouchStart = useCallback(
    (index) => {
      lastPointerTypeRef.current = 'touch';
      lastTouchTimestampRef.current = Date.now();
      clearHoverTimer();
      primeIndex(index);
    },
    [clearHoverTimer, primeIndex]
  );

  const handleItemMouseEnter = useCallback(
    (index, isFocusEvent = false, event = null) => {
      primeIndex(index);
      const pointerType =
        event?.pointerType ||
        event?.nativeEvent?.pointerType ||
        lastPointerTypeRef.current;

      if (
        !shouldScheduleAccordionHover({
          isFocusEvent,
          pointerType,
          lastTouchTimestamp: lastTouchTimestampRef.current,
          transitionLockUntil: transitionLockUntilRef.current,
        })
      ) {
        return;
      }

      clearHoverTimer();
      const delay = isVertical ? HOVER_DELAY_VERTICAL_MS : HOVER_DELAY_HORIZONTAL_MS;
      hoverTimerRef.current = setTimeout(() => {
        setActiveIndex((prev) => (prev === index ? prev : index));
      }, delay);
    },
    [clearHoverTimer, isVertical, primeIndex]
  );

  const handleItemActivate = useCallback(
    (index) => {
      clearHoverTimer();
      primeIndex(index);
      setActiveIndex((prev) => {
        if (prev !== index) {
          const isMobileOrTouch =
            lastPointerTypeRef.current === 'touch' ||
            (typeof window !== 'undefined' &&
              typeof window.matchMedia === 'function' &&
              window.matchMedia('(hover: none), (pointer: coarse), (max-width: 768px)').matches);
          if (isMobileOrTouch) {
            transitionLockUntilRef.current = Date.now() + MOBILE_TRANSITION_LOCK_MS;
          }
          return index;
        }
        return prev;
      });
    },
    [clearHoverTimer, primeIndex]
  );

  const handleExploreClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      navigate(`/destination/${id}`);
    },
    [navigate]
  );

  const handleToggleFavorite = useCallback(
    (e, dest) => {
      e.stopPropagation();
      toggleFavorite(dest);
    },
    [toggleFavorite]
  );

  const handleItemKeyDown = useCallback(
    (e, index, destId, isActive) => {
      if (e.target !== e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clearHoverTimer();
        if (isActive) {
          navigate(`/destination/${destId}`);
        } else {
          primeIndex(index);
          setActiveIndex(index);
        }
        return;
      }

      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowLeft'
      ) {
        e.preventDefault();
        clearHoverTimer();
        const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + delta + totalCount) % totalCount;
        primeIndex(nextIndex);
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
      }
    },
    [clearHoverTimer, navigate, primeIndex, totalCount]
  );

  if (!destinations || destinations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Destinations Match Your Filter</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try clearing search keywords or selecting a different category.</p>
      </div>
    );
  }

  return (
    <div
      className={`destination-accordion ${isVertical ? 'accordion-vertical' : 'accordion-horizontal'}`}
      role="list"
      onMouseLeave={clearHoverTimer}
    >
      {destinations.map((dest, index) => {
        const isActive = effectiveActiveIndex === index;
        const shouldLoadImage =
          !isVertical ||
          index < hydratedCount ||
          Math.abs(index - effectiveActiveIndex) <= 1 ||
          primedIndices.has(index);
        const eagerLoad = index === 0 || isActive;

        return (
          <AccordionItem
            key={dest.id || dest.slug}
            dest={dest}
            index={index}
            isActive={isActive}
            isFav={isFavorite(dest.id)}
            shouldLoadImage={shouldLoadImage}
            eagerLoad={eagerLoad}
            onItemPointerEnter={handleItemPointerEnter}
            onItemPointerDown={handleItemPointerDown}
            onItemTouchStart={handleItemTouchStart}
            onItemMouseEnter={handleItemMouseEnter}
            onItemMouseLeave={clearHoverTimer}
            onItemActivate={handleItemActivate}
            onItemKeyDown={handleItemKeyDown}
            onExploreClick={handleExploreClick}
            onToggleFavorite={handleToggleFavorite}
            setItemRef={setItemRef}
          />
        );
      })}
    </div>
  );
}


