import { useState, useEffect } from 'react';
import { stateApi } from '../api/stateApi';
import { normalizeStateSlug } from '../data/navigation';
import { isMatchingRouteRecord } from '../utils/imageUrl';

export function useStates() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStates() {
      try {
        setLoading(true);
        const response = await stateApi.getAllStates();
        if (isMounted && response.success) {
          setStates(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch states and Union Territories.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStates();

    return () => {
      isMounted = false;
    };
  }, []);

  return { states, loading, error };
}

export function useStateDetail(slug) {
  const [stateDetail, setStateDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canonicalSlug = normalizeStateSlug(slug);

  useEffect(() => {
    if (!canonicalSlug) return;
    let isMounted = true;

    async function fetchStateDetail() {
      try {
        setLoading(true);
        setError(null);
        setStateDetail(prev => (isMatchingRouteRecord(prev, canonicalSlug) ? prev : null));
        const response = await stateApi.getStateBySlug(canonicalSlug);
        if (isMounted && response.success) {
          setStateDetail(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setStateDetail(null);
          setError(err.message || `Failed to fetch state details for '${slug}'.`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStateDetail();

    return () => {
      isMounted = false;
    };
  }, [canonicalSlug, slug]);

  const isCurrentState = isMatchingRouteRecord(stateDetail, canonicalSlug);
  const isPendingNewState = Boolean(canonicalSlug) && !error && !isCurrentState;

  return {
    stateDetail: isCurrentState ? stateDetail : null,
    loading: loading || isPendingNewState,
    error,
  };
}
