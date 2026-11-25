/**
 * Pure movie, list, validation, and backup helpers.
 * Kept React-Native-free so they can be shared and unit-tested directly with Node.
 */

const BASE_MOVIE_FIELDS = ['id', 'title', 'name', 'poster_path', 'release_date', 'vote_average'];
const WATCHED_EXTRA_FIELDS = ['runtime', 'userRating', 'userReview', 'watchedAt'];

export const compactMovie = (movie, listType = 'default') => {
  if (!movie || movie.id == null) return {};
  const fields = listType === 'watched'
    ? [...BASE_MOVIE_FIELDS, ...WATCHED_EXTRA_FIELDS]
    : BASE_MOVIE_FIELDS;

  return Object.fromEntries(
    fields
      .filter((key) => movie[key] !== undefined)
      .map((key) => [key, movie[key]])
  );
};

export const dedupeMoviesById = (existing = [], incoming = []) => {
  const seen = new Set();
  const result = [];

  for (const movie of [...existing, ...incoming]) {
    if (!movie || movie.id == null) continue;
    const key = String(movie.id);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(movie);
    }
  }

  return result;
};

export const mergeWatchProviders = (providers) => {
  if (!providers) return [];
  const combined = [...(providers.rent || []), ...(providers.buy || [])];
  const seen = new Set();
  const result = [];

  for (const provider of combined) {
    if (!provider || provider.provider_id == null) continue;
    if (!seen.has(provider.provider_id)) {
      seen.add(provider.provider_id);
      result.push(provider);
    }
  }

  return result;
};

export const filterAndSortMovies = (movies = [], { query = '', sortBy = 'recent', listType = 'watched' } = {}) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? movies.filter((movie) => {
        const title = (movie?.title || movie?.name || '').toLocaleLowerCase();
        const review = (movie?.userReview || '').toLocaleLowerCase();
        return title.includes(normalizedQuery) || review.includes(normalizedQuery);
      })
    : [...movies];

  if (sortBy === 'recent') {
    return filtered;
  }

  return filtered.sort((a, b) => {
    if (sortBy === 'rating_desc') {
      const scoreA = listType === 'watched'
        ? (a?.userRating ?? -1)
        : (a?.vote_average ?? -1);
      const scoreB = listType === 'watched'
        ? (b?.userRating ?? -1)
        : (b?.vote_average ?? -1);
      return scoreB - scoreA;
    }

    if (sortBy === 'date_desc') {
      const dateA = listType === 'watched'
        ? (a?.watchedAt ? Date.parse(a.watchedAt) : 0)
        : (a?.release_date ? Date.parse(a.release_date) : 0);
      const dateB = listType === 'watched'
        ? (b?.watchedAt ? Date.parse(b.watchedAt) : 0)
        : (b?.release_date ? Date.parse(b.release_date) : 0);
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    }

    if (sortBy === 'title_asc') {
      const titleA = a?.title || a?.name || '';
      const titleB = b?.title || b?.name || '';
      return titleA.localeCompare(titleB);
    }

    return 0;
  });
};

export const validateWatchedEdit = ({ ratingText = '', dateText = '' } = {}) => {
  const trimmedRating = String(ratingText).trim();
  const rating = trimmedRating === '' ? null : Number(trimmedRating.replace(',', '.'));
  if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 10)) {
    return { valid: false, rating: null, watchedAt: null };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText).trim());
  if (!match) {
    return { valid: false, rating: null, watchedAt: null };
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const localDate = new Date(year, month - 1, day, 12);

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    return { valid: false, rating: null, watchedAt: null };
  }

  return { valid: true, rating, watchedAt: localDate.toISOString() };
};

export const validateBackupPayload = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'invalid_root' };
  }

  const hasValidProfile = data.profile == null || (typeof data.profile === 'object' && !Array.isArray(data.profile));
  const hasValidWatched = data.watched == null || Array.isArray(data.watched);
  const hasValidWatchlist = data.watchlist == null || Array.isArray(data.watchlist);
  const hasValidFavorites = data.favorites == null || Array.isArray(data.favorites);
  const hasValidCustomLists = data.customLists == null || (
    Array.isArray(data.customLists) &&
    data.customLists.every(
      (list) => list && typeof list === 'object' && typeof list.name === 'string' && Array.isArray(list.movies)
    )
  );

  if (!hasValidProfile || !hasValidWatched || !hasValidWatchlist || !hasValidFavorites || !hasValidCustomLists) {
    return { valid: false, error: 'invalid_schema' };
  }

  const hasAnySection =
    data.profile !== undefined ||
    data.watched !== undefined ||
    data.watchlist !== undefined ||
    data.favorites !== undefined ||
    data.customLists !== undefined;

  if (!hasAnySection) {
    return { valid: false, error: 'empty_backup' };
  }

  return { valid: true, error: null };
};

export const normalizePickerAssetUri = (asset) => {
  if (!asset) return null;
  if (asset.base64) {
    const mimeType = asset.mimeType || 'image/jpeg';
    return `data:${mimeType};base64,${asset.base64}`;
  }
  return asset.uri || null;
};
