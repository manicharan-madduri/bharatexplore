import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCssBackgroundUrl,
  describeVerificationRecord,
  isMatchingRouteRecord,
  FALLBACK_DESTINATION_IMAGE,
  FALLBACK_STATE_IMAGE,
} from './imageUrl.js';
import {
  INDIAN_STATES,
  UNION_TERRITORIES,
  CATEGORIES,
  CATEGORY_GROUPS,
  matchesCategory,
  normalizeStateSlug,
} from '../data/navigation.js';

test('formatCssBackgroundUrl wraps Wikimedia URLs containing parentheses in double quotes as a single CSS layer', () => {
  const wikimediaWithParens =
    'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg';
  const cssBg = formatCssBackgroundUrl(wikimediaWithParens, 1280);

  assert.equal(
    cssBg,
    'url("https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg?width=1280")'
  );
  // Must NOT stack a second url(...) layer behind a valid image URL
  assert.equal(cssBg.includes('), url('), false);
});

test('FALLBACK_DESTINATION_IMAGE and FALLBACK_STATE_IMAGE use a neutral non-landmark placeholder instead of the homepage Taj Mahal image', () => {
  assert.ok(FALLBACK_DESTINATION_IMAGE.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(FALLBACK_STATE_IMAGE.startsWith('data:image/svg+xml;utf8,'));
  assert.equal(FALLBACK_DESTINATION_IMAGE.includes('1524492412937'), false);
  assert.equal(FALLBACK_DESTINATION_IMAGE.includes('unsplash.com'), false);

  const cssBg = formatCssBackgroundUrl('', 1280, FALLBACK_DESTINATION_IMAGE);
  assert.equal(cssBg, `url("${FALLBACK_DESTINATION_IMAGE}")`);
});

test('isMatchingRouteRecord prevents stale destination or state images from displaying during direct route transitions', () => {
  const tirupati = { id: 4, slug: 'tirumala-venkateswara-temple-tirupati', name: 'Tirumala Venkateswara Temple, Tirupati' };
  const tajMahal = { id: 285, slug: 'taj-mahal', name: 'Taj Mahal, Agra' };

  assert.equal(isMatchingRouteRecord(tirupati, 'tirumala-venkateswara-temple-tirupati'), true);
  assert.equal(isMatchingRouteRecord(tirupati, '4'), true);
  assert.equal(isMatchingRouteRecord(tirupati, 4), true);

  // When navigating directly from Taj Mahal to Tirupati, stale Taj Mahal record is rejected immediately
  assert.equal(isMatchingRouteRecord(tajMahal, 'tirumala-venkateswara-temple-tirupati'), false);
  assert.equal(isMatchingRouteRecord(tajMahal, '4'), false);
  assert.equal(isMatchingRouteRecord(null, 'tirumala-venkateswara-temple-tirupati'), false);
});

test('describeVerificationRecord distinguishes VERIFIED from UNRESOLVED records and labels Wikimedia vs official portal links', () => {
  const verifiedWikimedia = describeVerificationRecord({
    verificationStatus: 'VERIFIED',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Taj_Mahal_(Edited).jpeg',
  });
  assert.equal(verifiedWikimedia.statusCode, 'VERIFIED');
  assert.equal(verifiedWikimedia.isVerified, true);
  assert.equal(verifiedWikimedia.sourceLinkType, 'wikimedia_media');
  assert.equal(verifiedWikimedia.sourceLinkLabel, 'View Wikimedia Commons Media Source');

  const verifiedOfficial = describeVerificationRecord({
    verificationStatus: 'VERIFIED',
    sourceUrl: 'https://tourism.gov.in',
  });
  assert.equal(verifiedOfficial.statusCode, 'VERIFIED');
  assert.equal(verifiedOfficial.isVerified, true);
  assert.equal(verifiedOfficial.sourceLinkType, 'official_portal');
  assert.equal(verifiedOfficial.sourceLinkLabel, 'View Official Tourism Portal');

  const unresolvedRecord = describeVerificationRecord({
    verificationStatus: 'UNRESOLVED',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Unakoti_Tripura.jpg',
    reportingYear: 2024,
  });
  assert.equal(unresolvedRecord.statusCode, 'UNRESOLVED');
  assert.equal(unresolvedRecord.isVerified, false);
  assert.equal(unresolvedRecord.badgeLabel, 'UNRESOLVED · REGIONAL ESTIMATE');
  assert.ok(unresolvedRecord.heading.includes('Regional Statistical Estimate'));
  assert.equal(unresolvedRecord.sourceLinkLabel, 'View Wikimedia Commons Media Source');
});

test('navigation data covers all 36 States & Union Territories and all 8 category groups', () => {
  assert.equal(INDIAN_STATES.length, 28);
  assert.equal(UNION_TERRITORIES.length, 8);
  assert.equal(INDIAN_STATES.length + UNION_TERRITORIES.length, 36);
  assert.equal(CATEGORIES.length, 8);

  // Every main category has subcategory mappings
  for (const cat of CATEGORIES) {
    const key = cat.slug.toLowerCase();
    assert.ok(Array.isArray(CATEGORY_GROUPS[key]));
    assert.ok(CATEGORY_GROUPS[key].length > 0);
  }

  // Subcategories match their parent group
  assert.equal(matchesCategory('Fort', 'Historical'), true);
  assert.equal(matchesCategory('Temple', 'Religious'), true);
  assert.equal(matchesCategory('Hill Station', 'Nature'), true);
  assert.equal(matchesCategory('National Park', 'Wildlife'), true);
  assert.equal(matchesCategory('Island', 'Beach'), true);
  assert.equal(matchesCategory('Mountain Pass', 'Adventure'), true);
  assert.equal(matchesCategory('Museum', 'Cultural'), true);
  assert.equal(matchesCategory('Memorial', 'Monument'), true);

  // Legacy state slug aliases resolve to canonical DB slugs
  assert.equal(normalizeStateSlug('andaman-and-nicobar-islands'), 'andaman-nicobar');
  assert.equal(normalizeStateSlug('dadra-nagar-haveli-daman-diu'), 'daman-and-diu');
  assert.equal(normalizeStateSlug('jammu-kashmir'), 'jammu-and-kashmir');
});

test('DestinationAccordion.css refines Top 3/5 (.accordion-horizontal) animation while preserving Top 10/15/20 (.accordion-vertical), scoping desktop flex rules, and preserving reduced motion', async () => {
  const fs = await import('node:fs/promises');
  const cssUrl = new URL('../styles/DestinationAccordion.css', import.meta.url);
  const css = await fs.readFile(cssUrl, 'utf8');

  // Top 3 & Top 5 (.accordion-horizontal): constant flex-basis (58px -> flex: 1 0 58px) + slower 0.82s flex-grow transition
  assert.ok(css.includes('transition: flex-grow 0.82s cubic-bezier(0.25, 1, 0.35, 1)'));
  assert.ok(css.includes('flex: 1 0 58px;'));
  assert.equal(css.includes('flex: 1 1 auto;'), false);

  // Desktop horizontal flex sizing, will-change: flex-grow, and layout containment are scoped to @media (min-width: 769px)
  assert.ok(css.includes('@media (min-width: 769px)'));
  assert.ok(css.includes('@media (min-width: 769px) and (max-width: 1024px)'));
  assert.ok(css.includes('contain: paint style;'));

  // Mobile @media (max-width: 768px) resets flex and will-change cleanly for height transitions
  assert.ok(css.includes('transition: height 0.68s cubic-bezier(0.25, 1, 0.35, 1)'));
  assert.ok(css.includes('will-change: auto;'));

  // Top 10, Top 15, Top 20 (.accordion-vertical): preserves existing 0.32s height transition
  assert.ok(css.includes('transition: height 0.32s cubic-bezier(0.22, 1, 0.36, 1)'));

  // Preserves both OS and in-app reduced-motion overrides
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('[data-reduced-motion="true"]'));
});

