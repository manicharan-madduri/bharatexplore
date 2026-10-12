import React from 'react';

export default function LoadingSkeleton({ count = 6, type = 'card' }) {
  const items = Array.from({ length: count });

  if (type === 'state') {
    return (
      <div className="state-grid" aria-busy="true" aria-label="Loading states">
        {items.map((_, i) => (
          <div key={i} className="skeleton-card" style={{ pointerEvents: 'none' }}>
            {/* 1:1 image placeholder */}
            <div
              className="skeleton"
              style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 0 }}
            />
            {/* Text placeholders */}
            <div style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
              <div className="skeleton" style={{ height: 13, width: '65%', margin: '0 auto 6px' }} />
              <div className="skeleton" style={{ height: 10, width: '40%', margin: '0 auto' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="destination-grid" aria-busy="true" aria-label="Loading destinations">
      {items.map((_, i) => (
        <div key={i} className="skeleton-card" style={{ pointerEvents: 'none' }}>
          {/* Image placeholder */}
          <div className="skeleton" style={{ width: '100%', height: 230, borderRadius: 0 }} />
          {/* Card body */}
          <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="skeleton" style={{ height: 18, width: '60%' }} />
            <div className="skeleton" style={{ height: 13, width: '40%' }} />
            <div className="skeleton" style={{ height: 12, width: '90%' }} />
            <div className="skeleton" style={{ height: 12, width: '75%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
