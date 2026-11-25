import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { compactMovie, validateBackupPayload } from '../utils/movieHelpers';

// Tüm film listeleri (watched, watchlist, favorites ve custom lists) SQLite'ta saklanır.
// Legacy AsyncStorage anahtarları tek seferlik otomatik migration ile SQLite'a taşınır.
const WATCHED_MOVIES_KEY = '@watched_movies';
const WATCHLIST_KEY = '@watchlist';
const FAVORITES_KEY = '@favorites';
const CUSTOM_LISTS_KEY = '@custom_lists';
const USER_PROFILE_KEY = '@user_profile';

const DATABASE_NAME = 'filmo.db';
const LIST_TABLE = 'movie_lists';
const CUSTOM_LISTS_TABLE = 'custom_lists';
const CUSTOM_LIST_MOVIES_TABLE = 'custom_list_movies';
const MIGRATION_V1_KEY = 'movie_lists_v1_migrated';
const MIGRATION_V2_KEY = 'movie_lists_v2_migrated';

let databasePromise;

const parseLegacyArray = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Legacy anahtar okunamadı (${key}):`, error);
    return [];
  }
};

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS ${LIST_TABLE} (
          list_type TEXT NOT NULL,
          movie_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          movie_json TEXT NOT NULL,
          PRIMARY KEY (list_type, movie_id)
        );
        CREATE TABLE IF NOT EXISTS ${CUSTOM_LISTS_TABLE} (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${CUSTOM_LIST_MOVIES_TABLE} (
          list_id TEXT NOT NULL,
          movie_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          movie_json TEXT NOT NULL,
          PRIMARY KEY (list_id, movie_id),
          FOREIGN KEY (list_id) REFERENCES ${CUSTOM_LISTS_TABLE}(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS app_metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);

      // v1 Migration: watched + watchlist -> SQLite
      const migrationV1 = await db.getFirstAsync(
        'SELECT value FROM app_metadata WHERE key = ?',
        MIGRATION_V1_KEY
      );
      if (!migrationV1) {
        const watched = (await parseLegacyArray(WATCHED_MOVIES_KEY)).filter(
          (movie) => movie && movie.id != null
        );
        const watchlist = (await parseLegacyArray(WATCHLIST_KEY)).filter(
          (movie) => movie && movie.id != null
        );
        await db.withTransactionAsync(async () => {
          for (const [listType, movies] of [
            ['watched', watched],
            ['watchlist', watchlist],
          ]) {
            for (let index = 0; index < movies.length; index += 1) {
              const movie = compactMovie(movies[index], listType);
              await db.runAsync(
                `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(list_type, movie_id) DO NOTHING`,
                listType,
                String(movie.id),
                movies.length - index,
                JSON.stringify(movie)
              );
            }
          }
          await db.runAsync(
            'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
            MIGRATION_V1_KEY,
            '1'
          );
        });
        await AsyncStorage.multiRemove([WATCHED_MOVIES_KEY, WATCHLIST_KEY]);
      }

      // v2 Migration: favorites + custom_lists -> SQLite (compactMovie ile sadeleştirilerek)
      const migrationV2 = await db.getFirstAsync(
        'SELECT value FROM app_metadata WHERE key = ?',
        MIGRATION_V2_KEY
      );
      if (!migrationV2) {
        const favorites = (await parseLegacyArray(FAVORITES_KEY)).filter(
          (movie) => movie && movie.id != null
        );
        const customLists = (await parseLegacyArray(CUSTOM_LISTS_KEY)).filter(
          (list) => list && list.id != null && typeof list.name === 'string'
        );
        await db.withTransactionAsync(async () => {
          for (let index = 0; index < favorites.length; index += 1) {
            const movie = compactMovie(favorites[index], 'favorites');
            await db.runAsync(
              `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(list_type, movie_id) DO NOTHING`,
              'favorites',
              String(movie.id),
              index + 1,
              JSON.stringify(movie)
            );
          }

          for (let listIndex = 0; listIndex < customLists.length; listIndex += 1) {
            const list = customLists[listIndex];
            const listId = String(list.id);
            await db.runAsync(
              `INSERT INTO ${CUSTOM_LISTS_TABLE} (id, name, created_at)
               VALUES (?, ?, ?)
               ON CONFLICT(id) DO NOTHING`,
              listId,
              list.name,
              Number(list.id) || Date.now() + listIndex
            );
            const movies = Array.isArray(list.movies) ? list.movies : [];
            for (let mIndex = 0; mIndex < movies.length; mIndex += 1) {
              if (!movies[mIndex] || movies[mIndex].id == null) continue;
              const movie = compactMovie(movies[mIndex], 'custom');
              await db.runAsync(
                `INSERT INTO ${CUSTOM_LIST_MOVIES_TABLE} (list_id, movie_id, position, movie_json)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(list_id, movie_id) DO NOTHING`,
                listId,
                String(movie.id),
                mIndex + 1,
                JSON.stringify(movie)
              );
            }
          }

          await db.runAsync(
            'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
            MIGRATION_V2_KEY,
            '1'
          );
        });
        await AsyncStorage.multiRemove([FAVORITES_KEY, CUSTOM_LISTS_KEY]);
      }

      return db;
    })().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
};

const readMovieList = async (listType) => {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT movie_json FROM ${LIST_TABLE} WHERE list_type = ? ORDER BY position DESC`,
    listType
  );
  return rows.map((row) => JSON.parse(row.movie_json));
};

