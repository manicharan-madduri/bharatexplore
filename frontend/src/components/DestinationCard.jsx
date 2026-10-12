import React, { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Heart, FolderPlus } from 'lucide-react';
import {
  getOptimizedImageUrl,
  applyImageFallback,
  FALLBACK_DESTINATION_IMAGE,
} from '../utils/imageUrl';
import { useFavorites } from '../context/FavoritesContext';
import { useTrips } from '../context/TripsContext';
import AddToTripModal from './AddToTripModal';

const DestinationCard = memo(function DestinationCard({ destination }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getTripsContainingDestination } = useTrips();
  const [tripModalOpen, setTripModalOpen] = useState(false);

  const liked = isFavorite(destination.id);
  const matchingTrips = getTripsContainingDestination(destination.id);
  const inTripCount = matchingTrips.length;
  const optimizedCoverUrl = getOptimizedImageUrl(destination.coverImageUrl, 800);

  const handleFallbackImage = useCallback((e) => {
    applyImageFallback(e, FALLBACK_DESTINATION_IMAGE);
  }, []);

  const handleFavoriteClick = useCallback(
    (e) => {
      e.stopPropagation();
      toggleFavorite(destination);
    },
    [destination, toggleFavorite]
  );

  const handleFavoriteKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(destination);
      }
    },
    [destination, toggleFavorite]
  );

  const handleTripClick = useCallback((e) => {
    e.stopPropagation();
    setTripModalOpen(true);
  }, []);

  const handleTripKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setTripModalOpen(true);
    }
  }, []);

  return (
    <>
      <div
        className="destination-card"
        onClick={() => navigate(`/destination/${destination.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/destination/${destination.id}`);
          }
        }}
      >
        <div className="destination-image-wrapper">
          <img
            src={optimizedCoverUrl}
            alt={`Photograph of ${destination.name}`}
            className="destination-image"
            onError={handleFallbackImage}
            loading="lazy"
            decoding="async"
            width="800"
            height="460"
          />
          {destination.rankPosition && (
            <span className="rank-badge">
              #{destination.rankPosition} Ranked
            </span>
          )}
          <button
            type="button"
            className={`card-favorite-btn${liked ? ' active' : ''}`}
            onClick={handleFavoriteClick}
            onKeyDown={handleFavoriteKeyDown}
            aria-pressed={liked}
            aria-label={
              liked
                ? `Remove ${destination.name} from favorites`
                : `Save ${destination.name} to favorites`
            }
            title={liked ? 'Remove from Favorites' : 'Save to Favorites'}
          >
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </button>
          {destination.category && (
            <span className="category-tag">
              {destination.category}
            </span>
          )}
        </div>

        <div className="destination-card-body">
          <h3 className="destination-title">{destination.name}</h3>
          <p className="destination-location">
            <MapPin size={14} style={{ color: 'var(--color-brand)' }} />
            <span>{destination.cityOrDistrict ? `${destination.cityOrDistrict}, ` : ''}{destination.stateName}</span>
          </p>

          <p className="destination-desc">{destination.shortDescription}</p>

          <div className="destination-card-footer">
            <button
              type="button"
              className={`card-add-trip-btn${inTripCount > 0 ? ' active' : ''}`}
              onClick={handleTripClick}
              onKeyDown={handleTripKeyDown}
              aria-label={`Add ${destination.name} to a trip`}
              title={inTripCount > 0 ? `Saved in ${inTripCount} trip(s) — click to add to another` : 'Add to Trip'}
            >
              <FolderPlus size={14} />
              <span>{inTripCount > 0 ? `In ${inTripCount} Trip${inTripCount > 1 ? 's' : ''}` : 'Add to Trip'}</span>
            </button>
            <span className="btn-explore">
              <span>Explore Place</span>
              <ArrowRight size={16} />
            </span>
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
    </>
  );
});

export default DestinationCard;

