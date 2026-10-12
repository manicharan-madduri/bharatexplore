// Shared image URL optimization & fallback utilities for BharatExplore

// Neutral non-landmark dark slate/teal SVG placeholder so missing or loading images
// never display the homepage Taj Mahal photo or another destination's photo.
const NEUTRAL_PLACEHOLDER_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">` +
  `<defs>` +
  `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">` +
  `<stop offset="0%" stop-color="#070d1f"/>` +
  `<stop offset="50%" stop-color="#0d1f38"/>` +
  `<stop offset="100%" stop-color="#0b2936"/>` +
  `</linearGradient>` +
  `<radialGradient id="glow" cx="50%" cy="40%" r="60%">` +
  `<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.16"/>` +
  `<stop offset="100%" stop-color="#070d1f" stop-opacity="0"/>` +
  `</radialGradient>` +
  `</defs>` +
  `<rect width="1200" height="800" fill="url(#bg)"/>` +
  `<rect width="1200" height="800" fill="url(#glow)"/>` +
  `</svg>`;

export const FALLBACK_DESTINATION_IMAGE =
  `data:image/svg+xml;utf8,${encodeURIComponent(NEUTRAL_PLACEHOLDER_SVG)}`;

export const FALLBACK_STATE_IMAGE = FALLBACK_DESTINATION_IMAGE;

const WIKIMEDIA_FILEPATH_REGEX =
  /^https?:\/\/(?:commons|en)\.(?:m\.)?wikimedia\.org\/wiki\/Special:FilePath\/|^https?:\/\/en\.wikipedia\.org\/wiki\/Special:FilePath\//i;

/**
 * Optimizes Wikimedia Commons Special:FilePath URLs by requesting a resized thumbnail
 * (defaulting to 800px width) while preserving encoded filenames and existing query parameters.
 * Leaves non-Wikimedia Special:FilePath external URLs untouched.
 *
 * @param {string} url - Original image URL
 * @param {number|object} [options=800] - Target width in pixels, or { width } options object
 * @returns {string} Optimized image URL or fallback URL if input is empty
 */
