import React from 'react';
import DestinationCard from './DestinationCard';

export default function DestinationGrid({ destinations }) {
  if (!destinations || destinations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Destinations Match Your Filter</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try clearing search keywords or selecting a different category.</p>
      </div>
    );
  }

  return (
    <div className="destination-grid">
      {destinations.map((dest) => (
        <DestinationCard key={dest.id || dest.slug} destination={dest} />
      ))}
    </div>
  );
}
