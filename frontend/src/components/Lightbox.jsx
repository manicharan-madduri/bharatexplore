import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getFullResolutionImageUrl,
  applyImageFallback,
  FALLBACK_DESTINATION_IMAGE,
} from '../utils/imageUrl';

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }) {
  const handleImgError = useCallback((e) => {
    applyImageFallback(e, FALLBACK_DESTINATION_IMAGE);
  }, []);

  useEffect(() => {
    if (!photos || photos.length === 0 || currentIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos, currentIndex, onClose, onPrev, onNext]);

  if (!photos || photos.length === 0 || currentIndex === null) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>

        {/* Close Button */}
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          <X size={20} />
        </button>

        {/* Prev / Next */}
        {photos.length > 1 && (
          <>
            <button
              className="lightbox-nav lightbox-prev"
              onClick={onPrev}
              aria-label={`Previous photo (${currentIndex === 0 ? photos.length : currentIndex} of ${photos.length})`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="lightbox-nav lightbox-next"
              onClick={onNext}
              aria-label={`Next photo (${currentIndex === photos.length - 1 ? 1 : currentIndex + 2} of ${photos.length})`}
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Image */}
        <div className="lightbox-img-wrapper">
          <img
            src={getFullResolutionImageUrl(currentPhoto.imageUrl)}
            alt={currentPhoto.altText || `Destination photograph ${currentIndex + 1}`}
            className="lightbox-img"
            onError={handleImgError}
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Caption */}
        {(currentPhoto.altText || photos.length > 1) && (
          <div className="lightbox-caption">
            {currentPhoto.altText && <p>{currentPhoto.altText}</p>}
            {photos.length > 1 && (
              <div className="lightbox-counter">
                Photo {currentIndex + 1} of {photos.length}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
