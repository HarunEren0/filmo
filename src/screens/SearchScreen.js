import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  searchMovies,
  searchActors,
  getTrendingMovies,
  getMoviesByGenre,
  IMAGE_BASE_URL,
} from '../services/tmdb';
import { LanguageContext } from '../context/LanguageContext';
import { dedupeMoviesById } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

const getGenres = () => [
  { id: null, name: i18n.t('discover') },
  { id: 28, name: i18n.t('action') },
  { id: 35, name: i18n.t('comedy') },
  { id: 878, name: i18n.t('sci_fi') },
  { id: 27, name: i18n.t('horror') },
  { id: 10749, name: i18n.t('romance') },
  { id: 18, name: i18n.t('drama') },
  { id: 16, name: i18n.t('animation') },
];

export default function SearchScreen({ navigation }) {
  const { language } = useContext(LanguageContext);

  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [actors, setActors] = useState([]);
  const [searchType, setSearchType] = useState('movies');
  const [searchError, setSearchError] = useState(false);

  // Keşfet State'leri
  const [trending, setTrending] = useState([]);
  const [trendingPage, setTrendingPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [discoverError, setDiscoverError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtre State'leri
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const searchRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchMoreDiscover = useCallback(async (pageToFetch, genreId) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const newMovies = genreId
        ? await getMoviesByGenre(genreId, pageToFetch, { throwOnError: true })
        : await getTrendingMovies(pageToFetch, { throwOnError: true });

      setDiscoverError(false);
      if (newMovies.length > 0) {
        if (pageToFetch === 1) {
          setTrending(dedupeMoviesById([], newMovies));
        } else {
          setTrending((prev) => dedupeMoviesById(prev, newMovies));
        }
        setTrendingPage(pageToFetch);
      }
    } catch {
      if (pageToFetch === 1) setDiscoverError(true);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  // Kategori veya dil değiştiğinde keşfet listesini sıfırla ve yeniden çek
  useEffect(() => {
    setTrending([]);
    setTrendingPage(1);
    loadingMoreRef.current = false;
    fetchMoreDiscover(1, selectedGenre);
  }, [selectedGenre, language, fetchMoreDiscover]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (query.trim().length > 1) {
      const requestId = ++searchRequestRef.current;
      try {
        const [movieResults, actorResults] = await Promise.all([
          searchMovies(query, { throwOnError: true }),
          searchActors(query, { throwOnError: true }),
        ]);
        if (requestId === searchRequestRef.current) {
          setMovies(movieResults);
          setActors(actorResults);
          setSearchError(false);
        }
      } catch {
        if (requestId === searchRequestRef.current) {
          setSearchError(true);
        }
      }
    } else {
      loadingMoreRef.current = false;
      await fetchMoreDiscover(1, selectedGenre);
    }
    setRefreshing(false);
  };

  const isSearchActive = query.trim().length > 1;

  const handleEndReached = () => {
    if (!isSearchActive && !loadingMoreRef.current) {
      fetchMoreDiscover(trendingPage + 1, selectedGenre);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  // Race-condition korumalı canlı arama
  useEffect(() => {
    const requestId = ++searchRequestRef.current;

    if (query.trim().length <= 1) {
      setMovies([]);
      setActors([]);
      setSearchError(false);
      setLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      setSearchError(false);
      try {
        const [movieResults, actorResults] = await Promise.all([
          searchMovies(query, { throwOnError: true }),
          searchActors(query, { throwOnError: true }),
        ]);
        if (requestId === searchRequestRef.current) {
          setMovies(movieResults);
          setActors(actorResults);
          setSearchError(false);
          setLoading(false);
        }
      } catch {
        if (requestId === searchRequestRef.current) {
          setMovies([]);
          setActors([]);
          setSearchError(true);
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(delayDebounceFn);
      searchRequestRef.current += 1;
    };
  }, [query, language]);

  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => navigation.navigate('Details', { movieId: item.id })}
    >
      {item.poster_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
      ) : (
        <View style={styles.noPoster}>
          <Text style={styles.noPosterText}>{i18n.t('none')}</Text>
        </View>
      )}

      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.movieDate}>{item.release_date?.split('-')[0] || i18n.t('no_date')}</Text>
        <Text style={styles.movieRating}>⭐ {item.vote_average?.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderDiscoverItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => navigation.navigate('Details', { movieId: item.id })}
    >
      {item.poster_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.gridImage} />
      ) : (
        <View style={styles.gridNoImage}>
          <Text style={styles.noPosterText}>{i18n.t('none')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderActorItem = ({ item }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() =>
        navigation.navigate('Actor', {
          actorId: item.id,
          actorName: item.name,
          actorPhoto: item.profile_path,
        })
      }
    >
      {item.profile_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }} style={styles.poster} />
      ) : (
        <View style={styles.noPoster}>
          <Text style={styles.noPosterText}>{i18n.t('none')}</Text>
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.movieDate}>{item.known_for_department || i18n.t('cast')}</Text>
        <Text style={styles.movieRating} numberOfLines={2}>
          {(item.known_for || [])
            .map((m) => m.title || m.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const genres = getGenres();
  const currentGenreName = genres.find((g) => g.id === selectedGenre)?.name || i18n.t('discover');

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={i18n.t('search_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : isSearchActive ? (
        <>
          <View style={styles.searchTabs}>
            {['movies', 'actors'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSearchType(type)}
                style={[styles.searchTab, searchType === type && styles.searchTabActive]}
              >
                <Text
                  style={[styles.searchTabText, searchType === type && styles.searchTabTextActive]}
                >
                  {i18n.t(type === 'movies' ? 'movies' : 'actors')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={searchType === 'movies' ? movies : actors}
            keyExtractor={(item) => String(item.id)}
            renderItem={searchType === 'movies' ? renderSearchResultItem : renderActorItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchError ? i18n.t('load_error') : i18n.t('no_results')}
              </Text>
            }
          />
        </>
      ) : (
        <View style={styles.discoverContainer}>
          <View style={styles.discoverHeader}>
            <Text style={styles.discoverTitle}>{currentGenreName}</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
              <Ionicons name="filter" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={trending}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDiscoverItem}
            numColumns={4}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              !isLoadingMore && discoverError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.emptyText}>{i18n.t('load_error')}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => fetchMoreDiscover(1, selectedGenre)}
                  >
                    <Text style={styles.retryBtnText}>{i18n.t('retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        </View>
      )}

      {/* Filtre Modalı */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('category')}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {genres.map((genre) => (
              <TouchableOpacity
                key={genre.id || 'all'}
                style={[styles.genreButton, selectedGenre === genre.id && styles.genreButtonActive]}
                onPress={() => {
                  setSelectedGenre(genre.id);
                  setFilterModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.genreButtonText,
                    selectedGenre === genre.id && styles.genreButtonTextActive,
                  ]}
                >
                  {genre.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.xxl,
  },
  searchTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  searchTab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  searchTabActive: {
    borderBottomColor: COLORS.primary,
  },
  searchTabText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchTabTextActive: {
    color: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    padding: 16,
  },
  movieCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  poster: {
    width: 90,
    height: 135,
  },
  noPoster: {
    width: 90,
    height: 135,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPosterText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  movieInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  movieDate: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  movieRating: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 20,
  },
  errorBox: {
    alignItems: 'center',
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.xxl,
  },
  retryBtnText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  discoverContainer: {
    flex: 1,
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  discoverTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridItem: {
    width: '23.5%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridNoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  genreButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  genreButtonActive: {
    backgroundColor: COLORS.primary,
  },
  genreButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  genreButtonTextActive: {
    color: COLORS.textDark,
  },
});