test('DestinationAccordion hover scheduling preserves desktop mouse hover while blocking touch, mobile-emulated touch, and mid-transition layout-shift hover hijacks', async () => {
  const fs = await import('node:fs/promises');
  const jsxUrl = new URL('../components/DestinationAccordion.jsx', import.meta.url);
  const jsxSource = await fs.readFile(jsxUrl, 'utf8');

  // Extract the pure shouldScheduleAccordionHover function and constants from DestinationAccordion.jsx
  const startIdx = jsxSource.indexOf('const HOVER_DELAY_HORIZONTAL_MS');
  const endIdx = jsxSource.indexOf('const AccordionItem =');
  assert.ok(startIdx !== -1 && endIdx > startIdx, 'shouldScheduleAccordionHover must exist in DestinationAccordion.jsx');

  const extractedCode = jsxSource
    .slice(startIdx, endIdx)
    .replace('export function shouldScheduleAccordionHover', 'function shouldScheduleAccordionHover');
  const getHelper = new Function(`${extractedCode}; return shouldScheduleAccordionHover;`);
  const shouldScheduleAccordionHover = getHelper();

  const desktopMatchMedia = (query) => ({
    matches: query === '(hover: hover) and (pointer: fine)',
  });
  const mobileEmulationMatchMedia = (query) => ({
    matches: query.includes('(hover: none)') || query.includes('(pointer: coarse)'),
  });

  // 1. Normal desktop mouse input -> hover activation ALLOWED
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 0,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    true
  );

  // 2. Keyboard focus event -> hover timer BLOCKED (focus primes images only; Enter/Space/Arrows control activation)
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: true,
      pointerType: 'mouse',
      lastTouchTimestamp: 0,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    false
  );

  // 3. Direct touch or pen pointer event -> hover timer BLOCKED
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'touch',
      lastTouchTimestamp: 0,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    false
  );
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'pen',
      lastTouchTimestamp: 0,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    false
  );

  // 4. Synthesized compatibility mouseenter within 900ms after touchstart -> hover timer BLOCKED
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 4500,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    false
  );

  // After touch guard window (> 900ms) on a hybrid desktop device with a fine mouse -> hover timer ALLOWED again
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 3500,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: desktopMatchMedia,
    }),
    true
  );

  // 5. DevTools mobile emulation ((hover: none), (pointer: coarse)) -> hover timer BLOCKED even for raw mouse events
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 0,
      transitionLockUntil: 0,
      now: 5000,
      matchMediaFn: mobileEmulationMatchMedia,
    }),
    false
  );

  // 6. Interrupted / active mobile transition lock -> passive mouseenter from vertical card shift is BLOCKED during transition
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 0,
      transitionLockUntil: 5600,
      now: 5200,
      matchMediaFn: desktopMatchMedia,
    }),
    false
  );

  // Once transition lock window expires -> desktop mouse hover is ALLOWED
  assert.equal(
    shouldScheduleAccordionHover({
      isFocusEvent: false,
      pointerType: 'mouse',
      lastTouchTimestamp: 0,
      transitionLockUntil: 5600,
      now: 5700,
      matchMediaFn: desktopMatchMedia,
    }),
    true
  );
});


