import React, { useState, useCallback } from 'react';
import Lightbox from './Lightbox';
import { Camera, Maximize2, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  getOptimizedImageUrl,
  applyImageFallback,
  FALLBACK_DESTINATION_IMAGE,
} from '../utils/imageUrl';

export default function PhotoGallery({
  photos = [],
  verificationStatus = 'VERIFIED',
  photoAttributionNote = '',
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const handleThumbError = useCallback((e) => {
    applyImageFallback(e, FALLBACK_DESTINATION_IMAGE);
  }, []);

  if (!photos || photos.length === 0) return null;

  const isUnresolved = String(verificationStatus).toUpperCase() === 'UNRESOLVED';

  return (
    <div className="photo-gallery" aria-label="Photo gallery">
      <div className="photo-gallery-title" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={18} />
          Destination Photo Gallery
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} — click to enlarge
        </span>
      </div>

      {photoAttributionNote && (
        <div
          className={`photo-attribution-banner ${isUnresolved ? 'unresolved' : 'verified'}`}
          role="note"
        >
          {isUnresolved ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
          <span>{photoAttributionNote}</span>
          {photos[0]?.sourceUrl && (
            <a
              href={photos[0].sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
            >
              Wikimedia Commons File <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      <div className="photo-gallery-grid">
        {photos.map((photo, index) => (
          <button
            key={photo.id || index}
            className="photo-thumb-wrapper"
            onClick={() => setLightboxIndex(index)}
            aria-label={`View photo ${index + 1}: ${photo.altText || `Destination view ${index + 1}`}`}
          >
            <img
              src={getOptimizedImageUrl(photo.imageUrl, 800)}
              alt={photo.altText || `Destination view ${index + 1}`}
              className="photo-thumb"
              onError={handleThumbError}
              loading="lazy"
              decoding="async"
              width="600"
              height="400"
            />
            <div className="photo-expand-hint" aria-hidden="true">
              <Maximize2 size={22} />
            </div>
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => (i === 0 ? photos.length - 1 : i - 1))}
          onNext={() => setLightboxIndex(i => (i === photos.length - 1 ? 0 : i + 1))}
        />
      )}
    </div>
  );
}