const addMovieToList = async (listType, movieData) => {
  const db = await getDatabase();
  const movie = compactMovie(movieData, listType);
  if (movie.id == null) return false;
  const existing = await db.getFirstAsync(
    `SELECT movie_id FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
    listType,
    String(movie.id)
  );
  if (existing) return false;
  const row = await db.getFirstAsync(
    `SELECT COALESCE(MAX(position), 0) AS max_position FROM ${LIST_TABLE} WHERE list_type = ?`,
    listType
  );
  await db.runAsync(
    `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
    listType,
    String(movie.id),
    (row?.max_position || 0) + 1,
    JSON.stringify(movie)
  );
  return true;
};

const removeMovieFromList = async (listType, movieId) => {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
    listType,
    String(movieId)
  );
  return true;
};

// --- İZLENENLER (WATCHED) ---

/**
 * Filmi "İzledim" olarak kaydeder.
 * Varsayılan olarak İzlenecekler (watchlist) listesindeyse otomatik çıkarır.
 */
export const saveWatchedMovie = async (movieData, options = {}) => {
  const { removeFromWatchlistIfPresent = true } = options;
  try {
    const db = await getDatabase();
    const movie = compactMovie(movieData, 'watched');
    if (movie.id == null) return false;

    const existing = await db.getFirstAsync(
      `SELECT movie_id FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
      'watched',
      String(movie.id)
    );
    if (existing) return false;

    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync(
        `SELECT COALESCE(MAX(position), 0) AS max_position FROM ${LIST_TABLE} WHERE list_type = ?`,
        'watched'
      );
      await db.runAsync(
        `INSERT INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
        'watched',
        String(movie.id),
        (row?.max_position || 0) + 1,
        JSON.stringify(movie)
      );
      if (removeFromWatchlistIfPresent) {
        await db.runAsync(
          `DELETE FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
          'watchlist',
          String(movie.id)
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Film kaydedilemedi:', error);
    return false;
  }
};

export const getWatchedMovies = async () => {
  try {
    return await readMovieList('watched');
  } catch (error) {
    console.error('Filmler getirilemedi:', error);
    return [];
  }
};

export const getWatchedMovie = async (movieId) => {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT movie_json FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
      'watched',
      String(movieId)
    );
    return row ? JSON.parse(row.movie_json) : null;
  } catch (error) {
    console.error('İzlenen film bilgisi getirilemedi:', error);
    return null;
  }
};

export const removeWatchedMovie = async (movieId) => {
  try {
    return await removeMovieFromList('watched', movieId);
  } catch (error) {
    console.error('Film silinemedi:', error);
    return false;
  }
};

export const updateWatchedMovie = async (movieId, updates) => {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT movie_json FROM ${LIST_TABLE} WHERE list_type = ? AND movie_id = ?`,
      'watched',
      String(movieId)
    );
    if (!row) return false;
    const movie = compactMovie({ ...JSON.parse(row.movie_json), ...updates }, 'watched');
    await db.runAsync(
      `UPDATE ${LIST_TABLE} SET movie_json = ? WHERE list_type = ? AND movie_id = ?`,
      JSON.stringify(movie),
      'watched',
      String(movieId)
    );
    return true;
  } catch (error) {
    console.error('İzlenen film güncellenemedi:', error);
    return false;
  }
};

// --- İZLENECEKLER (WATCHLIST) ---

export const saveToWatchlist = async (movieData) => {
  try {
    return await addMovieToList('watchlist', movieData);
  } catch (error) {
    console.error('İzleneceklere eklenemedi:', error);
    return false;
  }
};

export const getWatchlist = async () => {
  try {
    return await readMovieList('watchlist');
  } catch (error) {
    console.error('İzlenecekler getirilemedi:', error);
    return [];
  }
};

export const removeFromWatchlist = async (movieId) => {
  try {
    return await removeMovieFromList('watchlist', movieId);
  } catch (error) {
    console.error('İzleneceklerden silinemedi:', error);
    return false;
  }
};

// --- FAVORİLER (SQLite) ---

export const getFavorites = async () => {
  try {
    return await readMovieList('favorites');
  } catch (error) {
    console.error('Favoriler getirilemedi:', error);
    return [];
  }
};

export const addToFavorites = async (movie) => {
  try {
    return await addMovieToList('favorites', movie);
  } catch (error) {
    console.error('Favorilere eklenemedi:', error);
    return false;
  }
};

export const removeFromFavorites = async (movieId) => {
  try {
    return await removeMovieFromList('favorites', movieId);
  } catch (error) {
    console.error('Favorilerden çıkarılamadı:', error);
    return false;
  }
};

// --- ÖZEL LİSTELER (CUSTOM LISTS - SQLite) ---

export const getCustomLists = async () => {
  try {
    const db = await getDatabase();
    const lists = await db.getAllAsync(
      `SELECT id, name, created_at FROM ${CUSTOM_LISTS_TABLE} ORDER BY created_at ASC`
    );
    if (lists.length === 0) return [];

    const movieRows = await db.getAllAsync(
      `SELECT list_id, movie_json FROM ${CUSTOM_LIST_MOVIES_TABLE} ORDER BY position DESC`
    );
    const moviesByList = new Map();
    for (const row of movieRows) {
      if (!moviesByList.has(row.list_id)) {
        moviesByList.set(row.list_id, []);
      }
      moviesByList.get(row.list_id).push(JSON.parse(row.movie_json));
    }

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      movies: moviesByList.get(list.id) || [],
    }));
  } catch (error) {
    console.error('Özel listeler getirilemedi:', error);
    return [];
  }
};

