import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compactMovie,
  dedupeMoviesById,
  mergeWatchProviders,
  filterAndSortMovies,
  validateWatchedEdit,
  validateBackupPayload,
  normalizePickerAssetUri,
} from '../src/utils/movieHelpers.js';

test('compactMovie strips heavy TMDB fields and preserves watched metadata only for watched', () => {
  const fullTmdbMovie = {
    id: 550,
    title: 'Fight Club',
    poster_path: '/p.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    runtime: 139,
    userRating: 9,
    userReview: 'Classic',
    watchedAt: '2026-01-01T12:00:00.000Z',
    credits: { cast: [{ id: 1, name: 'Brad Pitt' }] },
    images: { backdrops: [{ file_path: '/b.jpg' }] },
    videos: { results: [] },
    similar: { results: [] },
  };

  const watched = compactMovie(fullTmdbMovie, 'watched');
  assert.equal(watched.id, 550);
  assert.equal(watched.runtime, 139);
  assert.equal(watched.userRating, 9);
  assert.equal(watched.userReview, 'Classic');
  assert.equal(watched.credits, undefined);
  assert.equal(watched.images, undefined);

  const fav = compactMovie(fullTmdbMovie, 'favorites');
  assert.equal(fav.id, 550);
  assert.equal(fav.title, 'Fight Club');
  assert.equal(fav.runtime, undefined);
  assert.equal(fav.userRating, undefined);
  assert.equal(fav.credits, undefined);
});

test('dedupeMoviesById removes duplicates across pages while preserving order', () => {
  const existing = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
  const incoming = [{ id: 2, title: 'B dup' }, { id: 3, title: 'C' }, { id: '1', title: 'A str' }];
  const merged = dedupeMoviesById(existing, incoming);
  assert.deepEqual(
    merged.map((m) => m.id),
    [1, 2, 3]
  );
});

test('mergeWatchProviders combines rent and buy without duplicate provider_ids', () => {
  const providers = {
    rent: [
      { provider_id: 2, provider_name: 'Apple TV' },
      { provider_id: 3, provider_name: 'Google Play' },
    ],
    buy: [
      { provider_id: 3, provider_name: 'Google Play' },
      { provider_id: 10, provider_name: 'Amazon Video' },
    ],
  };

  const merged = mergeWatchProviders(providers);
  assert.deepEqual(
    merged.map((p) => p.provider_id),
    [2, 3, 10]
  );
  assert.deepEqual(mergeWatchProviders(null), []);
});

test('filterAndSortMovies filters by title/review and sorts properly', () => {
  const movies = [
    { id: 1, title: 'Zorro', userRating: 7, watchedAt: '2026-01-01T12:00:00Z', userReview: 'fun' },
    { id: 2, title: 'Alien', userRating: 10, watchedAt: '2026-03-01T12:00:00Z', userReview: 'scary' },
    { id: 3, title: 'Matrix', userRating: 9, watchedAt: '2026-02-01T12:00:00Z', userReview: 'classic' },
  ];

  assert.deepEqual(
    filterAndSortMovies(movies, { sortBy: 'rating_desc', listType: 'watched' }).map((m) => m.id),
    [2, 3, 1]
  );
  assert.deepEqual(
    filterAndSortMovies(movies, { sortBy: 'date_desc', listType: 'watched' }).map((m) => m.id),
    [2, 3, 1]
  );
  assert.deepEqual(
    filterAndSortMovies(movies, { sortBy: 'title_asc', listType: 'watched' }).map((m) => m.id),
    [2, 3, 1]
  );
  assert.deepEqual(
    filterAndSortMovies(movies, { query: 'classic', listType: 'watched' }).map((m) => m.id),
    [3]
  );
});

test('validateWatchedEdit accepts valid inputs and rejects invalid ratings/dates', () => {
  const ok = validateWatchedEdit({ ratingText: '8.5', dateText: '2026-02-28' });
  assert.equal(ok.valid, true);
  assert.equal(ok.rating, 8.5);
  assert.ok(ok.watchedAt);

  const emptyRating = validateWatchedEdit({ ratingText: '', dateText: '2026-02-28' });
  assert.equal(emptyRating.valid, true);
  assert.equal(emptyRating.rating, null);

  assert.equal(validateWatchedEdit({ ratingText: '11', dateText: '2026-02-28' }).valid, false);
  assert.equal(validateWatchedEdit({ ratingText: '0', dateText: '2026-02-28' }).valid, false);
  assert.equal(validateWatchedEdit({ ratingText: '8', dateText: '2026-02-30' }).valid, false);
  assert.equal(validateWatchedEdit({ ratingText: '8', dateText: 'not-a-date' }).valid, false);
});

test('validateBackupPayload validates backup schema strictly', () => {
  assert.equal(
    validateBackupPayload({
      profile: { name: 'Harun' },
      watched: [{ id: 1 }],
      watchlist: [],
      favorites: [],
      customLists: [{ id: '1', name: 'Sci-Fi', movies: [] }],
    }).valid,
    true
  );

  assert.equal(validateBackupPayload(null).valid, false);
  assert.equal(validateBackupPayload({}).valid, false);
  assert.equal(validateBackupPayload({ watched: 'bad' }).valid, false);
  assert.equal(validateBackupPayload({ customLists: [{ name: 123 }] }).valid, false);
});

test('normalizePickerAssetUri prefers persistent base64 data URI over temporary cache URI', () => {
  assert.equal(
    normalizePickerAssetUri({ uri: 'file:///tmp/a.jpg', base64: 'YWJj', mimeType: 'image/png' }),
    'data:image/png;base64,YWJj'
  );
  assert.equal(
    normalizePickerAssetUri({ uri: 'file:///tmp/a.jpg' }),
    'file:///tmp/a.jpg'
  );
  assert.equal(normalizePickerAssetUri(null), null);
});