export function getOptimizedImageUrl(url, options = 800) {
  if (!url || typeof url !== 'string') {
    return FALLBACK_DESTINATION_IMAGE;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_DESTINATION_IMAGE;
  }

  const width = typeof options === 'number' ? options : options?.width ?? 800;
  if (!width || width <= 0) {
    return trimmed;
  }

  // Only transform Wikimedia Special:FilePath URLs; leave other external URLs untouched
  if (!WIKIMEDIA_FILEPATH_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Preserve exact path encoding and hash while safely merging query parameters
  const hashIndex = trimmed.indexOf('#');
  const withoutHash = hashIndex !== -1 ? trimmed.slice(0, hashIndex) : trimmed;
  const hashSegment = hashIndex !== -1 ? trimmed.slice(hashIndex) : '';

  const queryIndex = withoutHash.indexOf('?');
  const basePath = queryIndex !== -1 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const rawQuery = queryIndex !== -1 ? withoutHash.slice(queryIndex + 1) : '';

  // Ensure there is an actual filename after Special:FilePath/
  const filePart = basePath.split(/Special:FilePath\//i)[1];
  if (!filePart) {
    return FALLBACK_DESTINATION_IMAGE;
  }

  const params = new URLSearchParams(rawQuery);
  if (!params.has('width')) {
    params.set('width', String(Math.round(width)));
  }

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}${hashSegment}`;
}

/**
 * Returns the full-resolution image URL for detail heroes and lightboxes,
 * falling back cleanly if the URL is missing.
 *
 * @param {string} url - Original image URL
 * @returns {string} Full-resolution URL or fallback URL
 */
export function getFullResolutionImageUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return FALLBACK_DESTINATION_IMAGE;
  }
  return url.trim();
}

/**
 * Safe image onError handler that swaps a broken image to a fallback URL once,
 * preventing infinite error loops if the fallback itself ever fails.
 *
 * @param {SyntheticEvent|Event} event - Image error event
 * @param {string} [fallbackUrl=FALLBACK_DESTINATION_IMAGE] - Fallback image URL
 */
export function applyImageFallback(event, fallbackUrl = FALLBACK_DESTINATION_IMAGE) {
  const img = event?.currentTarget || event?.target;
  if (!img) return;

  if (img.dataset.fallbackApplied === 'true' || img.src === fallbackUrl) {
    return;
  }

  img.dataset.fallbackApplied = 'true';
  img.src = fallbackUrl;
}

/**
 * Formats an image URL for safe use in CSS `backgroundImage` properties by
 * quoting the URL inside `url("...")`.
 *
 * IMPORTANT: Never stacks a second fallback image layer behind a valid primary URL,
 * because CSS multi-layer backgrounds (`url("primary"), url("fallback")`) paint the
 * bottom fallback layer immediately while the primary image is still fetching/decoding,
 * which previously caused the fallback image to flash for ~0.2s on page load/reload.
 *
 * @param {string} url - Raw image URL
 * @param {number} [width=1280] - Target width for Wikimedia thumbnail optimization
 * @param {string} [fallbackUrl=FALLBACK_DESTINATION_IMAGE] - Fallback image URL used only when `url` is empty
 * @returns {string} Quoted single-layer CSS background-image value
 */
export function formatCssBackgroundUrl(
  url,
  width = 1280,
  fallbackUrl = FALLBACK_DESTINATION_IMAGE
) {
  const hasValidUrl = typeof url === 'string' && url.trim().length > 0;
  const resolved = hasValidUrl
    ? getOptimizedImageUrl(url, width)
    : (fallbackUrl || FALLBACK_DESTINATION_IMAGE);
  const safeUrl = String(resolved).replace(/\\/g, '\\\\').replace(/"/g, '%22');
  return `url("${safeUrl}")`;
}

/**
 * Verifies whether a loaded destination or state record matches the currently requested route
 * parameter (`id` or `slug`), preventing stale records/images from flashing during direct
 * route-to-route transitions.
 *
 * @param {object|null} record - Loaded destination or state object
 * @param {string|number} idOrSlug - Route param (`id` or `slug`)
 * @returns {boolean} True if `record` belongs to `idOrSlug`
 */
export function isMatchingRouteRecord(record, idOrSlug) {
  if (!record || idOrSlug === undefined || idOrSlug === null) return false;
  const target = String(idOrSlug).trim().toLowerCase();
  if (!target) return false;
  const recordId = record.id !== undefined && record.id !== null ? String(record.id).trim().toLowerCase() : '';
  const recordSlug = typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';
  return recordId === target || recordSlug === target;
}

/**
 * Computes honest verification metadata and source link labels for a destination or ranking record.
 * Distinguishes the 703 VERIFIED records from the 17 UNRESOLVED records and never labels a
 * Wikimedia Commons file URL as an "Official Document".
 *
 * @param {object} record - DestinationDetailDTO, DestinationDTO, or RankingDTO
 * @returns {object} Verification descriptor
 */
export function describeVerificationRecord(record = {}) {
  const ranking = record?.rankingInfo || record || {};
  const rawStatus =
    ranking?.verificationStatus ||
    record?.verificationStatus ||
    'VERIFIED';
  const statusCode =
    String(rawStatus).trim().toUpperCase() === 'UNRESOLVED'
      ? 'UNRESOLVED'
      : 'VERIFIED';
  const isVerified = statusCode === 'VERIFIED';
  const reportingYear = ranking?.reportingYear || record?.reportingYear || 2024;
  const sourceUrl = typeof ranking?.sourceUrl === 'string' ? ranking.sourceUrl.trim() : '';

  const isWikimediaUrl = /wikimedia\.org|wikipedia\.org/i.test(sourceUrl);
  const hasHttpUrl = /^https?:\/\//i.test(sourceUrl);

  const sourceLinkType = !hasHttpUrl
    ? 'none'
    : isWikimediaUrl
      ? 'wikimedia_media'
      : 'official_portal';

  const sourceLinkLabel =
    sourceLinkType === 'wikimedia_media'
      ? 'View Wikimedia Commons Media Source'
      : sourceLinkType === 'official_portal'
        ? 'View Official Tourism Portal'
        : '';

  return {
    isVerified,
    statusCode,
    reportingYear,
    badgeLabel: isVerified ? 'VERIFIED RECORD' : 'UNRESOLVED · REGIONAL ESTIMATE',
    heading: isVerified
      ? `Official Tourism Visitation Record — ${reportingYear}`
      : `Regional Statistical Estimate — Pending Archival Verification (${reportingYear})`,
    statusNote: isVerified
      ? 'Verified against published state/national tourism or ASI monument visitation statistics.'
      : 'Status: UNRESOLVED — Ranked using regional state/UT statistical estimates where standalone landmark-level census or exact archival photo verification remains pending.',
    sourceUrl: hasHttpUrl ? sourceUrl : '',
    sourceLinkType,
    sourceLinkLabel,
    photoAttributionNote: isVerified
      ? 'Wikimedia Commons Archival Photograph'
      : 'Representative Regional / District Commons Photograph (Pending Exact Landmark Archival Verification)',
  };
}

