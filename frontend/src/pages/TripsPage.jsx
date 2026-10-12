import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Map,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Calendar,
  MapPin,
  ArrowUp,
  ArrowDown,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Plane,
  Heart,
  Search,
  ExternalLink,
  Clock,
  Ticket,
  FolderPlus,
} from 'lucide-react';
import { useTrips } from '../context/TripsContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { destinationApi } from '../api/destinationApi';

export default function TripsPage() {
  const {
    trips,
    tripsCount,
    activeTripId,
    setActiveTripId,
    createTrip,
    updateTrip,
    deleteTrip,
    addDestination,
    removeDestination,
    assignStopDay,
    moveStop,
    updateStopNotes,
    lastMergedTripsCount,
    dismissTripsMergeNotice,
  } = useTrips();
  const { favorites } = useFavorites();
  const { user } = useAuth();
  const location = useLocation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDaysCount, setNewDaysCount] = useState(3);
  const [newStartDate, setNewStartDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState('');

  // Edit active trip state
  const [editingTripId, setEditingTripId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDaysCount, setEditDaysCount] = useState(3);
  const [editStartDate, setEditStartDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState(null);

  // Quick add destination search within active trip
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [targetAddDay, setTargetAddDay] = useState(1);
  const [statusBanner, setStatusBanner] = useState('');

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || trips[0] || null,
    [trips, activeTripId]
  );

  useEffect(() => {
    if (activeTrip && targetAddDay > activeTrip.daysCount) {
      setTargetAddDay(1);
    }
  }, [activeTrip, targetAddDay]);

  useEffect(() => {
    const trimmed = placeQuery.trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }

    let cancelled = false;
    setPlaceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await destinationApi.searchDestinations(trimmed);
        if (!cancelled && res && Array.isArray(res.data)) {
          setPlaceResults(res.data.slice(0, 8));
        }
      } catch {
        if (!cancelled) setPlaceResults([]);
      } finally {
        if (!cancelled) setPlaceLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placeQuery]);

  const handleCreateTrip = (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newTitle.trim()) {
      setCreateError('Please enter a trip title.');
      return;
    }

    const created = createTrip({
      title: newTitle.trim(),
      daysCount: Number(newDaysCount) || 3,
      startDate: newStartDate,
      description: newDescription.trim(),
      source: 'manual',
    });

    if (created) {
      setNewTitle('');
      setNewDaysCount(3);
      setNewStartDate('');
      setNewDescription('');
      setShowCreateForm(false);
      setStatusBanner(`Created trip "${created.title}".`);
    }
  };

  const startEditingTrip = (trip) => {
    setEditingTripId(trip.id);
    setEditTitle(trip.title);
    setEditDaysCount(trip.daysCount);
    setEditStartDate(trip.startDate || '');
    setEditDescription(trip.description || '');
  };

  const handleSaveTripEdit = (e) => {
    e.preventDefault();
    if (!editingTripId || !editTitle.trim()) return;
    updateTrip(editingTripId, {
      title: editTitle.trim(),
      daysCount: Number(editDaysCount) || 3,
      startDate: editStartDate,
      description: editDescription.trim(),
    });
    setEditingTripId(null);
    setStatusBanner('Trip details updated.');
  };

  const handleQuickAddPlace = (dest) => {
    if (!activeTrip) return;
    const res = addDestination(activeTrip.id, dest, targetAddDay);
    if (res.added) {
      setStatusBanner(`Added "${dest.name}" to Day ${targetAddDay}.`);
    } else if (res.alreadyExists) {
      setStatusBanner(`"${dest.name}" is already in "${activeTrip.title}".`);
    }
  };

  const daysGrouped = useMemo(() => {
    if (!activeTrip) return [];
    const buckets = Array.from({ length: activeTrip.daysCount }, (_, idx) => ({
      dayNumber: idx + 1,
      stops: [],
    }));
    (activeTrip.items || []).forEach((stop) => {
      const d = Math.max(1, Math.min(activeTrip.daysCount, stop.dayNumber || 1));
      buckets[d - 1].stops.push(stop);
    });
    buckets.forEach((b) => b.stops.sort((a, c) => a.orderIndex - c.orderIndex));
    return buckets;
  }, [activeTrip]);

  return (
    <div className="container" style={{ margin: '2.5rem auto 6rem auto' }}>
      {/* ── Page Header ── */}
      <div className="favorites-page-header">
        <div>
          <p className="section-eyebrow">Personal Itineraries</p>
          <h1 className="favorites-page-title">
            My Trips
            {tripsCount > 0 && <span className="favorites-total-pill">{tripsCount}</span>}
          </h1>
          <p className="section-subtitle">
            Build day-by-day travel plans across India, organize stops by day, and save generated itineraries.
          </p>
        </div>

        <div className="favorites-session-card">
          {user ? (
            <div className="favorites-sync-badge synced">
              <UserCheck size={16} />
              <span>
                Saved to account <strong>@{user.username}</strong>
              </span>
            </div>
          ) : (
            <div className="favorites-sync-badge guest">
              <Sparkles size={16} />
              <span>Saved in Guest Mode · </span>
              <Link to="/auth" state={{ from: location }} className="favorites-signin-link">
                Sign in to sync trips
              </Link>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateForm((prev) => !prev)}
            aria-expanded={showCreateForm}
          >
            <Plus size={16} />
            <span>New Trip</span>
          </button>

          <Link to="/ai-planner" className="btn btn-ghost btn-sm">
            <Plane size={15} />
            <span>Smart Planner</span>
          </Link>
        </div>
      </div>

      {/* ── Guest-to-User Merge Banner ── */}
      {lastMergedTripsCount > 0 && (
        <div className="favorites-merge-banner" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>
              Merged <strong>{lastMergedTripsCount}</strong> guest trip
              {lastMergedTripsCount === 1 ? '' : 's'} into your account.
            </span>
          </div>
          <button
            type="button"
            className="favorites-merge-dismiss"
            onClick={dismissTripsMergeNotice}
            aria-label="Dismiss trip merge notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {statusBanner && (
        <div className="favorites-merge-banner" role="status" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={17} />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            className="favorites-merge-dismiss"
            onClick={() => setStatusBanner('')}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Create Trip Drawer / Panel ── */}
      {showCreateForm && (
        <div className="glass-panel trip-create-panel" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Create a New Trip</h2>
            <button
              type="button"
              className="trip-modal-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close create trip form"
            >
              <X size={18} />
            </button>
          </div>

          {createError && (
            <div className="auth-error" role="alert">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateTrip} className="trip-create-grid">
            <div className="form-group">
              <label htmlFor="create-trip-title">Trip Title</label>
              <input
                id="create-trip-title"
                type="text"
                className="form-input"
                placeholder="e.g., Kerala Backwaters & Hills"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="create-trip-days">Number of Days</label>
              <select
                id="create-trip-days"
                className="filter-select"
                style={{ width: '100%', height: '44px' }}
                value={newDaysCount}
                onChange={(e) => setNewDaysCount(Number(e.target.value))}
              >
                {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? 'Day' : 'Days'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="create-trip-date">Start Date (Optional)</label>
              <input
                id="create-trip-date"
                type="date"
                className="form-input"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="create-trip-desc">Trip Notes / Summary (Optional)</label>
              <input
                id="create-trip-desc"
                type="text"
                className="form-input"
                placeholder="Notes on transport, accommodation, or travel goals..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                maxLength={400}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Plus size={16} />
                <span>Create Trip</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Empty State ── */}
      {tripsCount === 0 ? (
        <div className="glass-panel favorites-empty-state">
          <div className="favorites-empty-icon">
            <Map size={36} />
          </div>
          <h2>No trips created yet</h2>
          <p>
            Start a blank multi-day trip to organize your favorite places, or use the data-driven
            Smart Trip Planner to build a ranked itinerary from our 720 verified destinations.
          </p>
          <div className="favorites-empty-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={17} />
              <span>Create First Trip</span>
            </button>
            <Link to="/ai-planner" className="btn btn-ghost">
              <Plane size={17} />
              <span>Generate with Smart Planner</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="trips-workspace-grid">
          {/* ── Left Column: Trips List ── */}
          <aside className="trips-sidebar-list" aria-label="Saved trips list">
            {trips.map((trip) => {
              const isSelected = activeTrip && activeTrip.id === trip.id;
              return (
                <div
                  key={trip.id}
                  className={`glass-card trip-selector-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveTripId(trip.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveTripId(trip.id);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h3 className="trip-selector-title">{trip.title}</h3>
                    {trip.source === 'planner' && (
                      <span className="trip-source-badge">Smart Plan</span>
                    )}
                  </div>
                  <div className="trip-selector-meta">
                    <span>
                      <Calendar size={13} /> {trip.daysCount} {trip.daysCount === 1 ? 'Day' : 'Days'}
                    </span>
                    <span>
                      <MapPin size={13} /> {trip.items.length}{' '}
                      {trip.items.length === 1 ? 'Stop' : 'Stops'}
                    </span>
                  </div>
                  {trip.startDate && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Starts: {trip.startDate}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>

          {/* ── Right Column: Active Trip Detail & Day Organizer ── */}
          {activeTrip && (
            <section className="trips-detail-panel" aria-label={`Itinerary for ${activeTrip.title}`}>
              {/* Active Trip Header Card */}
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                {editingTripId === activeTrip.id ? (
                  <form onSubmit={handleSaveTripEdit} className="trip-create-grid">
                    <div className="form-group">
                      <label htmlFor="edit-trip-title">Trip Title</label>
                      <input
                        id="edit-trip-title"
                        type="text"
                        className="form-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-trip-days">Duration (Days)</label>
                      <select
                        id="edit-trip-days"
                        className="filter-select"
                        style={{ width: '100%', height: '44px' }}
                        value={editDaysCount}
                        onChange={(e) => setEditDaysCount(Number(e.target.value))}
                      >
                        {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d} {d === 1 ? 'Day' : 'Days'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-trip-date">Start Date</label>
                      <input
                        id="edit-trip-date"
                        type="date"
                        className="form-input"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="edit-trip-desc">Description / Notes</label>
                      <input
                        id="edit-trip-desc"
                        type="text"
                        className="form-input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingTripId(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">
                        <Check size={15} /> Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="trip-detail-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {activeTrip.title}
                        </h2>
                        <span className="favorites-total-pill">
                          {activeTrip.daysCount} {activeTrip.daysCount === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>
                      {activeTrip.description && (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.94rem' }}>
                          {activeTrip.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.65rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                        <span>Total Stops: <strong style={{ color: 'var(--text-primary)' }}>{activeTrip.items.length}</strong></span>
                        {activeTrip.startDate && (
                          <span>Start Date: <strong style={{ color: 'var(--text-primary)' }}>{activeTrip.startDate}</strong></span>
                        )}
                        {activeTrip.stateSummary && (
                          <span>Focus: <strong style={{ color: 'var(--color-accent)' }}>{activeTrip.stateSummary}</strong></span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEditingTrip(activeTrip)}
                        aria-label={`Edit ${activeTrip.title}`}
                      >
                        <Edit3 size={14} />
                        <span>Edit Trip</span>
                      </button>

                      {confirmDeleteTripId === activeTrip.id ? (
                        <div className="favorites-confirm-inline" role="alert">
                          <span>Delete trip?</span>
                          <button
                            type="button"
                            className="favorites-confirm-yes"
                            onClick={() => {
                              deleteTrip(activeTrip.id);
                              setConfirmDeleteTripId(null);
                            }}
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            className="favorites-confirm-no"
                            onClick={() => setConfirmDeleteTripId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="favorites-clear-btn"
                          onClick={() => setConfirmDeleteTripId(activeTrip.id)}
                          aria-label={`Delete ${activeTrip.title}`}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Quick Add Destination Bar ── */}
                <div className="trip-quick-add-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                    <label htmlFor="trip-place-search" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FolderPlus size={15} />
                      <span>Add Destination to Trip</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="trip-target-day" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Target Day:
                      </label>
                      <select
                        id="trip-target-day"
                        className="filter-select"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                        value={targetAddDay}
                        onChange={(e) => setTargetAddDay(Number(e.target.value))}
                      >
                        {Array.from({ length: activeTrip.daysCount }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Day {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      id="trip-place-search"
                      type="search"
                      className="form-input"
                      placeholder="Search any of the 720 tourist places (e.g., Taj Mahal, Hampi, Pangong)..."
                      value={placeQuery}
                      onChange={(e) => setPlaceQuery(e.target.value)}
                    />
                  </div>

                  {placeLoading && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Searching verified destinations...
                    </div>
                  )}

                  {placeResults.length > 0 && (
                    <div className="trip-search-results-list" role="listbox" aria-label="Matching destinations to add">
                      {placeResults.map((dest) => {
                        const alreadyInTrip = activeTrip.items.some(
                          (item) => String(item.id) === String(dest.id)
                        );
                        return (
                          <div key={dest.id} className="trip-search-result-item">
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {dest.name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {dest.cityOrDistrict ? `${dest.cityOrDistrict}, ` : ''}
                                {dest.stateName} · {dest.category}
                                {dest.rankPosition ? ` · #${dest.rankPosition}` : ''}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`btn ${alreadyInTrip ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                              disabled={alreadyInTrip}
                              onClick={() => handleQuickAddPlace(dest)}
                            >
                              {alreadyInTrip ? 'Added' : `+ Day ${targetAddDay}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick chips from Favorites if user has saved favorites not yet in trip */}
                  {favorites.length > 0 && placeQuery.trim().length < 2 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Heart size={12} style={{ color: '#FB7185' }} />
                        <span>Quick add from your saved Favorites:</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {favorites.slice(0, 6).map((fav) => {
                          const inTrip = activeTrip.items.some(
                            (i) => String(i.id) === String(fav.id)
                          );
                          return (
                            <button
                              key={fav.id}
                              type="button"
                              className="trip-fav-quick-chip"
                              disabled={inTrip}
                              onClick={() => handleQuickAddPlace(fav)}
                              title={inTrip ? 'Already in this trip' : `Add ${fav.name} to Day ${targetAddDay}`}
                            >
                              <span>{fav.name}</span>
                              <span style={{ color: inTrip ? 'var(--text-muted)' : 'var(--color-accent)', fontWeight: 700 }}>
                                {inTrip ? '✓' : `+D${targetAddDay}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Day-by-Day Buckets ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {daysGrouped.map((dayBucket) => (
                  <div key={dayBucket.dayNumber} className="glass-card trip-day-card">
                    <div className="trip-day-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="trip-day-badge">Day {dayBucket.dayNumber}</span>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {dayBucket.stops.length === 0
                            ? 'No stops assigned yet'
                            : `${dayBucket.stops.length} ${
                                dayBucket.stops.length === 1 ? 'Stop' : 'Stops'
                              } Planned`}
                        </h3>
                      </div>
                    </div>

                    {dayBucket.stops.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '0.5rem 0' }}>
                        Use the search bar above or move a stop from another day to schedule Day{' '}
                        {dayBucket.dayNumber}.
                      </p>
                    ) : (
                      <div className="trip-stops-list">
                        {dayBucket.stops.map((stop, stopIdx) => {
                          const canMoveUp =
                            stopIdx > 0 || dayBucket.dayNumber > 1;
                          const canMoveDown =
                            stopIdx < dayBucket.stops.length - 1 ||
                            dayBucket.dayNumber < activeTrip.daysCount;

                          return (
                            <div key={stop.id} className="trip-stop-row">
                              <div className="trip-stop-index" aria-hidden="true">
                                {stopIdx + 1}
                              </div>

                              {stop.coverImageUrl && (
                                <img
                                  src={stop.coverImageUrl}
                                  alt={stop.name}
                                  className="trip-stop-thumb"
                                  loading="lazy"
                                />
                              )}

                              <div className="trip-stop-body">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <Link
                                    to={`/destination/${stop.id}`}
                                    className="trip-stop-title-link"
                                  >
                                    {stop.name}
                                  </Link>
                                  {stop.rankPosition && (
                                    <span className="autocomplete-rank-badge">
                                      #{stop.rankPosition}
                                    </span>
                                  )}
                                  {stop.category && (
                                    <span className="autocomplete-item-pill category">
                                      {stop.category}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                                  <span>
                                    <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                    {stop.cityOrDistrict ? `${stop.cityOrDistrict}, ` : ''}
                                    {stop.stateName}
                                  </span>
                                  {stop.estimatedVisitDuration && (
                                    <span>
                                      <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                      {stop.estimatedVisitDuration}
                                    </span>
                                  )}
                                  {stop.entryFees && (
                                    <span>
                                      <Ticket size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                      {stop.entryFees}
                                    </span>
                                  )}
                                </div>

                                <div style={{ marginTop: '0.45rem' }}>
                                  <input
                                    type="text"
                                    className="trip-stop-note-input"
                                    placeholder="Add a personal note for this stop..."
                                    aria-label={`Personal note for ${stop.name}`}
                                    value={stop.notes || ''}
                                    onChange={(e) =>
                                      updateStopNotes(activeTrip.id, stop.id, e.target.value)
                                    }
                                  />
                                </div>
                              </div>

                              <div className="trip-stop-controls">
                                <select
                                  className="filter-select"
                                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                                  value={stop.dayNumber}
                                  onChange={(e) =>
                                    assignStopDay(
                                      activeTrip.id,
                                      stop.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  aria-label={`Assign ${stop.name} to day`}
                                >
                                  {Array.from(
                                    { length: activeTrip.daysCount },
                                    (_, i) => i + 1
                                  ).map((d) => (
                                    <option key={d} value={d}>
                                      Day {d}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  className="trip-icon-btn"
                                  disabled={!canMoveUp}
                                  onClick={() => moveStop(activeTrip.id, stop.id, 'up')}
                                  aria-label={`Move ${stop.name} earlier`}
                                  title="Move Up"
                                >
                                  <ArrowUp size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="trip-icon-btn"
                                  disabled={!canMoveDown}
                                  onClick={() => moveStop(activeTrip.id, stop.id, 'down')}
                                  aria-label={`Move ${stop.name} later`}
                                  title="Move Down"
                                >
                                  <ArrowDown size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="trip-icon-btn danger"
                                  onClick={() => removeDestination(activeTrip.id, stop.id)}
                                  aria-label={`Remove ${stop.name} from trip`}
                                  title="Remove Stop"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
