import { matchesCategory } from '../data/navigation.js';

export const PACE_OPTIONS = Object.freeze({
  relaxed: { id: 'relaxed', label: 'Relaxed', stopsPerDay: 2, summary: '2 stops per day · unhurried exploration' },
  balanced: { id: 'balanced', label: 'Balanced', stopsPerDay: 3, summary: '3 stops per day · classic sightseeing pace' },
  packed: { id: 'packed', label: 'Packed', stopsPerDay: 4, summary: '4 stops per day · maximum coverage' },
});

export const SUPPORTED_REGIONS = Object.freeze([
  'North',
  'South',
  'West',
  'East',
  'Northeast',
  'Central',
]);

export function clampPlannerDays(days) {
  const num = Number(days);
  if (!Number.isFinite(num)) return 3;
  return Math.max(2, Math.min(7, Math.trunc(num)));
}

export function resolvePaceConfig(pace) {
  const key = typeof pace === 'string' ? pace.trim().toLowerCase() : 'balanced';
  return PACE_OPTIONS[key] || PACE_OPTIONS.balanced;
}

export function hasValidCoordinates(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.latitude === null || item.latitude === undefined || item.latitude === '') return false;
  if (item.longitude === null || item.longitude === undefined || item.longitude === '') return false;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Calculates great-circle distance in km between two points with valid coordinates.
 * Returns null if either point is missing coordinates.
 */
