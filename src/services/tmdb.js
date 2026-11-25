import axios from 'axios';

// TMDB API Anahtarını güvenlik için .env dosyasından çekiyoruz
const API_KEY = (process.env.EXPO_PUBLIC_TMDB_API_KEY || '').trim();
const BASE_URL = 'https://api.themoviedb.org/3';

// Görsellerin (Kapak fotoğrafları) başındaki sabit URL
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export const isApiKeyConfigured = () => API_KEY.length > 0;

// Axios kullanarak TMDB için özel bir istemci (client) oluşturuyoruz
const tmdbClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  params: {
    api_key: API_KEY,
    language: 'tr-TR', // Varsayılan dil, LanguageContext tarafından ezilecek
  },
});

export const setTMDBLanguage = (langCode) => {
  if (tmdbClient.defaults.params) {
    tmdbClient.defaults.params.language = langCode;
  }
};

const requestTmdb = async (url, params = {}, { throwOnError = false, fallback = [] } = {}) => {
  if (!isApiKeyConfigured()) {
    const err = new Error('MISSING_TMDB_API_KEY');
    err.code = 'MISSING_TMDB_API_KEY';
    if (throwOnError) throw err;
    console.error('TMDB API anahtarı eksik.');
    return fallback;
  }

  try {
    const response = await tmdbClient.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`TMDB isteği başarısız (${url}):`, error?.message || error);
    if (throwOnError) throw error;
    return fallback;
  }
};

/**
 * Kullanıcının aradığı kelimeye göre filmleri getirir
 */
export const searchMovies = async (query, options = {}) => {
  const data = await requestTmdb('/search/movie', { query }, { ...options, fallback: null });
  return data?.results || [];
};

export const searchActors = async (query, options = {}) => {
  const data = await requestTmdb('/search/person', { query }, { ...options, fallback: null });
  return data?.results || [];
};

/**
 * Belirli bir filmin detaylarını getirir (Ekstra bilgileriyle)
 */
export const getMovieDetails = async (movieId, options = {}) => {
  const data = await requestTmdb(
    `/movie/${movieId}`,
    {
      append_to_response: 'credits,release_dates,images,videos,recommendations,similar',
      include_image_language: 'tr,en,null',
    },
    { ...options, fallback: null }
  );

  if (!data) return null;

  // Eğer dil Türkçe ise ve özet boşsa, İngilizce özeti çekip üzerine yazalım (Yedek mekanizması)
  const currentLang = tmdbClient.defaults.params.language || 'tr-TR';
  if ((!data.overview || data.overview.trim() === '') && currentLang.startsWith('tr')) {
    try {
      const enResponse = await axios.get(`${BASE_URL}/movie/${movieId}`, {
        timeout: 10000,
        params: {
          api_key: API_KEY,
          language: 'en-US',
        },
      });
      if (enResponse.data?.overview) {
        data.overview = enResponse.data.overview;
      }
    } catch (enError) {
      console.error('İngilizce özet çekilirken hata:', enError?.message || enError);
    }
  }

  return data;
};

/**
 * Yeni Çıkan (Vizyondaki) Filmleri getirir
 */
export const getNowPlayingMovies = async (page = 1, options = {}) => {
  const data = await requestTmdb('/movie/now_playing', { page }, { ...options, fallback: null });
  return data?.results || [];
};

/**
 * En Çok Oy Alan Filmleri getirir
 */
export const getTopRatedMovies = async (page = 1, options = {}) => {
  const data = await requestTmdb('/movie/top_rated', { page }, { ...options, fallback: null });
  return data?.results || [];
};

/**
 * Belirli bir kategoriye (Genre) göre filmleri getirir
 */
export const getMoviesByGenre = async (genreId, page = 1, options = {}) => {
  const data = await requestTmdb('/discover/movie', { with_genres: genreId, page }, { ...options, fallback: null });
  return data?.results || [];
};

/**
 * Keşfet (Trending) Filmlerini getirir
 */
export const getTrendingMovies = async (page = 1, options = {}) => {
  const data = await requestTmdb('/trending/movie/week', { page }, { ...options, fallback: null });
  return data?.results || [];
};

/**
 * Bir oyuncunun oynadığı filmleri getirir
 */
export const getActorMovies = async (personId, options = {}) => {
  const data = await requestTmdb(`/person/${personId}/movie_credits`, {}, { ...options, fallback: null });
  return data?.cast || [];
};

/**
 * Bir oyuncunun detaylı kişisel bilgilerini getirir
 */
export const getActorDetails = async (personId, options = {}) => {
  return requestTmdb(`/person/${personId}`, {}, { ...options, fallback: null });
};

/**
 * Filmin nerede izlenebileceğini (Yayın platformlarını) getirir
 */
export const getWatchProviders = async (movieId, options = {}) => {
  const data = await requestTmdb(`/movie/${movieId}/watch/providers`, {}, { ...options, fallback: null });
  return data?.results || {};
};

/**
 * Bir filme benzer / önerilen filmleri getirir
 */
export const getSimilarMovies = async (movieId, options = {}) => {
  const data = await requestTmdb(`/movie/${movieId}/recommendations`, {}, { ...options, fallback: null });
  if (data?.results?.length > 0) {
    return data.results;
  }
  const fallbackData = await requestTmdb(`/movie/${movieId}/similar`, {}, { ...options, fallback: null });
  return fallbackData?.results || [];
};

/**
 * Pek Yakında (Henüz Vizyona Girmemiş) Filmleri getirir
 */
export const getUpcomingMovies = async (page = 1, options = {}) => {
  const today = new Date().toISOString().split('T')[0];
  const data = await requestTmdb(
    '/discover/movie',
    {
      'primary_release_date.gte': today,
      sort_by: 'popularity.desc',
      page,
    },
    { ...options, fallback: null }
  );

  let results = (data?.results || []).filter(
    (movie) => movie.release_date && movie.release_date > today
  );

  if (results.length < 5) {
    const upcomingData = await requestTmdb('/movie/upcoming', { page }, { fallback: null });
    const rawUpcoming = (upcomingData?.results || []).filter(
      (movie) => movie.release_date && movie.release_date > today
    );
    const combined = [...results, ...rawUpcoming];
    results = Array.from(new Map(combined.map((m) => [m.id, m])).values());
  }

  return results;
};

/**
 * Yeni Çıkan Filmleri getirir (Son 60 gün içinde yayınlanmış)
 */
export const getNewReleases = async (page = 1, options = {}) => {
  const today = new Date().toISOString().split('T')[0];
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await requestTmdb(
    '/discover/movie',
    {
      'primary_release_date.gte': sixtyDaysAgo,
      'primary_release_date.lte': today,
      sort_by: 'popularity.desc',
      page,
    },
    { ...options, fallback: null }
  );
  return data?.results || [];
};

/**
 * Popüler Oyuncuları getirir
 */
export const getPopularActors = async (page = 1, options = {}) => {
  const data = await requestTmdb('/person/popular', { page }, { ...options, fallback: null });
  return data?.results || [];
};
