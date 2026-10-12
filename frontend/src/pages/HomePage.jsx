import React, { useRef, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import StateGrid from '../components/StateGrid';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorMessage from '../components/ErrorMessage';
import { useStates } from '../hooks/useStates';
import {
  Map, Landmark, Palmtree, Mountain, ShieldCheck,
  Waves, Tent, Theater, TrendingUp, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useSettings } from '../context/ThemeProvider';

/* ── Animated counter hook ────────────────────────────── */
function useCountUp(target, duration = 1800, reducedMotion = false) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const suffix = el.dataset.suffix || '';
    const prefersReduced =
      reducedMotion ||
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (prefersReduced) {
      el.textContent = target + suffix;
      return;
    }

    let start = null;
    let rafId = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const pct = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3); // ease-out-cubic
      const value = Math.round(eased * target);
      el.textContent = value + suffix;
      if (pct < 1) rafId = requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        rafId = requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, duration, reducedMotion]);
  return ref;
}

/* ── Stats ────────────────────────────────────────────── */
const STATS = [
  { value: 36,   suffix: '',  label: 'States & Union Territories',    color: 'var(--color-brand)' },
  { value: 720,  suffix: '',  label: 'Ranked Tourist Places (Top 20)', color: 'var(--color-secondary)' },
  { value: 703,  suffix: '',  label: 'Official Govt Verified Records', color: 'var(--color-accent)' },
  { value: 2025, suffix: '',  label: 'Latest Reporting Cycle',         color: '#34D399' },
];

function StatItem({ value, suffix, label, color, reducedMotion }) {
  const ref = useCountUp(value, 1800, reducedMotion);
  return (
    <div className="stat-item">
      <div
        className="stat-number"
        ref={ref}
        data-suffix={suffix}
        style={{ color }}
        aria-label={`${value}${suffix} ${label}`}
      >
        {reducedMotion ? `${value}${suffix}` : `0${suffix}`}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Category chips ───────────────────────────────────── */
const CATEGORIES = [
  { name: 'Historical', icon: Landmark,   color: '#38BDF8' },
  { name: 'Religious',  icon: ShieldCheck, color: '#2DD4BF' },
  { name: 'Nature',     icon: Mountain,    color: '#34D399' },
  { name: 'Beach',      icon: Waves,       color: '#60A5FA' },
  { name: 'Wildlife',   icon: Tent,        color: '#A3E635' },
  { name: 'Cultural',   icon: Theater,     color: '#F472B6' },
  { name: 'Monument',   icon: Globe,       color: '#A78BFA' },
  { name: 'Adventure',  icon: TrendingUp,  color: '#FB923C' },
];

export default function HomePage() {
  const { states, loading, error } = useStates();
  const { reducedMotion } = useSettings();
  const navigate = useNavigate();

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Statistics Band ─────────────────────────────── */}
      <section className="stats-band" aria-label="Platform statistics">
        <div className="container">
          <div className="stats-grid">
            {STATS.map(s => <StatItem key={s.label} {...s} reducedMotion={reducedMotion} />)}
          </div>
        </div>
      </section>

      {/* ── Category Chips ──────────────────────────────── */}
      <section
        className="container"
        style={{ margin: '3.5rem auto 0' }}
        aria-label="Explore popular categories"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-eyebrow">Browse by Type</p>
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
            Popular Categories
          </h2>
        </div>

        <div className="category-chips">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                type="button"
                className="category-chip"
                onClick={() => navigate(`/search?category=${cat.name}`)}
                style={{ '--chip-color': cat.color }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = cat.color;
                  e.currentTarget.style.boxShadow = `0 4px 20px ${cat.color}30, var(--shadow-card)`;
                  e.currentTarget.style.color = cat.color;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.color = '';
                }}
                aria-label={`Browse ${cat.name} destinations`}
              >
                <Icon size={15} style={{ color: cat.color, flexShrink: 0 }} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── All 36 States / UTs Gallery ─────────────────── */}
      <section
        className="container"
        style={{ margin: '3rem auto 6rem auto' }}
        aria-label="All States and Union Territories of India"
      >
        <div className="section-header">
          <div>
            <p className="section-eyebrow">All 36 Administrative Units</p>
            <h2 className="section-title">States &amp; Union Territories</h2>
            <p className="section-subtitle">
              Select any state or Union Territory to view its top&nbsp;20 ranked tourist places,
              backed by official visitor statistics.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={12} type="state" />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        ) : (
          <StateGrid states={states} />
        )}
      </section>
    </div>
  );
}