export function calculateDistanceKm(pointA, pointB) {
  if (!hasValidCoordinates(pointA) || !hasValidCoordinates(pointB)) {
    return null;
  }
  const lat1 = (Number(pointA.latitude) * Math.PI) / 180;
  const lat2 = (Number(pointB.latitude) * Math.PI) / 180;
  const dLat = ((Number(pointB.latitude) - Number(pointA.latitude)) * Math.PI) / 180;
  const dLng = ((Number(pointB.longitude) - Number(pointA.longitude)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusKm = 6371;
  return Math.round(earthRadiusKm * c * 10) / 10;
}

/**
 * Orders selected destinations using nearest-neighbor geographic clustering when coordinates
 * or city/district values are available, falling back to official state rank order.
 */
export function clusterDestinationsForItinerary(destinations = []) {
  if (!Array.isArray(destinations) || destinations.length <= 2) {
    return [...destinations];
  }

  const remaining = [...destinations];
  // Start with the highest-ranked destination (#1 or lowest rankPosition)
  remaining.sort((a, b) => {
    const rA = typeof a.rankPosition === 'number' ? a.rankPosition : 999;
    const rB = typeof b.rankPosition === 'number' ? b.rankPosition : 999;
    return rA - rB || String(a.name || '').localeCompare(String(b.name || ''));
  });

  const ordered = [remaining.shift()];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const distKm = calculateDistanceKm(current, candidate);
      const sameCity =
        current.cityOrDistrict &&
        candidate.cityOrDistrict &&
        current.cityOrDistrict.trim().toLowerCase() === candidate.cityOrDistrict.trim().toLowerCase();
      const sameState =
        current.stateSlug &&
        candidate.stateSlug &&
        current.stateSlug === candidate.stateSlug;

      let score;
      if (distKm !== null) {
        score = distKm - (sameCity ? 15 : 0);
      } else if (sameCity) {
        score = 5;
      } else if (sameState) {
        score = 80 + (typeof candidate.rankPosition === 'number' ? candidate.rankPosition : 25);
      } else {
        score = 250 + (typeof candidate.rankPosition === 'number' ? candidate.rankPosition : 25);
      }

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  return ordered;
}

/**
 * Generates a structured multi-day itinerary from real destination records.
 * Never fabricates fees, timings, durations, or coordinates.
 */
export function generateSmartItinerary({
  candidates = [],
  scopeLabel = 'India',
  days = 3,
  pace = 'balanced',
  interests = [],
} = {}) {
  const safeDays = clampPlannerDays(days);
  const paceConfig = resolvePaceConfig(pace);
  const targetStopsCount = safeDays * paceConfig.stopsPerDay;

  const cleanInterests = Array.isArray(interests)
    ? interests.map((c) => String(c || '').trim()).filter(Boolean)
    : [];

  // Deduplicate candidates by id
  const uniqueMap = new Map();
  (Array.isArray(candidates) ? candidates : []).forEach((dest) => {
    if (!dest || dest.id === undefined || dest.id === null) return;
    const key = String(dest.id);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, dest);
    }
  });
  const uniqueCandidates = Array.from(uniqueMap.values());

  const scored = uniqueCandidates.map((dest) => {
    const matchesSelectedInterest =
      cleanInterests.length === 0 ||
      cleanInterests.some((interest) => matchesCategory(dest.category, interest));

    const rankPos =
      typeof dest.rankPosition === 'number' && Number.isFinite(dest.rankPosition)
        ? dest.rankPosition
        : typeof dest.rankingInfo?.rankPosition === 'number'
          ? dest.rankingInfo.rankPosition
          : 999;

    return {
      dest,
      matchesSelectedInterest,
      rankPos,
    };
  });

  scored.sort((a, b) => {
    if (a.matchesSelectedInterest !== b.matchesSelectedInterest) {
      return a.matchesSelectedInterest ? -1 : 1;
    }
    if (a.rankPos !== b.rankPos) {
      return a.rankPos - b.rankPos;
    }
    return String(a.dest.name || '').localeCompare(String(b.dest.name || ''));
  });

  const selectedEntries = scored.slice(0, targetStopsCount);
  const matchedInterestCount = selectedEntries.filter((e) => e.matchesSelectedInterest).length;
  const fallbackRankCount = selectedEntries.length - matchedInterestCount;

  const rawSelectedDestinations = selectedEntries.map((entry) => ({
    ...entry.dest,
    matchedInterest: entry.matchesSelectedInterest,
  }));

  const clustered = clusterDestinationsForItinerary(rawSelectedDestinations);

  // Partition evenly across safeDays
  const dayBuckets = Array.from({ length: safeDays }, (_, i) => ({
    dayNumber: i + 1,
    stops: [],
  }));

  clustered.forEach((dest, idx) => {
    const bucketIndex = Math.min(
      safeDays - 1,
      Math.floor((idx * safeDays) / Math.max(1, clustered.length))
    );
    dayBuckets[bucketIndex].stops.push(dest);
  });

  const daysPlan = dayBuckets.map((bucket) => {
    const cities = Array.from(
      new Set(bucket.stops.map((s) => s.cityOrDistrict).filter(Boolean))
    );
    const statesInDay = Array.from(
      new Set(bucket.stops.map((s) => s.stateName).filter(Boolean))
    );

    const enrichedStops = bucket.stops.map((stop, idx) => {
      const prevStop = idx > 0 ? bucket.stops[idx - 1] : null;
      const distanceFromPrevKm = prevStop ? calculateDistanceKm(prevStop, stop) : null;

      return {
        ...stop,
        dayNumber: bucket.dayNumber,
        orderIndex: idx,
        distanceFromPrevKm,
        hasCoordinates: hasValidCoordinates(stop),
        estimatedVisitDuration: stop.estimatedVisitDuration || null,
        entryFees: stop.entryFees || null,
        openingHours: stop.openingHours || null,
        travelTips: stop.travelTips || null,
        bestTimeToVisit: stop.bestTimeToVisit || null,
      };
    });

    return {
      dayNumber: bucket.dayNumber,
      title:
        cities.length > 0
          ? `Day ${bucket.dayNumber}: ${cities.slice(0, 2).join(' & ')}`
          : statesInDay.length > 0
            ? `Day ${bucket.dayNumber}: ${statesInDay[0]} Highlights`
            : `Day ${bucket.dayNumber}`,
      cities,
      stops: enrichedStops,
    };
  });

  return {
    title: `${safeDays}-Day ${scopeLabel} ${
      cleanInterests.length === 1 ? `${cleanInterests[0]} ` : ''
    }Itinerary`,
    scopeLabel,
    daysCount: safeDays,
    pace: paceConfig.id,
    paceLabel: paceConfig.label,
    stopsPerDay: paceConfig.stopsPerDay,
    interests: cleanInterests,
    totalStops: clustered.length,
    matchedInterestCount,
    fallbackRankCount,
    days: daysPlan,
  };
}

export function convertPlanToTripPayload(plan, customTitle = '') {
  if (!plan || !Array.isArray(plan.days)) return null;

  const flatItems = [];
  plan.days.forEach((day) => {
    (day.stops || []).forEach((stop, idx) => {
      flatItems.push({
        ...stop,
        dayNumber: day.dayNumber,
        orderIndex: idx,
      });
    });
  });

  const interestSummary =
    Array.isArray(plan.interests) && plan.interests.length > 0
      ? `Interests: ${plan.interests.join(', ')}. `
      : '';

  return {
    title: (customTitle && customTitle.trim()) || plan.title || 'Generated BharatExplore Trip',
    description: `${plan.daysCount}-day ${plan.paceLabel?.toLowerCase() || 'balanced'} pace itinerary for ${
      plan.scopeLabel || 'India'
    }. ${interestSummary}Built from verified official tourism rankings.`,
    daysCount: plan.daysCount,
    stateSummary: plan.scopeLabel || '',
    pace: plan.pace || 'balanced',
    source: 'planner',
    items: flatItems,
  };
}
