import React from 'react';
import { ShieldCheck, BarChart3, Database, FileText, ExternalLink, Award } from 'lucide-react';

const PILLARS = [
  {
    icon: ShieldCheck,
    color: 'var(--color-accent)',
    title: 'Verified Ranking Integrity',
    text: '703 of our 720 destination rankings are verified against official publications from the Ministry of Tourism (GoI), the Archaeological Survey of India (ASI), and State Tourism departments. The remaining 17 records are transparently badged as UNRESOLVED regional estimates.',
  },
  {
    icon: BarChart3,
    color: 'var(--color-brand)',
    title: 'Reporting Year Standards',
    text: 'Rankings reflect the latest complete reporting cycle (2024 / 2025). Domestic visitor counts, foreign tourist arrivals, and ASI monument ticket counts are stored with explicit data-type and verification metadata.',
  },
  {
    icon: Database,
    color: 'var(--color-secondary)',
    title: 'Complete Geographic Coverage',
    text: 'BharatExplore covers all 36 administrative units of India — all 28 States and all 8 Union Territories — with top 20 ranked destinations for each unit, totalling 720 ranked places nationwide.',
  },
  {
    icon: FileText,
    color: '#34D399',
    title: 'Transparent Methodology',
    text: 'Each destination page displays its verification status (VERIFIED or UNRESOLVED), source organization, document title, reporting year, and an accurately labeled link to the official tourism portal or Wikimedia Commons media source.',
  },
];

const SOURCES = [
  { org: 'Ministry of Tourism, Government of India', doc: 'Annual India Tourism Statistics Digest', url: 'https://tourism.gov.in' },
  { org: 'Archaeological Survey of India (ASI)', doc: 'Ticketed Monument Annual Footfall Census', url: 'https://asi.nic.in' },
  { org: 'Andhra Pradesh Tourism', doc: 'APTDC Official Footfall Reports', url: 'https://aptourism.gov.in' },
  { org: 'Himachal Pradesh Tourism', doc: 'HPTDC Annual Tourism Statistics', url: 'https://himachaltourism.gov.in' },
  { org: 'Maharashtra Tourism', doc: 'MTDC Visitor Statistics', url: 'https://maharashtratourism.gov.in' },
  { org: 'Kerala Tourism', doc: 'Official Visitor Footfall Reports', url: 'https://keralatourism.org' },
  { org: 'West Bengal Tourism', doc: 'WBTDCL Annual Tourism Data', url: 'https://wbtourism.gov.in' },
];

export default function AboutPage() {
  return (
    <div className="container" style={{ margin: '3.5rem auto 6rem auto', maxWidth: '960px' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <p className="section-eyebrow">Our Mission &amp; Methodology</p>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.15 }}>
          About BharatExplore &amp;<br />Statistical Methodology
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '720px' }}>
          BharatExplore is built as an authoritative discovery platform providing accurate,
          evidence-backed destination rankings across all&nbsp;36 administrative units (28&nbsp;States
          and 8&nbsp;Union Territories) of India.
        </p>
      </div>

      {/* ── Pillars ────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}
      >
        {PILLARS.map(({ icon: Icon, color, title, text }) => (
          <div key={title} className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 50, height: 50,
              background: `${color}18`,
              border: `1px solid ${color}30`,
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Icon size={24} style={{ color }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.65rem', color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* ── Official Sources ───────────────────────────── */}
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.45rem', color: 'var(--color-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} /> Official Sources &amp; References
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {SOURCES.map(({ org, doc, url }) => (
            <div key={org} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1rem',
              background: 'var(--glass-d1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border-subtle)',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                  {org}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc}</div>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0 }}
              >
                <ExternalLink size={12} /> Visit
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
