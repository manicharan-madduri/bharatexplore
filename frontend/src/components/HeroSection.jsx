import React from 'react';
import SearchBar from './SearchBar';
import { Sparkles, ChevronDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="hero-section" aria-label="Hero — Discover India">
      {/* Parallax BG image */}
      <div className="hero-bg" aria-hidden="true" />

      {/* Cinematic gradient overlay */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* Ambient floating orbs */}
      <div className="hero-orb hero-orb-1" aria-hidden="true" />
      <div className="hero-orb hero-orb-2" aria-hidden="true" />
      <div className="hero-orb hero-orb-3" aria-hidden="true" />

      {/* Main content */}
      <div className="hero-content">
        {/* Eyebrow badge */}
        <div className="hero-badge" role="note">
          <Sparkles size={14} />
          <span>Official Tourism Discovery Portal · India</span>
        </div>

        {/* Title */}
        <h1 className="hero-title">
          Discover <em>India</em>,<br />
          One Destination at a Time
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Explore breathtaking landscapes, historic monuments, vibrant cultures, and
          official tourism visitation rankings across India's&nbsp;36&nbsp;States and Union Territories.
        </p>

        {/* Search bar */}
        <div className="hero-search-wrapper" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
          <SearchBar />
        </div>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll-hint" aria-hidden="true">
        <div className="scroll-indicator">
          <div className="scroll-dot" />
        </div>
        <span>Scroll to explore</span>
      </div>
    </section>
  );
}
