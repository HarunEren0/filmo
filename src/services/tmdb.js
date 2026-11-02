import axios from 'axios';

// TMDB API Anahtarını güvenlik için .env dosyasından çekiyoruz
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';

// Görsellerin (Kapak fotoğrafları) başındaki sabit URL
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Axios kullanarak TMDB için özel bir istemci (client) oluşturuyoruz
const tmdbClient = axios.create({
  baseURL: BASE_URL,
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

/**
 * Kullanıcının aradığı kelimeye göre filmleri getirir
 */
export const searchMovies = async (query) => {
  try {
    const response = await tmdbClient.get('/search/movie', {
      params: { query },
    });
    return response.data.results;
  } catch (error) {
    console.error('Film arama hatası:', error);
    return [];
  }
};

export const searchActors = async (query) => {
  try {
    const response = await tmdbClient.get('/search/person', { params: { query } });
    return response.data.results || [];
  } catch (error) {
    console.error('Oyuncu arama hatası:', error);
    return [];
  }
};

/**
 * Belirli bir filmin detaylarını getirir (Ekstra bilgileriyle)
 */
export const getMovieDetails = async (movieId) => {
  try {
    // credits, release_dates, images, videos, recommendations, similar verilerini tek seferde çekiyoruz
    const response = await tmdbClient.get(`/movie/${movieId}`, {
      params: {
        append_to_response: 'credits,release_dates,images,videos,recommendations,similar',
        // Resimlerin dilden bağımsız olarak daha fazla gelmesi için ek parametreler
        include_image_language: 'tr,en,null'
      }
    });

    let data = response.data;

    // Eğer dil Türkçe ise ve özet boşsa, İngilizce özeti çekip üzerine yazalım (Yedek mekanizması)
    const currentLang = tmdbClient.defaults.params.language || 'tr-TR';
    if ((!data.overview || data.overview.trim() === '') && currentLang.startsWith('tr')) {
      try {
        const enResponse = await axios.get(`${BASE_URL}/movie/${movieId}`, {
          params: {
            api_key: API_KEY,
            language: 'en-US'
          }
        });
        if (enResponse.data.overview) {
          data.overview = enResponse.data.overview;
        }
      } catch (enError) {
        console.error('İngilizce özet çekilirken hata:', enError);
      }
    }

    return data;
  } catch (error) {
    console.error('Film detay hatası:', error);
    return null;
  }
};

/**
 * Yeni Çıkan (Vizyondaki) Filmleri getirir
 */
export const getNowPlayingMovies = async (page = 1) => {
  try {
    const response = await tmdbClient.get('/movie/now_playing', { params: { page } });
    return response.data.results;
  } catch (error) {
    console.error('Yeni çıkanlar alınamadı:', error);
    return [];
  }
};

/**
 * En Çok Oy Alan Filmleri getirir
 */
export const getTopRatedMovies = async (page = 1) => {
  try {
    const response = await tmdbClient.get('/movie/top_rated', { params: { page } });
    return response.data.results;
  } catch (error) {
    console.error('Top rated alınamadı:', error);
    return [];
  }
};

/**
 * Belirli bir kategoriye (Genre) göre filmleri getirir
 */
export const getMoviesByGenre = async (genreId, page = 1) => {
  try {
    const response = await tmdbClient.get('/discover/movie', {
      params: { with_genres: genreId, page }
    });
    return response.data.results;
  } catch (error) {
    console.error('Kategori filmleri alınamadı:', error);
    return [];
  }
};

/**
 * Keşfet (Trending) Filmlerini getirir
 */
export const getTrendingMovies = async (page = 1) => {
  try {
    const response = await tmdbClient.get(`/trending/movie/week?page=${page}`);
    return response.data.results;
  } catch (error) {
    console.error('Trend filmler alınamadı:', error);
    return [];
  }
};

/**
 * Bir oyuncunun oynadığı filmleri getirir
 */
export const getActorMovies = async (personId) => {
  try {
    const response = await tmdbClient.get(`/person/${personId}/movie_credits`);
    return response.data.cast;
  } catch (error) {
    console.error('Oyuncu filmleri alınamadı:', error);
    return [];
  }
};

/**
 * Bir oyuncunun detaylı kişisel bilgilerini getirir
 */
export const getActorDetails = async (personId) => {
  try {
    const response = await tmdbClient.get(`/person/${personId}`);
    return response.data;
  } catch (error) {
    console.error('Oyuncu detayları alınamadı:', error);
    return null;
  }
};

/**
 * Filmin nerede izlenebileceğini (Yayın platformlarını) getirir
 */
export const getWatchProviders = async (movieId) => {
  try {
    const response = await tmdbClient.get(`/movie/${movieId}/watch/providers`);
    return response.data?.results || {};
  } catch (error) {
    console.error('Yayın platformları alınamadı:', error);
    return {};
  }
};

/**
 * Bir filme benzer / önerilen filmleri getirir
 */
export const getSimilarMovies = async (movieId) => {
  try {
    const response = await tmdbClient.get(`/movie/${movieId}/recommendations`);
    if (response.data?.results?.length > 0) {
      return response.data.results;
    }
    const fallbackRes = await tmdbClient.get(`/movie/${movieId}/similar`);
    return fallbackRes.data?.results || [];
  } catch (error) {
    console.error('Benzer filmler alınamadı:', error);
    return [];
  }
};

/**
 * Pek Yakında (Henüz Vizyona Girmemiş) Filmleri getirir
 * Çıkmış filmlerin görünmemesi için sadece bugünden sonraki vizyon tarihleri filtrelenir
 */
export const getUpcomingMovies = async (page = 1) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await tmdbClient.get('/discover/movie', {
      params: {
        'primary_release_date.gte': today,
        sort_by: 'popularity.desc',
        page,
      },
    });

    let results = (response.data?.results || []).filter(
      movie => movie.release_date && movie.release_date > today
    );

    // Eğer discover yetersiz kalırsa standart upcoming endpoint'inden de gelecekteki filmleri ekle
    if (results.length < 5) {
      const upcomingRes = await tmdbClient.get('/movie/upcoming', { params: { page } });
      const rawUpcoming = (upcomingRes.data?.results || []).filter(
        movie => movie.release_date && movie.release_date > today
      );
      const combined = [...results, ...rawUpcoming];
      results = Array.from(new Map(combined.map(m => [m.id, m])).values());
    }

    return results;
  } catch (error) {
    console.error('Yakında vizyona girecekler alınamadı:', error);
    return [];
  }
};

