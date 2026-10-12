import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOptimizedImageUrl,
  applyImageFallback,
  FALLBACK_STATE_IMAGE,
} from '../utils/imageUrl';

const StateCard = memo(function StateCard({ state }) {
  const navigate = useNavigate();
  const optimizedCoverUrl = getOptimizedImageUrl(state.coverImageUrl, 800);

  const handleFallbackImage = useCallback((e) => {
    applyImageFallback(e, FALLBACK_STATE_IMAGE);
  }, []);

  return (
    <div
      className="state-card"
      onClick={() => navigate(`/state/${state.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/state/${state.slug}`);
        }
      }}
    >
      <div className="state-image-wrapper">
        <img
          src={optimizedCoverUrl}
          alt={`Representative cover view of ${state.name}`}
          className="state-image"
          onError={handleFallbackImage}
          loading="lazy"
          decoding="async"
          width="600"
          height="600"
        />
        <span className="state-badge">
          {state.administrativeType === 'UNION_TERRITORY' ? 'UT' : 'State'}
        </span>
      </div>
      <div className="state-card-content">
        <h3 className="state-card-name">{state.name}</h3>
        <p className="state-card-meta">{state.capital ? `Capital: ${state.capital}` : state.region}</p>
      </div>
    </div>
  );
});

export default StateCard;