export const createCustomList = async (listName) => {
  try {
    const db = await getDatabase();
    const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = Date.now();
    await db.runAsync(
      `INSERT INTO ${CUSTOM_LISTS_TABLE} (id, name, created_at) VALUES (?, ?, ?)`,
      id,
      listName,
      createdAt
    );
    return { id, name: listName, movies: [] };
  } catch (error) {
    console.error('Özel liste oluşturulamadı:', error);
    return null;
  }
};

export const deleteCustomList = async (listId) => {
  try {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM ${CUSTOM_LIST_MOVIES_TABLE} WHERE list_id = ?`, String(listId));
      await db.runAsync(`DELETE FROM ${CUSTOM_LISTS_TABLE} WHERE id = ?`, String(listId));
    });
    return true;
  } catch (error) {
    console.error('Özel liste silinemedi:', error);
    return false;
  }
};

export const addMovieToCustomList = async (listId, movieData) => {
  try {
    const db = await getDatabase();
    const movie = compactMovie(movieData, 'custom');
    if (movie.id == null) return false;

    const existing = await db.getFirstAsync(
      `SELECT movie_id FROM ${CUSTOM_LIST_MOVIES_TABLE} WHERE list_id = ? AND movie_id = ?`,
      String(listId),
      String(movie.id)
    );
    if (existing) return false;

    const row = await db.getFirstAsync(
      `SELECT COALESCE(MAX(position), 0) AS max_position FROM ${CUSTOM_LIST_MOVIES_TABLE} WHERE list_id = ?`,
      String(listId)
    );
    await db.runAsync(
      `INSERT INTO ${CUSTOM_LIST_MOVIES_TABLE} (list_id, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
      String(listId),
      String(movie.id),
      (row?.max_position || 0) + 1,
      JSON.stringify(movie)
    );
    return true;
  } catch (error) {
    console.error('Film özel listeye eklenemedi:', error);
    return false;
  }
};

