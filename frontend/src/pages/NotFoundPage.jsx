import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(14,165,233,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Big 404 number */}
        <div className="not-found-number" aria-hidden="true">404</div>

        <MapPinOff
          size={52}
          style={{ color: 'var(--color-brand)', margin: '0 auto 1.25rem', filter: 'drop-shadow(0 0 16px rgba(14,165,233,0.4))' }}
        />

        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
        }}>
          Destination Not Found
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          maxWidth: '480px',
          lineHeight: '1.6',
          marginBottom: '2.5rem',
        }}>
          The page or destination you are searching for does not exist or has been relocated.
          Try searching for something else!
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary btn-lg">
            <ArrowLeft size={18} />
            Return to Homepage
          </Link>
          <Link to="/search" className="btn btn-ghost btn-lg">
            <Search size={18} />
            Search Destinations
          </Link>
        </div>
      </div>
    </div>
  );
}
