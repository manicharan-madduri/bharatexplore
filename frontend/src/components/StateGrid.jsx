import React from 'react';
import StateCard from './StateCard';

export default function StateGrid({ states }) {
  if (!states || states.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
        <p>No States or Union Territories found.</p>
      </div>
    );
  }

  return (
    <div className="state-grid">
      {states.map((state) => (
        <StateCard key={state.id || state.slug} state={state} />
      ))}
    </div>
  );
}
