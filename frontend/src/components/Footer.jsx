import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, ExternalLink, ShieldCheck,
  Map, Search, Info, Github, Globe
} from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="container">
        <div className="footer-grid">

          {/* ── Brand Column ────────────────────────────── */}
          <div>
            <Link to="/" className="brand-logo" style={{ marginBottom: '0.85rem' }}>
              <span className="logo-badge">
                <Compass size={18} />
              </span>
              <span className="logo-text-main">BharatExplore</span>
            </Link>
            <p className="footer-brand-tagline">
              India's premier tourism discovery portal providing verified visitation
              statistics, detailed travel guides, and photo galleries across all 36&nbsp;States
              and Union Territories.
            </p>
          </div>

          {/* ── Quick Links ─────────────────────────────── */}
          <div>
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/"><Map size={13} /> Home Gallery</Link></li>
              <li><Link to="/search"><Search size={13} /> Explore Destinations</Link></li>
              <li><Link to="/search?category=Historical"><span>Historical Monuments</span></Link></li>
              <li><Link to="/search?category=Nature"><span>Nature &amp; Wildlife</span></Link></li>
              <li><Link to="/search?category=Religious"><span>Sacred Pilgrimages</span></Link></li>
              <li><Link to="/search?category=Beach"><span>Beaches &amp; Coastlines</span></Link></li>
              <li><Link to="/about"><Info size={13} /> About &amp; Statistics</Link></li>
            </ul>
          </div>

          {/* ── Official Data Sources ───────────────────── */}
          <div>
            <h4 className="footer-title">Data Sources</h4>
            <ul className="footer-links">
              <li>
                <a href="https://tourism.gov.in" target="_blank" rel="noopener noreferrer">
                  <Globe size={13} /> Ministry of Tourism, GoI
                  <ExternalLink size={10} style={{ opacity: 0.5 }} />
                </a>
              </li>
              <li>
                <a href="https://asi.nic.in" target="_blank" rel="noopener noreferrer">
                  <Globe size={13} /> Archaeological Survey of India
                  <ExternalLink size={10} style={{ opacity: 0.5 }} />
                </a>
              </li>
              <li>
                <a href="https://india.gov.in" target="_blank" rel="noopener noreferrer">
                  <Globe size={13} /> National Portal of India
                  <ExternalLink size={10} style={{ opacity: 0.5 }} />
                </a>
              </li>
              <li>
                <a href="https://aptourism.gov.in" target="_blank" rel="noopener noreferrer">
                  <Globe size={13} /> Andhra Pradesh Tourism
                  <ExternalLink size={10} style={{ opacity: 0.5 }} />
                </a>
              </li>
            </ul>
          </div>

          {/* ── Verification Badge ──────────────────────── */}
          <div>
            <h4 className="footer-title">Verification</h4>
            <div className="footer-badge">
              <div className="footer-badge-title">
                <ShieldCheck size={15} />
                Verified Visitor Statistics
              </div>
              <p className="footer-badge-text">
                Top 20 rankings across all 36 States &amp; UTs (720 places: 703 verified from
                official Ministry of Tourism, ASI &amp; State Tourism reports; 17 transparently
                labeled regional estimates).
              </p>
            </div>
          </div>

        </div>

        {/* ── Footer Bottom ─────────────────────────────── */}
        <div className="footer-bottom">
          <p>
            © {year} BharatExplore Portal. All rights reserved.
            Built with Java Spring Boot, React &amp; MySQL.
          </p>
          <div className="footer-bottom-links">
            <Link to="/about">Methodology</Link>
            <Link to="/search">Explore</Link>
            <a href="https://tourism.gov.in" target="_blank" rel="noopener noreferrer">Official Data</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
