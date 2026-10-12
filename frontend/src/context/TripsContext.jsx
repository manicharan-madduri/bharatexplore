import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  GUEST_TRIPS_KEY,
  getTripsStorageKey,
  readTripsList,
  writeTripsList,
  createNewTripObject,
  updateTripDetails,
  addDestinationToTrip,
  removeDestinationFromTrip,
  assignStopToDay,
  moveStopInTrip,
  mergeGuestTripsIntoUser,
  normalizeTrip,
} from '../utils/tripsStorage';

const TripsContext = createContext(null);

export function TripsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const activeStorageKey = useMemo(() => getTripsStorageKey(user), [user]);

  const [trips, setTrips] = useState(() => readTripsList(GUEST_TRIPS_KEY));
  const [activeTripId, setActiveTripId] = useState(null);
  const [lastMergedTripsCount, setLastMergedTripsCount] = useState(0);

  // Sync and merge guest trips into user storage when auth resolves or user logs in/out
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const { trips: mergedList, mergedCount } = mergeGuestTripsIntoUser(user);
      setTrips(mergedList);
      setActiveTripId((prev) =>
        mergedList.some((t) => t.id === prev) ? prev : mergedList[0]?.id || null
      );
      if (mergedCount > 0) {
        setLastMergedTripsCount(mergedCount);
      }
    } else {
      const guestList = readTripsList(GUEST_TRIPS_KEY);
      setTrips(guestList);
      setActiveTripId((prev) =>
        guestList.some((t) => t.id === prev) ? prev : guestList[0]?.id || null
      );
      setLastMergedTripsCount(0);
    }
  }, [user, authLoading]);

  // Synchronize across browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === activeStorageKey || e.key === GUEST_TRIPS_KEY) {
        const updated = readTripsList(activeStorageKey);
        setTrips(updated);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [activeStorageKey]);

  const createTrip = useCallback(
    (payload) => {
      const created = createNewTripObject(payload);
      if (!created) return null;
      setTrips((prev) => {
        const next = writeTripsList(activeStorageKey, [created, ...prev]);
        return next;
      });
      setActiveTripId(created.id);
      return created;
    },
    [activeStorageKey]
  );

  const updateTrip = useCallback(
    (tripId, patch) => {
      let updatedTrip = null;
      setTrips((prev) => {
        const next = prev.map((t) => {
          if (t.id !== tripId) return t;
          const modified = updateTripDetails(t, patch);
          updatedTrip = modified || t;
          return updatedTrip;
        });
        return writeTripsList(activeStorageKey, next);
      });
      return updatedTrip;
    },
    [activeStorageKey]
  );

  const deleteTrip = useCallback(
    (tripId) => {
      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== tripId);
        writeTripsList(activeStorageKey, next);
        setActiveTripId((currentId) => (currentId === tripId ? next[0]?.id || null : currentId));
        return next;
      });
    },
    [activeStorageKey]
  );

  const clearTrips = useCallback(() => {
    writeTripsList(activeStorageKey, []);
    setTrips([]);
    setActiveTripId(null);
  }, [activeStorageKey]);

  const addDestination = useCallback(
    (tripId, destination, dayNumber = 1) => {
      let outcome = { added: false, alreadyExists: false, trip: null };
      setTrips((prev) => {
        const next = prev.map((t) => {
          if (t.id !== tripId) return t;
          const res = addDestinationToTrip(t, destination, dayNumber);
          outcome = res;
          return res.trip || t;
        });
        return writeTripsList(activeStorageKey, next);
      });
      return outcome;
    },
    [activeStorageKey]
  );

  const addDestinationsBatch = useCallback(
    (tripId, destinations = [], dayNumber = 1) => {
      let addedCount = 0;
      let skippedCount = 0;
      setTrips((prev) => {
        const next = prev.map((t) => {
          if (t.id !== tripId) return t;
          let working = t;
          destinations.forEach((dest, idx) => {
            const targetDay =
              dayNumber === 'distribute'
                ? (idx % working.daysCount) + 1
                : dayNumber;
            const res = addDestinationToTrip(working, dest, targetDay);
            if (res.added && res.trip) {
              working = res.trip;
              addedCount += 1;
            } else if (res.alreadyExists) {
              skippedCount += 1;
            }
          });
          return working;
        });
        return writeTripsList(activeStorageKey, next);
      });
      return { addedCount, skippedCount };
    },
    [activeStorageKey]
  );

  const removeDestination = useCallback(
    (tripId, destinationId) => {
      setTrips((prev) => {
        const next = prev.map((t) =>
          t.id === tripId ? removeDestinationFromTrip(t, destinationId) || t : t
        );
        return writeTripsList(activeStorageKey, next);
      });
    },
    [activeStorageKey]
  );

  const assignStopDay = useCallback(
    (tripId, destinationId, dayNumber) => {
      setTrips((prev) => {
        const next = prev.map((t) =>
          t.id === tripId ? assignStopToDay(t, destinationId, dayNumber) || t : t
        );
        return writeTripsList(activeStorageKey, next);
      });
    },
    [activeStorageKey]
  );

  const moveStop = useCallback(
    (tripId, destinationId, direction) => {
      setTrips((prev) => {
        const next = prev.map((t) =>
          t.id === tripId ? moveStopInTrip(t, destinationId, direction) || t : t
        );
        return writeTripsList(activeStorageKey, next);
      });
    },
    [activeStorageKey]
  );

  const updateStopNotes = useCallback(
    (tripId, destinationId, notes) => {
      setTrips((prev) => {
        const next = prev.map((t) => {
          if (t.id !== tripId) return t;
          const nextItems = (t.items || []).map((item) =>
            String(item.id) === String(destinationId)
              ? { ...item, notes: String(notes || '').slice(0, 300) }
              : item
          );
          return normalizeTrip({ ...t, items: nextItems, updatedAt: Date.now() }) || t;
        });
        return writeTripsList(activeStorageKey, next);
      });
    },
    [activeStorageKey]
  );

  const getTripsContainingDestination = useCallback(
    (destinationId) => {
      if (destinationId === undefined || destinationId === null) return [];
      const key = String(destinationId);
      return trips.filter((t) => (t.items || []).some((item) => String(item.id) === key));
    },
    [trips]
  );

  const dismissTripsMergeNotice = useCallback(() => {
    setLastMergedTripsCount(0);
  }, []);

  const value = useMemo(
    () => ({
      trips,
      tripsCount: trips.length,
      activeTripId,
      setActiveTripId,
      createTrip,
      updateTrip,
      deleteTrip,
      clearTrips,
      addDestination,
      addDestinationsBatch,
      removeDestination,
      assignStopDay,
      moveStop,
      updateStopNotes,
      getTripsContainingDestination,
      lastMergedTripsCount,
      dismissTripsMergeNotice,
    }),
    [
      trips,
      activeTripId,
      createTrip,
      updateTrip,
      deleteTrip,
      clearTrips,
      addDestination,
      addDestinationsBatch,
      removeDestination,
      assignStopDay,
      moveStop,
      updateStopNotes,
      getTripsContainingDestination,
      lastMergedTripsCount,
      dismissTripsMergeNotice,
    ]
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return ctx;
}
