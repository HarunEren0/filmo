import AsyncStorage from '@react-native-async-storage/async-storage';

// Kaydedilecek verilerin anahtar kelimeleri
const WATCHED_MOVIES_KEY = '@watched_movies';
const WATCHLIST_KEY = '@watchlist';

/**
 * Filmi "İzledim" olarak kaydeder
 */
export const saveWatchedMovie = async (movieData) => {
  try {
    const existingData = await getWatchedMovies();
    // Film daha önce eklenmiş mi kontrol et
    const isExist = existingData.find(item => item.id === movieData.id);
    
    if (!isExist) {
      const updatedList = [movieData, ...existingData];
      await AsyncStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(updatedList));
      return true;
    }
    return false;
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
    const jsonValue = await AsyncStorage.getItem(WATCHED_MOVIES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
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
    const existingData = await getWatchlist();
    const isExist = existingData.find(item => item.id === movieData.id);
    
    if (!isExist) {
      const updatedList = [movieData, ...existingData];
      await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updatedList));
      return true;
    }
    return false;
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
    const jsonValue = await AsyncStorage.getItem(WATCHLIST_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
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
    const existingData = await getWatchedMovies();
    const updatedList = existingData.filter(item => item.id !== movieId);
    await AsyncStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(updatedList));
    return true;
  } catch (error) {
    console.error('Film silinemedi:', error);
    return false;
  }
};

export const updateWatchedMovie = async (movieId, updates) => {
  try {
    const existingData = await getWatchedMovies();
    if (!existingData.some(item => String(item.id) === String(movieId))) return false;
    const updatedList = existingData.map(item =>
      String(item.id) === String(movieId) ? { ...item, ...updates } : item
    );
    await AsyncStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(updatedList));
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
    const existingData = await getWatchlist();
    const updatedList = existingData.filter(item => item.id !== movieId);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updatedList));
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



