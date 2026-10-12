import {
  INDIAN_STATES,
  UNION_TERRITORIES,
  CATEGORIES,
  CATEGORY_GROUPS,
  STATE_SLUG_ALIASES,
  normalizeStateSlug,
} from '../data/navigation.js';
import { getOptimizedImageUrl } from './imageUrl.js';

const CATEGORY_DESCRIPTIONS = {
  Historical: 'Forts, Palaces, Heritage & Archaeological Sites',
  Religious: 'Temples, Monasteries, Spiritual & Pilgrimage Sites',
  Nature: 'Hill Stations, Lakes, Waterfalls, Valleys & Gardens',
  Wildlife: 'National Parks, Wildlife Sanctuaries & Marine Life',
  Beach: 'Beaches, Islands, Backwaters & Coastal Escapes',
  Adventure: 'Mountain Passes, Peaks, Trekking, Caves & Deserts',
  Cultural: 'Museums, Heritage Villages, Art & Architecture',
  Monument: 'Iconic Monuments, Memorials, Forts & Stupas',
};

function toTitleCase(str = '') {
  return str
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

// Build canonical 36 States + UTs index with all aliases attached
const ALL_REGIONS = [
  ...INDIAN_STATES.map((st) => ({ ...st, regionType: 'State' })),
  ...UNION_TERRITORIES.map((ut) => ({ ...ut, regionType: 'Union Territory' })),
].map((entry) => {
  const canonicalSlug = normalizeStateSlug(entry.slug);
  const aliases = Object.entries(STATE_SLUG_ALIASES)
    .filter(([, targetSlug]) => targetSlug === canonicalSlug)
    .flatMap(([aliasSlug]) => [aliasSlug, aliasSlug.replace(/-/g, ' ')]);

  return {
    name: entry.name,
    nameLower: entry.name.toLowerCase(),
    wordsLower: entry.name.toLowerCase().split(/[\s-]+/),
    slug: canonicalSlug,
    regionType: entry.regionType,
    aliasesLower: aliases.map((a) => a.toLowerCase()),
  };
});

// Build main categories + distinct subcategories index
const SUBCATEGORY_INDEX = (() => {
  const mainSet = new Set(CATEGORIES.map((c) => c.name.toLowerCase()));
  const subMap = new Map();

  for (const [groupKey, subList] of Object.entries(CATEGORY_GROUPS)) {
    const parentName = toTitleCase(groupKey);
    for (const rawSub of subList) {
      const subLower = rawSub.trim().toLowerCase();
      if (mainSet.has(subLower)) continue;
      if (!subMap.has(subLower)) {
        subMap.set(subLower, {
          label: toTitleCase(subLower),
          labelLower: subLower,
          wordsLower: subLower.split(/[\s&-]+/).filter(Boolean),
          parents: [parentName],
        });
      } else {
        const existing = subMap.get(subLower);
        if (!existing.parents.includes(parentName)) {
          existing.parents.push(parentName);
        }
      }
    }
  }

  return Array.from(subMap.values());
})();

/**
 * Matches States and Union Territories (all 36 + aliases) against a user query.
 */
export function matchStateSuggestions(rawQuery, maxResults = 4) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim().toLowerCase() : '';
  if (!q) return [];

  const qSlug = q.replace(/\s+/g, '-');
  const scored = [];

  for (const region of ALL_REGIONS) {
    let score = 0;
    let matchedAlias = null;

    if (region.nameLower === q || region.slug === qSlug) {
      score = 120;
    } else if (region.nameLower.startsWith(q)) {
      score = 100;
    } else if (region.wordsLower.some((w) => w.startsWith(q))) {
      score = 88;
    } else if (region.aliasesLower.some((a) => a.startsWith(q) || a.startsWith(qSlug))) {
      score = 80;
      matchedAlias = region.aliasesLower.find((a) => a.startsWith(q) || a.startsWith(qSlug));
    } else if (region.nameLower.includes(q) || region.slug.includes(qSlug)) {
      score = 65;
    } else if (region.aliasesLower.some((a) => a.includes(q) || a.includes(qSlug))) {
      score = 55;
      matchedAlias = region.aliasesLower.find((a) => a.includes(q) || a.includes(qSlug));
    }

    if (score > 0) {
      scored.push({
        score,
        item: {
          id: `state-${region.slug}`,
          type: 'state',
          label: region.name,
          subtitle: matchedAlias
            ? `${region.regionType} · Also known as ${toTitleCase(matchedAlias.replace(/-/g, ' '))}`
            : region.regionType,
          regionType: region.regionType,
          slug: region.slug,
          href: `/state/${region.slug}`,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, maxResults).map((entry) => entry.item);
}

/**
 * Matches the 8 main categories and mapped subcategories against a user query.
 */
export function matchCategorySuggestions(rawQuery, maxResults = 3) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim().toLowerCase() : '';
  if (!q) return [];

  const scored = [];

  for (const cat of CATEGORIES) {
    const lower = cat.name.toLowerCase();
    let score = 0;
    if (lower === q) score = 115;
    else if (lower.startsWith(q)) score = 96;
    else if (lower.includes(q)) score = 78;

    if (score > 0) {
      scored.push({
        score,
        item: {
          id: `category-${cat.slug.toLowerCase()}`,
          type: 'category',
          label: cat.name,
          subtitle: CATEGORY_DESCRIPTIONS[cat.name] || 'Main Category',
          categoryValue: cat.slug,
          isSubcategory: false,
          href: `/search?category=${encodeURIComponent(cat.slug)}`,
        },
      });
    }
  }

  for (const sub of SUBCATEGORY_INDEX) {
    let score = 0;
    if (sub.labelLower === q) score = 105;
    else if (sub.labelLower.startsWith(q)) score = 86;
    else if (sub.wordsLower.some((w) => w.startsWith(q))) score = 74;
    else if (sub.labelLower.includes(q)) score = 62;

    if (score > 0) {
      scored.push({
        score,
        item: {
          id: `subcategory-${sub.labelLower.replace(/\s+/g, '-')}`,
          type: 'category',
          label: sub.label,
          subtitle: `Subcategory in ${sub.parents.join(' / ')}`,
          categoryValue: sub.label,
          parentCategory: sub.parents[0],
          isSubcategory: true,
          href: `/search?category=${encodeURIComponent(sub.label)}`,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, maxResults).map((entry) => entry.item);
}

/**
 * Ranks and formats destination results from `/api/destinations/search` so that
 * direct destination-name matches appear ahead of city/state matches.
 */
export function rankDestinationSuggestions(destinations, rawQuery, maxResults = 6) {
  if (!Array.isArray(destinations) || destinations.length === 0) return [];
  const q = typeof rawQuery === 'string' ? rawQuery.trim().toLowerCase() : '';

  const scored = destinations.map((dest) => {
    const nameLower = (dest.name || '').toLowerCase();
    const nameWords = nameLower.split(/[\s()-]+/).filter(Boolean);
    const cityLower = (dest.cityOrDistrict || '').toLowerCase();
    const stateLower = (dest.stateName || '').toLowerCase();

    let matchScore = 10;
    if (q) {
      if (nameLower === q) matchScore = 120;
      else if (nameLower.startsWith(q)) matchScore = 100;
      else if (nameWords.some((w) => w.startsWith(q))) matchScore = 85;
      else if (nameLower.includes(q)) matchScore = 72;
      else if (cityLower.startsWith(q)) matchScore = 58;
      else if (cityLower.includes(q)) matchScore = 48;
      else if (stateLower.startsWith(q) || stateLower.includes(q)) matchScore = 35;
    }

    const rankPos =
      typeof dest.rankPosition === 'number' && dest.rankPosition > 0 ? dest.rankPosition : 999;

    return {
      matchScore,
      rankPos,
      item: {
        id: `destination-${dest.id ?? dest.slug}`,
        type: 'destination',
        label: dest.name,
        subtitle: [dest.cityOrDistrict, dest.stateName].filter(Boolean).join(', '),
        cityOrDistrict: dest.cityOrDistrict || '',
        stateName: dest.stateName || '',
        stateSlug: dest.stateSlug ? normalizeStateSlug(dest.stateSlug) : '',
        category: dest.category || '',
        rankPosition: typeof dest.rankPosition === 'number' ? dest.rankPosition : null,
        thumbnailUrl: getOptimizedImageUrl(dest.coverImageUrl, 160),
        slug: dest.slug || '',
        destinationId: dest.id,
        href: dest.slug
          ? `/destination/slug/${encodeURIComponent(dest.slug)}`
          : `/destination/${dest.id}`,
      },
    };
  });

  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      a.rankPos - b.rankPos ||
      a.item.label.localeCompare(b.item.label)
  );

  return scored.slice(0, maxResults).map((entry) => entry.item);
}

/**
 * Builds the flat, keyboard-navigable option list along with section metadata.
 */
export function buildAutocompleteModel(rawQuery, destinationResults = [], options = {}) {
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!query) {
    return {
      query: '',
      states: [],
      categories: [],
      destinations: [],
      viewAllOption: null,
      flatOptions: [],
    };
  }

  const states = matchStateSuggestions(query, options.maxStates ?? 4);
  const categories = matchCategorySuggestions(query, options.maxCategories ?? 3);
  const destinations = rankDestinationSuggestions(
    destinationResults,
    query,
    options.maxDestinations ?? 6
  );

  const viewAllOption = {
    id: 'view-all-results',
    type: 'view-all',
    label: `View all results for "${query}"`,
    subtitle: 'Search across all 720 destinations',
    href: `/search?query=${encodeURIComponent(query)}`,
  };

  const flatOptions = [...states, ...categories, ...destinations, viewAllOption].map(
    (opt, index) => ({
      ...opt,
      optionIndex: index,
    })
  );

  return {
    query,
    states: flatOptions.filter((o) => o.type === 'state'),
    categories: flatOptions.filter((o) => o.type === 'category'),
    destinations: flatOptions.filter((o) => o.type === 'destination'),
    viewAllOption: flatOptions[flatOptions.length - 1],
    flatOptions,
  };
}
