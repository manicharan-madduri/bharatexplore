import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import DestinationGrid from '../components/DestinationGrid';
import DestinationAccordion from '../components/DestinationAccordion';
import DestinationControls from '../components/DestinationControls';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorMessage from '../components/ErrorMessage';
import { useStateDetail } from '../hooks/useStates';
import { useSettings } from '../context/ThemeProvider';
import { formatCssBackgroundUrl, FALLBACK_STATE_IMAGE } from '../utils/imageUrl';
import { MapPin, Calendar, Building, Globe, ArrowLeft } from 'lucide-react';

export default function StateDetailPage() {
  const { slug } = useParams();
  const { stateDetail, loading, error } = useStateDetail(slug);
  const { defaultViewMode, defaultTopLimit } = useSettings();
  const [viewMode, setViewMode] = useState(defaultViewMode || 'grid');
  const [limit, setLimit] = useState(defaultTopLimit || 15);

  useEffect(() => {
    setViewMode(defaultViewMode || 'grid');
  }, [defaultViewMode]);

  useEffect(() => {
    setLimit(defaultTopLimit || 15);
  }, [defaultTopLimit]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <LoadingSkeleton count={6} />
      </div>
    );
  }

  if (error || !stateDetail) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <ErrorMessage message={error || 'State not found'} />
      </div>
    );
  }

  const isUT = stateDetail.administrativeType === 'UNION_TERRITORY';
  const totalInState = stateDetail.destinations ? stateDetail.destinations.length : 0;
  const effectiveLimit = limit === 'all' ? totalInState : limit;
  const displayedDestinations = stateDetail.destinations
    ? stateDetail.destinations.slice(0, effectiveLimit)
    : [];

  return (
    <div>
      {/* ── Page Hero Banner ─────────────────────────────── */}
      <div className="page-hero" aria-label={`${stateDetail.name} — hero`}>
        {/* Background image */}
        <div
          key={stateDetail.id || stateDetail.slug}
          className="page-hero-bg"
          style={{
            backgroundImage: formatCssBackgroundUrl(
              stateDetail.coverImageUrl,
              1280,
              FALLBACK_STATE_IMAGE
            ),
          }}
          aria-hidden="true"
        />
        {/* Overlay */}
        <div className="page-hero-overlay" aria-hidden="true" />

        <div className="page-hero-content container">
          <Breadcrumbs items={[{ label: stateDetail.name }]} />

          <span className="page-hero-tag">
            {isUT ? 'Union Territory' : 'State of India'}
          </span>

          <h1 className="page-hero-title">{stateDetail.name}</h1>

          <div className="page-hero-meta">
            {stateDetail.capital && (
              <span className="page-hero-meta-item">
                <Building size={15} style={{ opacity: 0.7 }} />
                <span>Capital: <strong>{stateDetail.capital}</strong></span>
              </span>
            )}
            {stateDetail.region && (
              <span className="page-hero-meta-item">
                <Globe size={15} style={{ opacity: 0.7 }} />
                <span>Region: <strong>{stateDetail.region} India</strong></span>
              </span>
            )}
            {stateDetail.bestTimeToVisit && (
              <span className="page-hero-meta-item">
                <Calendar size={15} style={{ opacity: 0.7 }} />
                <span>Best Time: <strong>{stateDetail.bestTimeToVisit}</strong></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── About Section ────────────────────────────────── */}
      <section className="container" style={{ margin: '3rem auto' }}>
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.45rem', color: 'var(--color-secondary)', marginBottom: '0.85rem' }}>
            About {stateDetail.name}
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: stateDetail.fullDescription ? '1rem' : 0 }}>
            {stateDetail.shortDescription}
          </p>
          {stateDetail.fullDescription && (
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.65' }}>
              {stateDetail.fullDescription}
            </p>
          )}
        </div>
      </section>

      {/* ── Top N Destinations ──────────────────────────── */}
      <section
        className="container"
        style={{ margin: '2rem auto 6rem auto' }}
        aria-label={`Top ${effectiveLimit} tourist places in ${stateDetail.name}`}
      >
        <div className="section-header" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="section-eyebrow">Official Rankings</p>
            <h2 className="section-title">
              Top {effectiveLimit} Tourist Places in {stateDetail.name}
            </h2>
            <p className="section-subtitle">
              Ranked by official Ministry of Tourism and ASI annual visitation records ({totalInState} ranked places in {stateDetail.name}).
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
            <Link to="/" className="section-link">
              <ArrowLeft size={15} />
              All States
            </Link>
            <DestinationControls viewMode={viewMode} setViewMode={setViewMode} limit={limit} setLimit={setLimit} />
          </div>
        </div>

        {viewMode === 'grid' ? (
          <DestinationGrid destinations={displayedDestinations} />
        ) : (
          <DestinationAccordion destinations={displayedDestinations} />
        )}
      </section>
    </div>
  );
}
