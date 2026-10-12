import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, FolderPlus, CheckCircle2, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { useTrips } from '../context/TripsContext';

export default function AddToTripModal({
  isOpen,
  onClose,
  destinations = [],
  defaultTripTitle = '',
}) {
  const { trips, createTrip, addDestination, addDestinationsBatch, setActiveTripId } = useTrips();

  const normalizedList = Array.isArray(destinations) ? destinations.filter(Boolean) : [];
  const isBatch = normalizedList.length > 1;
  const primaryDestination = normalizedList[0] || null;

  const [mode, setMode] = useState(() => (trips.length > 0 ? 'existing' : 'new'));
  const [selectedTripId, setSelectedTripId] = useState(() => trips[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState(isBatch ? 'distribute' : '1');
  const [newTitle, setNewTitle] = useState('');
  const [newDaysCount, setNewDaysCount] = useState(3);
  const [newDescription, setNewDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultFeedback, setResultFeedback] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(trips.length > 0 ? 'existing' : 'new');
    setSelectedTripId((prev) => (trips.some((t) => t.id === prev) ? prev : trips[0]?.id || ''));
    setSelectedDay(normalizedList.length > 1 ? 'distribute' : '1');
    const suggestedName =
      defaultTripTitle ||
      (primaryDestination?.stateName
        ? `${primaryDestination.stateName} Explorer`
        : 'My India Journey');
    setNewTitle(suggestedName);
    setNewDaysCount(3);
    setNewDescription('');
    setErrorMsg('');
    setResultFeedback(null);
  }, [isOpen, trips.length, defaultTripTitle, primaryDestination?.stateName, normalizedList.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || normalizedList.length === 0) return null;

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0] || null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'existing') {
      if (!selectedTrip) {
        setErrorMsg('Please select a trip or create a new one.');
        return;
      }

      if (isBatch) {
        const dayArg = selectedDay === 'distribute' ? 'distribute' : Number(selectedDay) || 1;
        const { addedCount, skippedCount } = addDestinationsBatch(
          selectedTrip.id,
          normalizedList,
          dayArg
        );
        setActiveTripId(selectedTrip.id);
        setResultFeedback({
          tripId: selectedTrip.id,
          tripTitle: selectedTrip.title,
          message:
            addedCount > 0
              ? `Added ${addedCount} destination${addedCount === 1 ? '' : 's'} to "${selectedTrip.title}"${
                  skippedCount > 0 ? ` (${skippedCount} already in trip)` : ''
                }.`
              : `All selected destinations are already in "${selectedTrip.title}".`,
        });
      } else {
        const targetDay = Number(selectedDay) || 1;
        const res = addDestination(selectedTrip.id, primaryDestination, targetDay);
        setActiveTripId(selectedTrip.id);
        setResultFeedback({
          tripId: selectedTrip.id,
          tripTitle: selectedTrip.title,
          message: res.added
            ? `Added "${primaryDestination.name}" to Day ${targetDay} of "${selectedTrip.title}".`
            : `"${primaryDestination.name}" is already in "${selectedTrip.title}".`,
        });
      }
      return;
    }

    // Create new trip mode
    if (!newTitle.trim()) {
      setErrorMsg('Please enter a title for your new trip.');
      return;
    }

    const daysCountNum = Math.max(1, Math.min(14, Number(newDaysCount) || 3));
    const itemsWithDays = normalizedList.map((dest, idx) => ({
      ...dest,
      dayNumber: isBatch ? (idx % daysCountNum) + 1 : 1,
      orderIndex: idx,
    }));

    const created = createTrip({
      title: newTitle.trim(),
      description: newDescription.trim(),
      daysCount: daysCountNum,
      stateSummary: primaryDestination?.stateName || '',
      source: 'manual',
      items: itemsWithDays,
    });

    if (created) {
      setResultFeedback({
        tripId: created.id,
        tripTitle: created.title,
        message: `Created "${created.title}" with ${created.items.length} destination${
          created.items.length === 1 ? '' : 's'
        }.`,
      });
    }
  };

  return (
    <div
      className="trip-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-trip-modal-title"
    >
      <div className="glass-panel trip-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="trip-modal-header">
          <div>
            <p className="section-eyebrow" style={{ marginBottom: '0.2rem' }}>
              Trip Organizer
            </p>
            <h2 id="add-to-trip-modal-title" className="trip-modal-title">
              {isBatch
                ? `Add ${normalizedList.length} Places to Trip`
                : `Add "${primaryDestination.name}" to Trip`}
            </h2>
          </div>
          <button
            type="button"
            className="trip-modal-close"
            onClick={onClose}
            aria-label="Close Add to Trip dialog"
          >
            <X size={18} />
          </button>
        </div>

        {!isBatch && primaryDestination && (
          <div className="trip-modal-preview">
            {primaryDestination.coverImageUrl && (
              <img
                src={primaryDestination.coverImageUrl}
                alt={primaryDestination.name}
                className="trip-modal-preview-img"
              />
            )}
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {primaryDestination.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={13} />
                <span>
                  {primaryDestination.cityOrDistrict
                    ? `${primaryDestination.cityOrDistrict}, `
                    : ''}
                  {primaryDestination.stateName}
                </span>
              </div>
            </div>
          </div>
        )}

        {resultFeedback ? (
          <div className="trip-modal-success" role="status">
            <div className="trip-modal-success-row">
              <CheckCircle2 size={22} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span>{resultFeedback.message}</span>
            </div>
            <div className="trip-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Continue Browsing
              </button>
              <Link
                to="/trips"
                className="btn btn-primary btn-sm"
                onClick={onClose}
              >
                <span>Open My Trips</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="trip-modal-form">
            {trips.length > 0 && (
              <div className="trip-modal-tabs" role="tablist" aria-label="Trip target mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'existing'}
                  className={`trip-modal-tab ${mode === 'existing' ? 'active' : ''}`}
                  onClick={() => setMode('existing')}
                >
                  <FolderPlus size={15} />
                  <span>Existing Trip ({trips.length})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'new'}
                  className={`trip-modal-tab ${mode === 'new' ? 'active' : ''}`}
                  onClick={() => setMode('new')}
                >
                  <Plus size={15} />
                  <span>Create New Trip</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="auth-error" role="alert">
                {errorMsg}
              </div>
            )}

            {mode === 'existing' && selectedTrip ? (
              <>
                <div className="form-group">
                  <label htmlFor="select-existing-trip">Select Trip</label>
                  <select
                    id="select-existing-trip"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={selectedTrip.id}
                    onChange={(e) => {
                      setSelectedTripId(e.target.value);
                      setSelectedDay(isBatch ? 'distribute' : '1');
                    }}
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.daysCount} {t.daysCount === 1 ? 'Day' : 'Days'} ·{' '}
                        {t.items.length} {t.items.length === 1 ? 'stop' : 'stops'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="select-trip-day">Assign to Day</label>
                  <select
                    id="select-trip-day"
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                  >
                    {isBatch && (
                      <option value="distribute">
                        Distribute evenly across {selectedTrip.daysCount} days
                      </option>
                    )}
                    {Array.from({ length: selectedTrip.daysCount }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="new-trip-title">Trip Title</label>
                  <input
                    id="new-trip-title"
                    type="text"
                    className="form-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Rajasthan Heritage Circuit"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-trip-days">Duration (Days)</label>
                  <select
                    id="new-trip-days"
                    className="filter-select"
                    style={{ width: '100%' }}
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
                  <label htmlFor="new-trip-desc">Trip Notes (Optional)</label>
                  <input
                    id="new-trip-desc"
                    type="text"
                    className="form-input"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Optional notes or travel companions..."
                    maxLength={300}
                  />
                </div>
              </>
            )}

            <div className="trip-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Calendar size={15} />
                <span>{mode === 'existing' ? 'Add to Trip' : 'Create Trip & Add'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
