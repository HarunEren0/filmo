import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

// Film listeleri SQLite'ta film başına ayrı satırda tutulur; böylece tüm listenin
// tek bir AsyncStorage değerine sığması gerekmez.
const WATCHED_MOVIES_KEY = '@watched_movies';
const WATCHLIST_KEY = '@watchlist';
const DATABASE_NAME = 'filmo.db';
const LIST_TABLE = 'movie_lists';
const MIGRATION_KEY = 'movie_lists_v1_migrated';

let databasePromise;

const compactMovie = (movie, listType) => {
  const fields = ['id', 'title', 'name', 'poster_path', 'release_date', 'vote_average'];
  if (listType === 'watched') {
    fields.push('runtime', 'userRating', 'userReview', 'watchedAt');
  }
  return Object.fromEntries(fields.filter(key => movie?.[key] !== undefined).map(key => [key, movie[key]]));
};

const parseLegacyList = async key => {
  const value = await AsyncStorage.getItem(key);
  if (!value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.filter(movie => movie && movie.id != null) : [];
};

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS ${LIST_TABLE} (
          list_type TEXT NOT NULL,
          movie_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          movie_json TEXT NOT NULL,
          PRIMARY KEY (list_type, movie_id)
        );
        CREATE TABLE IF NOT EXISTS app_metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);

      const migration = await db.getFirstAsync(
        'SELECT value FROM app_metadata WHERE key = ?', MIGRATION_KEY
      );
      if (!migration) {
        const watched = await parseLegacyList(WATCHED_MOVIES_KEY);
        const watchlist = await parseLegacyList(WATCHLIST_KEY);
        await db.withTransactionAsync(async () => {
          for (const [listType, movies] of [['watched', watched], ['watchlist', watchlist]]) {
            for (let index = 0; index < movies.length; index += 1) {
              const movie = compactMovie(movies[index], listType);
              await db.runAsync(
                `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(list_type, movie_id) DO NOTHING`,
                listType, String(movie.id), movies.length - index, JSON.stringify(movie)
              );
            }
          }
          await db.runAsync('INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)', MIGRATION_KEY, '1');
        });
        // Clear legacy copies only after the full database migration commits.
        await AsyncStorage.multiRemove([WATCHED_MOVIES_KEY, WATCHLIST_KEY]);
      }
      return db;
    })().catch(error => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
};

const readMovieList = async listType => {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT movie_json FROM ${LIST_TABLE} WHERE list_type = ? ORDER BY position DESC`, listType
  );
  return rows.map(row => JSON.parse(row.movie_json));
};

const addMovieToList = async (listType, movieData) => {
  const db = await getDatabase();
  const movie = compactMovie(movieData, listType);
  if (movie.id == null) return false;
  const existing = await db.getFirstAsync(
    `SELECT movie_id FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`, listType, String(movie.id)
  );
  if (existing) return false;
  const row = await db.getFirstAsync(
    `SELECT COALESCE(MAX(position), 0) AS max_position FROM ${LIST_TABLE} WHERE list_type = ?`, listType
  );
  await db.runAsync(
    `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
    listType, String(movie.id), (row?.max_position || 0) + 1, JSON.stringify(movie)
  );
  return true;
};

/**
 * Filmi "İzledim" olarak kaydeder
 */
export const saveWatchedMovie = async (movieData) => {
  try {
    return await addMovieToList('watched', movieData);
  } catch (error) {
    console.error('Film kaydedilemedi:', error);
    return false;
  }
};

/**
 * İzlenen filmlerin listesini getirir
 */
export const getWatchedMovies = async () => {
  try {
    return await readMovieList('watched');
  } catch (error) {
    console.error('Filmler getirilemedi:', error);
    return [];
  }
};

/**
 * Filmi "İzlenecekler" (Watchlist) listesine kaydeder
 */
export const saveToWatchlist = async (movieData) => {
  try {
    return await addMovieToList('watchlist', movieData);
  } catch (error) {
    console.error('İzleneceklere eklenemedi:', error);
    return false;
  }
};

/**
 * İzlenecek filmlerin listesini getirir
 */
export const getWatchlist = async () => {
  try {
    return await readMovieList('watchlist');
  } catch (error) {
    console.error('İzlenecekler getirilemedi:', error);
    return [];
  }
};

