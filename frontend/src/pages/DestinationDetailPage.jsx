import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import PhotoGallery from '../components/PhotoGallery';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorMessage from '../components/ErrorMessage';
import AddToTripModal from '../components/AddToTripModal';
import { useDestinationDetail } from '../hooks/useDestinations';
import { useFavorites } from '../context/FavoritesContext';
import { useTrips } from '../context/TripsContext';
import {
  formatCssBackgroundUrl,
  describeVerificationRecord,
  FALLBACK_DESTINATION_IMAGE,
} from '../utils/imageUrl';
import {
  MapPin, Calendar, Clock, Ticket, ExternalLink,
  ShieldCheck, AlertTriangle, Lightbulb, Info, BookOpen, Heart, FolderPlus
} from 'lucide-react';

export default function DestinationDetailPage() {
  const { id, slug } = useParams();
  const { destination, loading, error } = useDestinationDetail(slug || id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getTripsContainingDestination } = useTrips();
  const [tripModalOpen, setTripModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <ErrorMessage message={error || 'Destination not found'} />
      </div>
    );
  }

  const ranking = destination.rankingInfo;
  const verificationMeta = describeVerificationRecord(destination);
  const liked = isFavorite(destination.id);
  const matchingTrips = getTripsContainingDestination(destination.id);
  const inTripCount = matchingTrips.length;

  return (
    <div>
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="page-hero" style={{ minHeight: '460px' }} aria-label={`${destination.name} — hero`}>
        <div
          key={destination.id || destination.slug}
          className="page-hero-bg"
          style={{
            backgroundImage: formatCssBackgroundUrl(
              destination.coverImageUrl,
              1280,
              FALLBACK_DESTINATION_IMAGE
            ),
          }}
          aria-hidden="true"
        />
        <div className="page-hero-overlay" aria-hidden="true" />

        <div className="page-hero-content container">
          <Breadcrumbs
            items={[
              { label: destination.stateName, link: `/state/${destination.stateSlug}` },
              { label: destination.name }
            ]}
          />

          {/* Badges */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {destination.rankPosition && (
              <span style={{
                background: 'var(--gradient-accent)',
                color: 'var(--text-inverse)',
                fontWeight: 800,
                fontSize: '0.82rem',
                padding: '0.32rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 14px rgba(45,212,191,0.4)',
              }}>
                #{destination.rankPosition} Ranked in {destination.stateName}
              </span>
            )}
            {destination.category && (
              <span style={{
                background: 'var(--glass-d2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--glass-border-base)',
                color: 'var(--color-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '0.32rem 0.85rem',
                borderRadius: 'var(--radius-md)',
              }}>
                {destination.category}
              </span>
            )}
            <span
              className={`verification-status-pill ${
                verificationMeta.isVerified ? 'verified' : 'unresolved'
              }`}
              title={verificationMeta.statusNote}
            >
              {verificationMeta.isVerified ? (
                <ShieldCheck size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <span>{verificationMeta.badgeLabel}</span>
            </span>
          </div>

          <h1 className="page-hero-title">{destination.name}</h1>

          <div className="detail-hero-footer">
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.05rem', color: 'rgba(255,255,255,0.78)', margin: 0 }}>
              <MapPin size={16} style={{ color: '#F9A8D4', flexShrink: 0 }} />
              {destination.cityOrDistrict ? `${destination.cityOrDistrict}, ` : ''}
              {destination.stateName}, India
            </p>

            <div className="detail-hero-actions">
              <button
                type="button"
                className={`detail-favorite-btn${liked ? ' active' : ''}`}
                onClick={() => toggleFavorite(destination)}
                aria-pressed={liked}
                aria-label={
                  liked
                    ? `Remove ${destination.name} from favorites`
                    : `Save ${destination.name} to favorites`
                }
              >
                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                <span>{liked ? 'Saved in Favorites' : 'Save to Favorites'}</span>
              </button>

              <button
                type="button"
                className={`detail-trip-btn${inTripCount > 0 ? ' active' : ''}`}
                onClick={() => setTripModalOpen(true)}
                aria-label={`Add ${destination.name} to a trip`}
              >
                <FolderPlus size={18} />
                <span>
                  {inTripCount > 0
                    ? `In ${inTripCount} Trip${inTripCount > 1 ? 's' : ''}`
                    : 'Add to Trip'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {tripModalOpen && (
        <AddToTripModal
          isOpen={tripModalOpen}
          onClose={() => setTripModalOpen(false)}
          destinations={[destination]}
        />
      )}

      {/* ── Content ──────────────────────────────────────── */}
      <div className="container" style={{ margin: '3rem auto 6rem auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

          {/* ── Quick Info Cards ─────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem'
          }}>
            {destination.bestTimeToVisit && (
              <div className="info-card">
                <div className="info-card-icon" style={{ color: 'var(--color-brand)' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <div className="info-card-label">Best Time to Visit</div>
                  <div className="info-card-value">{destination.bestTimeToVisit}</div>
                </div>
              </div>
            )}
            {destination.estimatedVisitDuration && (
              <div className="info-card">
                <div className="info-card-icon" style={{ color: 'var(--color-secondary)' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div className="info-card-label">Suggested Duration</div>
                  <div className="info-card-value">{destination.estimatedVisitDuration}</div>
                </div>
              </div>
            )}
            {destination.openingHours && (
              <div className="info-card">
                <div className="info-card-icon" style={{ color: 'var(--color-accent)' }}>
                  <Info size={22} />
                </div>
                <div>
                  <div className="info-card-label">Opening Hours</div>
                  <div className="info-card-value">{destination.openingHours}</div>
                </div>
              </div>
            )}
            {destination.entryFees && (
              <div className="info-card">
                <div className="info-card-icon" style={{ color: '#2DD4BF' }}>
                  <Ticket size={22} />
                </div>
                <div>
                  <div className="info-card-label">Entry Fees</div>
                  <div className="info-card-value">{destination.entryFees}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Official Ranking & Verification Status ───── */}
          {ranking && (
            <div
              className={`verification-box ${
                verificationMeta.isVerified ? 'verified' : 'unresolved'
              }`}
              role="note"
              aria-label="Tourism record verification status"
            >
              {verificationMeta.isVerified ? (
                <ShieldCheck size={26} className="verification-icon" />
              ) : (
                <AlertTriangle size={26} className="verification-icon unresolved" />
              )}
              <div style={{ flex: 1 }}>
                <div className="verification-title">
                  <span>{verificationMeta.heading}</span>
                  <span
                    className={`verification-status-pill ${
                      verificationMeta.isVerified ? 'verified' : 'unresolved'
                    }`}
                  >
                    {verificationMeta.statusCode}
                  </span>
                </div>
                <div className="verification-text">
                  Rank&nbsp;#{ranking.rankPosition}
                  {ranking.visitorCount && (
                    <> · Annual Visitor Figure: <strong style={{ color: 'var(--text-primary)' }}>
                      {ranking.visitorCount.toLocaleString()}
                    </strong> ({ranking.visitorCountType})</>
                  )}
                  <br />
                  <strong>Source Organization:</strong> {ranking.sourceOrganization} —&nbsp;
                  <em>{ranking.sourceTitle}</em>
                  {verificationMeta.sourceUrl && verificationMeta.sourceLinkLabel && (
                    <> [{' '}
                      <a
                        href={verificationMeta.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {verificationMeta.sourceLinkLabel} <ExternalLink size={11} />
                      </a>]
                    </>
                  )}
                  <div className="verification-status-note">
                    {verificationMeta.statusNote}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Overview & Descriptions ───────────────────── */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} /> Overview &amp; Highlights
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: '1.72', marginBottom: '1.5rem' }}>
              {destination.fullDescription || destination.shortDescription}
            </p>

            {destination.historicalSignificance && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="divider-text">Historical &amp; Cultural Significance</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                  {destination.historicalSignificance}
                </p>
              </div>
            )}

            {destination.mainAttractions && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="divider-text">Main Attractions</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                  {destination.mainAttractions}
                </p>
              </div>
            )}

            {destination.travelTips && (
              <div className="travel-tips-box" style={{ marginTop: '1.75rem' }}>
                <div className="travel-tips-title">
                  <Lightbulb size={16} />
                  Essential Travel Tips
                </div>
                <p className="travel-tips-text">{destination.travelTips}</p>
              </div>
            )}
          </div>

          {/* ── Photo Gallery ─────────────────────────────── */}
          {destination.photos && destination.photos.length > 0 && (
            <PhotoGallery
              photos={destination.photos}
              verificationStatus={verificationMeta.statusCode}
              photoAttributionNote={verificationMeta.photoAttributionNote}
            />
          )}

          {/* ── Coordinates ──────────────────────────────── */}
          {destination.latitude && destination.longitude && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-secondary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={17} /> Geographic Coordinates
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Latitude:&nbsp;
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{destination.latitude}</strong>
                &nbsp;|&nbsp; Longitude:&nbsp;
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{destination.longitude}</strong>
              </p>
              <a
                href={`https://www.google.com/maps?q=${destination.latitude},${destination.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '1rem', display: 'inline-flex' }}
              >
                <MapPin size={13} /> Open in Google Maps
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
