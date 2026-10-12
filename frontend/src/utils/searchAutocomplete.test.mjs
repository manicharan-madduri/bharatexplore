import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchStateSuggestions,
  matchCategorySuggestions,
  rankDestinationSuggestions,
  buildAutocompleteModel,
} from './searchAutocomplete.js';

test('matchStateSuggestions finds Manipur when typing "Mani" and resolves canonical state route', () => {
  const results = matchStateSuggestions('Mani');
  assert.ok(results.length >= 1);
  assert.equal(results[0].label, 'Manipur');
  assert.equal(results[0].regionType, 'State');
  assert.equal(results[0].href, '/state/manipur');
});

test('matchStateSuggestions resolves Union Territories and legacy aliases to canonical slugs', () => {
  const pondi = matchStateSuggestions('Pondi');
  assert.ok(pondi.some((s) => s.label === 'Puducherry' && s.href === '/state/puducherry'));

  const orissa = matchStateSuggestions('Orissa');
  assert.ok(orissa.some((s) => s.label === 'Odisha' && s.href === '/state/odisha'));

  const andaman = matchStateSuggestions('Andaman');
  assert.ok(
    andaman.some(
      (s) =>
        s.label === 'Andaman and Nicobar Islands' &&
        s.regionType === 'Union Territory' &&
        s.href === '/state/andaman-nicobar'
    )
  );
});

test('matchCategorySuggestions matches both 8 main categories and mapped subcategories', () => {
  const hist = matchCategorySuggestions('Hist');
  assert.ok(hist.length >= 1);
  assert.equal(hist[0].label, 'Historical');
  assert.equal(hist[0].isSubcategory, false);
  assert.equal(hist[0].href, '/search?category=Historical');

  const hill = matchCategorySuggestions('Hill Station');
  assert.ok(hill.length >= 1);
  assert.equal(hill[0].label, 'Hill Station');
  assert.equal(hill[0].isSubcategory, true);
  assert.equal(hill[0].href, '/search?category=Hill%20Station');
});

test('rankDestinationSuggestions prioritizes direct name matches (e.g. "Taj") and optimizes thumbnails', () => {
  const sampleApiResults = [
    {
      id: 205,
      name: 'Agra Fort',
      slug: 'agra-fort',
      cityOrDistrict: 'Tajganj, Agra',
      stateName: 'Uttar Pradesh',
      stateSlug: 'uttar-pradesh',
      category: 'Fort',
      rankPosition: 2,
      coverImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Agra_Fort.jpg',
    },
    {
      id: 201,
      name: 'Taj Mahal',
      slug: 'taj-mahal',
      cityOrDistrict: 'Agra',
      stateName: 'Uttar Pradesh',
      stateSlug: 'uttar-pradesh',
      category: 'Monument',
      rankPosition: 1,
      coverImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg',
    },
  ];

  const ranked = rankDestinationSuggestions(sampleApiResults, 'Taj');
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].label, 'Taj Mahal');
  assert.equal(ranked[0].subtitle, 'Agra, Uttar Pradesh');
  assert.equal(ranked[0].rankPosition, 1);
  assert.equal(ranked[0].href, '/destination/slug/taj-mahal');
  assert.ok(ranked[0].thumbnailUrl.includes('width=160'));
});

test('buildAutocompleteModel builds contiguous optionIndex values and includes View all results action', () => {
  const model = buildAutocompleteModel('Mani', [
    {
      id: 401,
      name: 'Loktak Lake',
      slug: 'loktak-lake',
      cityOrDistrict: 'Bishnupur',
      stateName: 'Manipur',
      stateSlug: 'manipur',
      category: 'Lake',
      rankPosition: 1,
      coverImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Loktak_Lake.jpg',
    },
  ]);

  assert.equal(model.states[0].label, 'Manipur');
  assert.equal(model.destinations[0].label, 'Loktak Lake');
  assert.equal(model.viewAllOption.type, 'view-all');
  assert.equal(model.viewAllOption.href, '/search?query=Mani');

  // Verify contiguous 0..N-1 optionIndex for ArrowUp/ArrowDown keyboard navigation
  model.flatOptions.forEach((opt, idx) => {
    assert.equal(opt.optionIndex, idx);
  });
});