export const removeMovieFromCustomList = async (listId, movieId) => {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM ${CUSTOM_LIST_MOVIES_TABLE} WHERE list_id = ? AND movie_id = ?`,
      String(listId),
      String(movieId)
    );
    return true;
  } catch (error) {
    console.error('Film özel listeden silinemedi:', error);
    return false;
  }
};

/**
 * Tek bir filmin tüm listelerdeki durumunu tek seferde getirir.
 */
export const getMovieListStatus = async (movieId) => {
  try {
    const db = await getDatabase();
    const idStr = String(movieId);
    const listRows = await db.getAllAsync(
      `SELECT list_type, movie_json FROM ${LIST_TABLE} WHERE movie_id = ?`,
      idStr
    );
    const customRows = await db.getAllAsync(
      `SELECT list_id FROM ${CUSTOM_LIST_MOVIES_TABLE} WHERE movie_id = ?`,
      idStr
    );

    let watchedMovie = null;
    let inWatchlist = false;
    let isFavorite = false;

    for (const row of listRows) {
      if (row.list_type === 'watched') watchedMovie = JSON.parse(row.movie_json);
      if (row.list_type === 'watchlist') inWatchlist = true;
      if (row.list_type === 'favorites') isFavorite = true;
    }

    return {
      watchedMovie,
      inWatchlist,
      isFavorite,
      customListIds: customRows.map((row) => row.list_id),
    };
  } catch (error) {
    console.error('Film liste durumu alınamadı:', error);
    return {
      watchedMovie: null,
      inWatchlist: false,
      isFavorite: false,
      customListIds: [],
    };
  }
};

// --- PROFİL İŞLEMLERİ ---

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

// --- YEDEKLEME / GERİ YÜKLEME (BACKUP & RESTORE) ---

export const exportBackupData = async () => {
  const [profile, watched, watchlist, favorites, customLists] = await Promise.all([
    getUserProfile(),
    getWatchedMovies(),
    getWatchlist(),
    getFavorites(),
    getCustomLists(),
  ]);

  return {
    app: 'Filmo',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    watched,
    watchlist,
    favorites,
    customLists,
  };
};

export const importBackupData = async (rawInput) => {
  try {
    const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    const validation = validateBackupPayload(parsed);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      if (Array.isArray(parsed.watched)) {
        await db.runAsync(`DELETE FROM ${LIST_TABLE} WHERE list_type = ?`, 'watched');
        for (let i = 0; i < parsed.watched.length; i += 1) {
          const movie = compactMovie(parsed.watched[i], 'watched');
          if (movie.id == null) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
            'watched',
            String(movie.id),
            parsed.watched.length - i,
            JSON.stringify(movie)
          );
        }
      }

      if (Array.isArray(parsed.watchlist)) {
        await db.runAsync(`DELETE FROM ${LIST_TABLE} WHERE list_type = ?`, 'watchlist');
        for (let i = 0; i < parsed.watchlist.length; i += 1) {
          const movie = compactMovie(parsed.watchlist[i], 'watchlist');
          if (movie.id == null) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
            'watchlist',
            String(movie.id),
            parsed.watchlist.length - i,
            JSON.stringify(movie)
          );
        }
      }

      if (Array.isArray(parsed.favorites)) {
        await db.runAsync(`DELETE FROM ${LIST_TABLE} WHERE list_type = ?`, 'favorites');
        for (let i = 0; i < parsed.favorites.length; i += 1) {
          const movie = compactMovie(parsed.favorites[i], 'favorites');
          if (movie.id == null) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${LIST_TABLE} (list_type, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
            'favorites',
            String(movie.id),
            parsed.favorites.length - i,
            JSON.stringify(movie)
          );
        }
      }

      if (Array.isArray(parsed.customLists)) {
        await db.runAsync(`DELETE FROM ${CUSTOM_LIST_MOVIES_TABLE}`);
        await db.runAsync(`DELETE FROM ${CUSTOM_LISTS_TABLE}`);
        for (let li = 0; li < parsed.customLists.length; li += 1) {
          const list = parsed.customLists[li];
          const listId = String(list.id || `${Date.now()}-${li}`);
          await db.runAsync(
            `INSERT INTO ${CUSTOM_LISTS_TABLE} (id, name, created_at) VALUES (?, ?, ?)`,
            listId,
            list.name,
            Date.now() + li
          );
          for (let mi = 0; mi < list.movies.length; mi += 1) {
            const movie = compactMovie(list.movies[mi], 'custom');
            if (movie.id == null) continue;
            await db.runAsync(
              `INSERT OR REPLACE INTO ${CUSTOM_LIST_MOVIES_TABLE} (list_id, movie_id, position, movie_json) VALUES (?, ?, ?, ?)`,
              listId,
              String(movie.id),
              list.movies.length - mi,
              JSON.stringify(movie)
            );
          }
        }
      }
    });

    if (parsed.profile && parsed.profile.name) {
      await saveUserProfile(parsed.profile);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Yedek geri yüklenemedi:', error);
    return { success: false, error: 'parse_or_write_error' };
  }
};