/**
 * Bir filmi izlenenler listesinden siler
 */
export const removeWatchedMovie = async (movieId) => {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`, 'watched', String(movieId));
    return true;
  } catch (error) {
    console.error('Film silinemedi:', error);
    return false;
  }
};

export const updateWatchedMovie = async (movieId, updates) => {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT movie_json FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`, 'watched', String(movieId)
    );
    if (!row) return false;
    const movie = { ...JSON.parse(row.movie_json), ...updates };
    await db.runAsync(
      `UPDATE ${LIST_TABLE} SET movie_json = ? WHERE list_type = ? AND movie_id = ?`,
      JSON.stringify(movie), 'watched', String(movieId)
    );
    return true;
  } catch (error) {
    console.error('İzlenen film güncellenemedi:', error);
    return false;
  }
};

// --- YENİ: Profil İşlemleri ---
const USER_PROFILE_KEY = '@user_profile';

export const saveUserProfile = async (profileData) => {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
    return true;
  } catch (error) {
    console.error('Profil kaydedilemedi:', error);
    return false;
  }
};

export const getUserProfile = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Profil getirilemedi:', error);
    return null;
  }
};

/**
 * Bir filmi izlenecekler listesinden siler
 */
export const removeFromWatchlist = async (movieId) => {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`, 'watchlist', String(movieId));
    return true;
  } catch (error) {
    console.error('İzleneceklerden silinemedi:', error);
    return false;
  }
};

// --- YENİ: ÖZEL LİSTELER (CUSTOM LISTS) ---
const CUSTOM_LISTS_KEY = '@custom_lists';

export const getCustomLists = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CUSTOM_LISTS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Özel listeler getirilemedi:', error);
    return [];
  }
};

export const createCustomList = async (listName) => {
  try {
    const lists = await getCustomLists();
    const newList = {
      id: Date.now().toString(),
      name: listName,
      movies: []
    };
    lists.push(newList);
    await AsyncStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
    return newList;
  } catch (error) {
    console.error('Özel liste oluşturulamadı:', error);
    return null;
  }
};

export const deleteCustomList = async (listId) => {
  try {
    const lists = await getCustomLists();
    const updatedLists = lists.filter(list => list.id !== listId);
    await AsyncStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(updatedLists));
    return true;
  } catch (error) {
    console.error('Özel liste silinemedi:', error);
    return false;
  }
};

export const addMovieToCustomList = async (listId, movie) => {
  try {
    const lists = await getCustomLists();
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex > -1) {
      // Film zaten ekli mi kontrol et
      const isAlreadyAdded = lists[listIndex].movies.some(m => m.id === movie.id);
      if (isAlreadyAdded) return false;
      
      lists[listIndex].movies.push(movie);
      await AsyncStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Film özel listeye eklenemedi:', error);
    return false;
  }
};

export const removeMovieFromCustomList = async (listId, movieId) => {
  try {
    const lists = await getCustomLists();
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex > -1) {
      lists[listIndex].movies = lists[listIndex].movies.filter(m => m.id !== movieId);
      await AsyncStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Film özel listeden silinemedi:', error);
    return false;
  }
};

// --- YENİ: FAVORİLER SİSTEMİ ---
const FAVORITES_KEY = '@favorites';

export const getFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Favoriler getirilemedi:', error);
    return [];
  }
};

export const addToFavorites = async (movie) => {
  try {
    const existing = await getFavorites();
    const isAdded = existing.some(m => m.id === movie.id);
    if (!isAdded) {
      existing.push(movie);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(existing));
      return true;
    }
    return false; // Zaten var
  } catch (error) {
    console.error('Favorilere eklenemedi:', error);
    return false;
  }
};

export const removeFromFavorites = async (movieId) => {
  try {
    const existing = await getFavorites();
    const updated = existing.filter(m => m.id !== movieId);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Favorilerden çıkarılamadı:', error);
    return false;
  }
};

// --- YENİ: PROFİL GÜNCELLEME ---
export const updateUserProfile = async (updates) => {
  try {
    const current = await getUserProfile();
    const newProfile = { ...current, ...updates };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile));
    return newProfile;
  } catch (error) {
    console.error('Profil güncellenemedi:', error);
    return null;
  }
};



