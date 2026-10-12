import { useState, useEffect } from 'react';
import { destinationApi } from '../api/destinationApi';
import { isMatchingRouteRecord } from '../utils/imageUrl';

export function useDestinationDetail(idOrSlug) {
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!idOrSlug) {
      setDestination(null);
      setLoading(false);
      setError('Destination identifier is missing.');
      return;
    }
    let isMounted = true;

    async function fetchDestination() {
      try {
        setLoading(true);
        setError(null);
        setDestination(prev => (isMatchingRouteRecord(prev, idOrSlug) ? prev : null));
        const isNumeric = /^\d+$/.test(String(idOrSlug).trim());
        const response = isNumeric
          ? await destinationApi.getDestinationById(idOrSlug)
          : await destinationApi.getDestinationBySlug(idOrSlug);

        if (isMounted && response.success) {
          setDestination(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setDestination(null);
          setError(err.message || 'Failed to load destination details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDestination();

    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  const isCurrentRecord = isMatchingRouteRecord(destination, idOrSlug);
  const isPendingNewRoute = Boolean(idOrSlug) && !error && !isCurrentRecord;

  return {
    destination: isCurrentRecord ? destination : null,
    loading: loading || isPendingNewRoute,
    error,
  };
}

export function useSearchDestinations(filterParams) {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDestinations() {
      try {
        setLoading(true);
        const response = await destinationApi.filterDestinations(filterParams || {});
        if (isMounted && response.success) {
          setDestinations(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch destinations.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDestinations();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(filterParams)]);

  return { destinations, loading, error };
}