/**
 * Yeni Çıkan Filmleri getirir (Son 60 gün içinde yayınlanmış)
 */
export const getNewReleases = async (page = 1) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const response = await tmdbClient.get('/discover/movie', {
      params: {
        'primary_release_date.gte': sixtyDaysAgo,
        'primary_release_date.lte': today,
        sort_by: 'popularity.desc',
        page,
      },
    });
    return response.data?.results || [];
  } catch (error) {
    console.error('Yeni çıkanlar alınamadı:', error);
    return [];
  }
};

/**
 * Popüler Oyuncuları getirir
 */
export const getPopularActors = async (page = 1) => {
  try {
    const response = await tmdbClient.get('/person/popular', { params: { page } });
    return response.data.results;
  } catch (error) {
    console.error('Popüler oyuncular alınamadı:', error);
    return [];
  }
};

/**
 * Rastgele yüksek puanlı film getirir (Bugün Ne İzlesem? Rulet özelliği için)
 */
export const getRandomMovie = async (genreId = null) => {
  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const params = {
      'vote_average.gte': 7.0,
      'vote_count.gte': 100,
      sort_by: 'popularity.desc',
      page: randomPage,
    };
    if (genreId) {
      params.with_genres = genreId;
    }
    const response = await tmdbClient.get('/discover/movie', { params });
    const results = (response.data?.results || []).filter(m => m.poster_path);
    if (results.length > 0) {
      const randomIndex = Math.floor(Math.random() * results.length);
      return results[randomIndex];
    }
    return null;
  } catch (error) {
    console.error('Rastgele film seçilemedi:', error);
    return null;
  }
};


