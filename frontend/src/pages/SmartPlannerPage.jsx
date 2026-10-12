import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  Compass,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ShieldCheck,
  Lightbulb,
  Info,
  FolderPlus,
  CheckCircle2,
  ArrowRight,
  Navigation,
  Sliders,
} from 'lucide-react';
import { useStates } from '../hooks/useStates';
import { stateApi } from '../api/stateApi';
import { destinationApi } from '../api/destinationApi';
import { CATEGORIES } from '../data/navigation';
import {
  PACE_OPTIONS,
  SUPPORTED_REGIONS,
  generateSmartItinerary,
  convertPlanToTripPayload,
} from '../utils/smartTripPlanner';
import { useTrips } from '../context/TripsContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorMessage from '../components/ErrorMessage';

export default function SmartPlannerPage() {
  const { states, loading: statesLoading } = useStates();
  const { createTrip } = useTrips();
  const navigate = useNavigate();

  const [scopeType, setScopeType] = useState('state'); // 'state' | 'region'
  const [selectedStateSlug, setSelectedStateSlug] = useState('rajasthan');
  const [selectedRegion, setSelectedRegion] = useState('North');
  const [days, setDays] = useState(3);
  const [pace, setPace] = useState('balanced');
  const [selectedInterests, setSelectedInterests] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [planError, setPlanError] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [customTripTitle, setCustomTripTitle] = useState('');
  const [savedTripInfo, setSavedTripInfo] = useState(null);

  const selectedStateObj = useMemo(
    () => states.find((s) => s.slug === selectedStateSlug) || null,
    [states, selectedStateSlug]
  );

  const toggleInterest = (categoryName) => {
    setSelectedInterests((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setPlanError('');
    setSavedTripInfo(null);
    setGenerating(true);

    try {
      let candidates = [];
      let scopeLabel = '';

      if (scopeType === 'state') {
        if (!selectedStateSlug) {
          setPlanError('Please select a State or Union Territory.');
          setGenerating(false);
          return;
        }
        const stateRes = await stateApi.getStateBySlug(selectedStateSlug);
        if (!stateRes?.success || !stateRes?.data) {
          throw new Error('Could not load destinations for the selected State/UT.');
        }
        scopeLabel = stateRes.data.name || selectedStateSlug;
        candidates = (stateRes.data.destinations || []).map((d) => ({
          ...d,
          stateName: d.stateName || stateRes.data.name,
          stateSlug: d.stateSlug || stateRes.data.slug,
        }));
      } else {
        scopeLabel = `${selectedRegion} India`;
        const regionStates = states.filter(
          (s) =>
            typeof s.region === 'string' &&
            s.region.trim().toLowerCase() === selectedRegion.toLowerCase()
        );
        const regionSlugSet = new Set(regionStates.map((s) => s.slug));

        const allDestRes = await destinationApi.filterDestinations({ sort: 'rank' });
        const allDestinations = Array.isArray(allDestRes?.data) ? allDestRes.data : [];

        candidates = allDestinations.filter((d) => regionSlugSet.has(d.stateSlug));
      }

      if (candidates.length === 0) {
        setPlanError('No verified destinations found for the selected scope.');
        setGenerating(false);
        return;
      }

      // First pass selection to determine which destination IDs need full detail enrichment
      const preliminaryPlan = generateSmartItinerary({
        candidates,
        scopeLabel,
        days,
        pace,
        interests: selectedInterests,
      });

      const selectedIds = [];
      preliminaryPlan.days.forEach((d) => {
        d.stops.forEach((s) => selectedIds.push(s.id));
      });

      // Fetch real detail records in parallel (visit duration, entry fees, opening hours, coordinates, travel tips)
      const detailResults = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const res = await destinationApi.getDestinationById(id);
            return res?.success && res?.data ? res.data : null;
          } catch {
            return null;
          }
        })
      );

      const detailById = new Map();
      detailResults.filter(Boolean).forEach((detail) => {
        detailById.set(String(detail.id), detail);
      });

      const enrichedCandidates = candidates.map((cand) => {
        const full = detailById.get(String(cand.id));
        return full ? { ...cand, ...full } : cand;
      });

      const finalPlan = generateSmartItinerary({
        candidates: enrichedCandidates,
        scopeLabel,
        days,
        pace,
        interests: selectedInterests,
      });

      setGeneratedPlan(finalPlan);
      setCustomTripTitle(finalPlan.title);
    } catch (err) {
      setPlanError(err?.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToTrips = (e) => {
    e.preventDefault();
    if (!generatedPlan) return;

    const payload = convertPlanToTripPayload(generatedPlan, customTripTitle);
    const created = createTrip(payload);
    if (created) {
      setSavedTripInfo({
        id: created.id,
        title: created.title,
      });
    }
  };

  return (
    <div className="container" style={{ margin: '2.5rem auto 6rem auto' }}>
      {/* ── Page Header ── */}
      <div className="favorites-page-header">
        <div>
          <p className="section-eyebrow">Data-Driven Itinerary Builder</p>
          <h1 className="favorites-page-title">Smart Trip Planner</h1>
          <p className="section-subtitle">
            Generate structured day-by-day itineraries grounded in our verified 720-destination
            database, official visitation rankings, and real geographic coordinates.
          </p>
        </div>

        <div className="favorites-session-card">
          <div className="favorites-sync-badge synced">
            <ShieldCheck size={16} />
            <span>Powered by Verified Tourism Records (No Synthetic Data)</span>
          </div>
          <Link to="/trips" className="btn btn-ghost btn-sm">
            <FolderPlus size={15} />
            <span>View My Trips</span>
          </Link>
        </div>
      </div>

      {/* ── Planner Configuration Form ── */}
      <form onSubmit={handleGenerate} className="glass-panel planner-config-panel">
        <div className="planner-form-grid">
          {/* Scope Type */}
          <div className="form-group">
            <label htmlFor="planner-scope-type">Destination Scope</label>
            <select
              id="planner-scope-type"
              className="filter-select"
              style={{ width: '100%', height: '44px' }}
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
            >
              <option value="state">Single State or Union Territory (36)</option>
              <option value="region">Multi-State Region of India (6)</option>
            </select>
          </div>

          {/* State or Region Selector */}
          {scopeType === 'state' ? (
            <div className="form-group">
              <label htmlFor="planner-state-select">Select State / Union Territory</label>
              <select
                id="planner-state-select"
                className="filter-select"
                style={{ width: '100%', height: '44px' }}
                value={selectedStateSlug}
                onChange={(e) => setSelectedStateSlug(e.target.value)}
                disabled={statesLoading}
              >
                {states.map((st) => (
                  <option key={st.slug} value={st.slug}>
                    {st.name} ({st.administrativeType === 'UNION_TERRITORY' ? 'UT' : 'State'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="planner-region-select">Select Region</label>
              <select
                id="planner-region-select"
                className="filter-select"
                style={{ width: '100%', height: '44px' }}
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                {SUPPORTED_REGIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg} India
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Duration (2–7 Days) */}
          <div className="form-group">
            <label htmlFor="planner-days-select">Trip Duration (2–7 Days)</label>
            <select
              id="planner-days-select"
              className="filter-select"
              style={{ width: '100%', height: '44px' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d} Days
                </option>
              ))}
            </select>
          </div>

          {/* Travel Pace */}
          <div className="form-group">
            <label htmlFor="planner-pace-select">Travel Pace</label>
            <select
              id="planner-pace-select"
              className="filter-select"
              style={{ width: '100%', height: '44px' }}
              value={pace}
              onChange={(e) => setPace(e.target.value)}
            >
              {Object.values(PACE_OPTIONS).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.stopsPerDay} stops/day)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interest Categories */}
        <div style={{ marginTop: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={14} style={{ color: 'var(--color-accent)' }} />
              <span>Interest Categories (Optional — leave unselected to include all top-ranked places)</span>
            </span>
            {selectedInterests.length > 0 && (
              <button
                type="button"
                className="filter-reset-btn"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem' }}
                onClick={() => setSelectedInterests([])}
              >
                Clear Categories ({selectedInterests.length})
              </button>
            )}
          </div>

          <div className="category-chips">
            {CATEGORIES.map((cat) => {
              const active = selectedInterests.includes(cat.name);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  className={`category-chip planner-interest-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleInterest(cat.name)}
                  aria-pressed={active}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="planner-submit-bar">
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Target plan: <strong style={{ color: 'var(--text-primary)' }}>{days} days</strong> ·{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {days * (PACE_OPTIONS[pace]?.stopsPerDay || 3)} stops
            </strong>{' '}
            in{' '}
            <strong style={{ color: 'var(--color-accent)' }}>
              {scopeType === 'state'
                ? selectedStateObj?.name || selectedStateSlug
                : `${selectedRegion} India`}
            </strong>
          </div>

          <button type="submit" className="btn btn-primary" disabled={generating}>
            <Compass size={18} />
            <span>{generating ? 'Building Verified Itinerary...' : 'Generate Itinerary'}</span>
          </button>
        </div>
      </form>

      {planError && <ErrorMessage message={planError} />}

      {generating && (
        <div style={{ marginTop: '2rem' }}>
          <LoadingSkeleton count={3} />
        </div>
      )}

      {/* ── Generated Itinerary Result ── */}
      {!generating && generatedPlan && (
        <section style={{ marginTop: '2.5rem' }} aria-label="Generated itinerary">
          {/* Save to My Trips Bar */}
          <div className="glass-panel planner-save-bar">
            <div>
              <p className="section-eyebrow" style={{ marginBottom: '0.2rem' }}>
                Verified {generatedPlan.daysCount}-Day Plan · {generatedPlan.totalStops} Stops
              </p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                {generatedPlan.title}
              </h2>
              {generatedPlan.fallbackRankCount > 0 && generatedPlan.interests.length > 0 && (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Included {generatedPlan.matchedInterestCount} category-matched place
                  {generatedPlan.matchedInterestCount === 1 ? '' : 's'} plus{' '}
                  {generatedPlan.fallbackRankCount} top-ranked attraction
                  {generatedPlan.fallbackRankCount === 1 ? '' : 's'} in {generatedPlan.scopeLabel} to
                  complete all {generatedPlan.daysCount} days.
                </p>
              )}
            </div>

            {savedTripInfo ? (
              <div className="planner-saved-confirm" role="status">
                <CheckCircle2 size={18} style={{ color: 'var(--color-accent)' }} />
                <span>Saved as &ldquo;{savedTripInfo.title}&rdquo;</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/trips')}
                >
                  <span>Open in My Trips</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveToTrips} className="planner-save-form">
                <input
                  type="text"
                  className="form-input"
                  style={{ minWidth: '240px', padding: '0.55rem 0.85rem' }}
                  value={customTripTitle}
                  onChange={(e) => setCustomTripTitle(e.target.value)}
                  aria-label="Custom trip title before saving"
                  placeholder="Trip title..."
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <FolderPlus size={16} />
                  <span>Save to My Trips</span>
                </button>
              </form>
            )}
          </div>

          {/* Day-by-Day Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            {generatedPlan.days.map((day) => (
              <div key={day.dayNumber} className="glass-card trip-day-card">
                <div className="trip-day-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span className="trip-day-badge">Day {day.dayNumber}</span>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {day.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {day.stops.length} {day.stops.length === 1 ? 'stop' : 'stops'}
                  </span>
                </div>

                <div className="trip-stops-list">
                  {day.stops.map((stop, idx) => (
                    <div key={stop.id} className="planner-stop-card">
                      <div className="trip-stop-index" aria-hidden="true">
                        {idx + 1}
                      </div>

                      {stop.coverImageUrl && (
                        <img
                          src={stop.coverImageUrl}
                          alt={stop.name}
                          className="planner-stop-thumb"
                          loading="lazy"
                        />
                      )}

                      <div className="trip-stop-body">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Link to={`/destination/${stop.id}`} className="trip-stop-title-link">
                              {stop.name}
                            </Link>
                            {stop.rankPosition && (
                              <span className="autocomplete-rank-badge">
                                #{stop.rankPosition} in {stop.stateName}
                              </span>
                            )}
                            {stop.category && (
                              <span className="autocomplete-item-pill category">
                                {stop.category}
                              </span>
                            )}
                          </div>

                          {idx > 0 && (
                            <span className="planner-distance-pill">
                              <Navigation size={12} />
                              {stop.distanceFromPrevKm !== null
                                ? `${stop.distanceFromPrevKm} km from previous stop`
                                : 'Coordinates unavailable for distance'}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.45rem 0 0.75rem' }}>
                          {stop.shortDescription}
                        </p>

                        {/* Honest Real Database Metadata Grid */}
                        <div className="planner-meta-grid">
                          <div className="planner-meta-item">
                            <MapPin size={13} style={{ color: 'var(--color-brand)' }} />
                            <span>
                              <strong>Location:</strong>{' '}
                              {stop.cityOrDistrict ? `${stop.cityOrDistrict}, ` : ''}
                              {stop.stateName}
                            </span>
                          </div>

                          <div className="planner-meta-item">
                            <Clock size={13} style={{ color: 'var(--color-secondary)' }} />
                            <span>
                              <strong>Suggested Duration:</strong>{' '}
                              {stop.estimatedVisitDuration || (
                                <em style={{ color: 'var(--text-muted)' }}>
                                  Not listed in official record
                                </em>
                              )}
                            </span>
                          </div>

                          <div className="planner-meta-item">
                            <Ticket size={13} style={{ color: 'var(--color-accent)' }} />
                            <span>
                              <strong>Entry Fee:</strong>{' '}
                              {stop.entryFees || (
                                <em style={{ color: 'var(--text-muted)' }}>
                                  Not listed in official record
                                </em>
                              )}
                            </span>
                          </div>

                          <div className="planner-meta-item">
                            <Info size={13} style={{ color: '#38BDF8' }} />
                            <span>
                              <strong>Opening Hours:</strong>{' '}
                              {stop.openingHours || (
                                <em style={{ color: 'var(--text-muted)' }}>
                                  Not listed in official record
                                </em>
                              )}
                            </span>
                          </div>

                          <div className="planner-meta-item">
                            <Calendar size={13} style={{ color: '#34D399' }} />
                            <span>
                              <strong>Best Season:</strong>{' '}
                              {stop.bestTimeToVisit || (
                                <em style={{ color: 'var(--text-muted)' }}>
                                  Not listed in official record
                                </em>
                              )}
                            </span>
                          </div>

                          <div className="planner-meta-item">
                            <Navigation size={13} style={{ color: '#F59E0B' }} />
                            <span>
                              <strong>Coordinates:</strong>{' '}
                              {stop.hasCoordinates ? (
                                `${Number(stop.latitude).toFixed(4)}, ${Number(
                                  stop.longitude
                                ).toFixed(4)}`
                              ) : (
                                <em style={{ color: 'var(--text-muted)' }}>
                                  Coordinates unavailable
                                </em>
                              )}
                            </span>
                          </div>
                        </div>

                        {stop.travelTips && (
                          <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: 'var(--color-warm)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <Lightbulb size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{stop.travelTips}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
