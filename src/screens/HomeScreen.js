import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getNowPlayingMovies,
  getTopRatedMovies,
  getMoviesByGenre,
  getUpcomingMovies,
  getNewReleases,
  getPopularActors,
  searchMovies,
  isApiKeyConfigured,
  IMAGE_BASE_URL,
} from '../services/tmdb';
import { saveToWatchlist, removeFromWatchlist, getWatchlist } from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import { dedupeMoviesById } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import SkeletonScreen from '../components/Skeleton';
import HeroCarousel from '../components/HeroCarousel';
import MovieRow from '../components/MovieRow';
import i18n from '../services/i18n';

const getDailyPage = () => {
  const date = new Date();
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return (seed % 10) + 1;
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { language } = useContext(LanguageContext);
  const dailyPage = useRef(getDailyPage()).current;

  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [popularActors, setPopularActors] = useState([]);

  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [dramaMovies, setDramaMovies] = useState([]);
  const [animationMovies, setAnimationMovies] = useState([]);
  const [starWarsMovies, setStarWarsMovies] = useState([]);
  const [marvelMovies, setMarvelMovies] = useState([]);

  const initialPages = () => ({
    nowPlaying: 1,
    newReleases: 1,
    topRated: dailyPage,
    action: dailyPage,
    comedy: dailyPage,
    sciFi: dailyPage,
    horror: dailyPage,
    romance: dailyPage,
    drama: dailyPage,
    animation: dailyPage,
  });

  const [pages, setPages] = useState(initialPages);
  const loadingMoreRef = useRef({});
  const fetchIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [homeLoadError, setHomeLoadError] = useState(false);
  const [missingApiKey, setMissingApiKey] = useState(false);

  // Canlı Arama (Live Search) State'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchRequestRef = useRef(0);
  const [searchRetry, setSearchRetry] = useState(0);

  const syncWatchlistIds = useCallback(async () => {
    const watchlist = await getWatchlist();
    setWatchlistIds(new Set((watchlist || []).map((m) => String(m.id))));
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncWatchlistIds();
    }, [syncWatchlistIds])
  );

  const fetchMovies = useCallback(async (isRefresh = false) => {
    const currentFetchId = ++fetchIdRef.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHomeLoadError(false);

    if (!isApiKeyConfigured()) {
      setMissingApiKey(true);
      setHomeLoadError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setMissingApiKey(false);

    setPages(initialPages());
    loadingMoreRef.current = {};

    try {
      const [now, top] = await Promise.all([
        getNowPlayingMovies(1, { throwOnError: true }),
        getTopRatedMovies(dailyPage, { throwOnError: true }),
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      setNowPlaying(now);
      setTopRated(top);

      const candidates = [...now, ...top].filter((m) => m.backdrop_path);
      const uniqueFeatured = dedupeMoviesById([], candidates).slice(0, 5);
      setFeaturedMovies(uniqueFeatured);

      await syncWatchlistIds();
      setHomeLoadError(now.length === 0 && top.length === 0);
      setLoading(false);

      const [
        upcoming,
        newRel,
        actors,
        action,
        comedy,
        scifi,
        horror,
        romance,
        drama,
        animation,
        starWars,
        marvel,
      ] = await Promise.all([
        getUpcomingMovies(1),
        getNewReleases(1),
        getPopularActors(1),
        getMoviesByGenre(28, dailyPage),
        getMoviesByGenre(35, dailyPage),
        getMoviesByGenre(878, dailyPage),
        getMoviesByGenre(27, dailyPage),
        getMoviesByGenre(10749, dailyPage),
        getMoviesByGenre(18, dailyPage),
        getMoviesByGenre(16, dailyPage),
        searchMovies('Star Wars'),
        searchMovies('Marvel'),
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      setUpcomingMovies(upcoming);
      setNewReleases(newRel);
      setPopularActors(actors);
      setActionMovies(action);
      setComedyMovies(comedy);
      setSciFiMovies(scifi);
      setHorrorMovies(horror);
      setRomanceMovies(romance);
      setDramaMovies(drama);
      setAnimationMovies(animation);
      setStarWarsMovies(starWars);
      setMarvelMovies(marvel);
    } catch (error) {
      if (currentFetchId !== fetchIdRef.current) return;
      console.error('Film yükleme hatası:', error);
      setHomeLoadError(true);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dailyPage, syncWatchlistIds]);

  // İlk açılışta ve uygulama dili değiştiğinde içerikleri yeni dilde yeniden çek
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies, language]);

  const handleToggleWatchlist = async (movie) => {
    if (!movie) return;
    const movieKey = String(movie.id);
    if (watchlistIds.has(movieKey)) {
      const removed = await removeFromWatchlist(movie.id);
      if (removed) {
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(movieKey);
          return next;
        });
      }
    } else {
      const saved = await saveToWatchlist(movie);
      if (saved) {
        setWatchlistIds((prev) => new Set([...prev, movieKey]));
      }
    }
  };

  // Kategori bazlı kilitli ve tekilleştirilmiş sonsuz kaydırma
  const loadMore = async (category) => {
    if (loadingMoreRef.current[category]) return;
    loadingMoreRef.current[category] = true;

    const nextPage = pages[category] + 1;
    setPages((prev) => ({ ...prev, [category]: nextPage }));

    try {
      let newMovies = [];
      if (category === 'nowPlaying') newMovies = await getNowPlayingMovies(nextPage);
      else if (category === 'newReleases') newMovies = await getNewReleases(nextPage);
      else if (category === 'topRated') newMovies = await getTopRatedMovies(nextPage);
      else if (category === 'action') newMovies = await getMoviesByGenre(28, nextPage);
      else if (category === 'comedy') newMovies = await getMoviesByGenre(35, nextPage);
      else if (category === 'sciFi') newMovies = await getMoviesByGenre(878, nextPage);
      else if (category === 'horror') newMovies = await getMoviesByGenre(27, nextPage);
      else if (category === 'romance') newMovies = await getMoviesByGenre(10749, nextPage);
      else if (category === 'drama') newMovies = await getMoviesByGenre(18, nextPage);
      else if (category === 'animation') newMovies = await getMoviesByGenre(16, nextPage);

      if (newMovies && newMovies.length > 0) {
        const merge = (prev) => dedupeMoviesById(prev, newMovies);
        if (category === 'nowPlaying') setNowPlaying(merge);
        else if (category === 'newReleases') setNewReleases(merge);
        else if (category === 'topRated') setTopRated(merge);
        else if (category === 'action') setActionMovies(merge);
        else if (category === 'comedy') setComedyMovies(merge);
        else if (category === 'sciFi') setSciFiMovies(merge);
        else if (category === 'horror') setHorrorMovies(merge);
        else if (category === 'romance') setRomanceMovies(merge);
        else if (category === 'drama') setDramaMovies(merge);
        else if (category === 'animation') setAnimationMovies(merge);
      }
    } finally {
      loadingMoreRef.current[category] = false;
    }
  };

  // Canlı arama (race condition + hata ayrımı ile)
  useEffect(() => {
    const requestId = ++searchRequestRef.current;
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      setSearchFailed(false);
    } else {
      setSearchResults([]);
      setIsSearching(false);
      setSearchFailed(false);
    }

    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const results = await searchMovies(searchQuery, { throwOnError: true });
          if (requestId === searchRequestRef.current) {
            setSearchResults(results.slice(0, 5));
            setSearchFailed(false);
            setIsSearching(false);
          }
        } catch {
          if (requestId === searchRequestRef.current) {
            setSearchResults([]);
            setSearchFailed(true);
            setIsSearching(false);
          }
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(delayDebounceFn);
      searchRequestRef.current += 1;
    };
  }, [searchQuery, searchRetry, language]);

  const goToDetails = (movieId) => navigation.navigate('Details', { movieId });

  const renderPopularActor = ({ item }) => (
    <TouchableOpacity
      style={styles.popularActorCard}
      onPress={() =>
        navigation.navigate('Actor', {
          actorId: item.id,
          actorName: item.name,
          actorPhoto: item.profile_path,
        })
      }
    >
      {item.profile_path ? (
        <Image
          source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }}
          style={styles.popularActorAvatar}
        />
      ) : (
        <View style={styles.noPopularActorAvatar}>
          <Ionicons name="person" size={28} color={COLORS.textMuted} />
        </View>
      )}
      <Text style={styles.popularActorName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.popularActorKnownFor} numberOfLines={1}>
        {item.known_for_department || ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Alanı */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Filmo</Text>
        </View>

        <View style={{ position: 'relative', zIndex: 10 }}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('search_placeholder')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {(searchResults.length > 0 || isSearching || (searchQuery.trim().length > 1 && !isSearching)) && (
            <View style={styles.searchResultsContainer}>
              {isSearching ? (
                <ActivityIndicator color={COLORS.primary} style={{ padding: 10 }} />
              ) : searchResults.length === 0 ? (
                <View style={styles.noSearchResults}>
                  <Text style={styles.noSearchResultsText}>
                    {searchFailed ? i18n.t('load_error') : i18n.t('no_results')}
                  </Text>
                  {searchFailed ? (
                    <TouchableOpacity
                      onPress={() => setSearchRetry((value) => value + 1)}
                      style={styles.searchRetryButton}
                    >
                      <Ionicons name="refresh" size={15} color={COLORS.primary} />
                      <Text style={styles.searchRetryText}>{i18n.t('retry')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                searchResults.map((movie) => (
                  <TouchableOpacity
                    key={movie.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      goToDetails(movie.id);
                    }}
                  >
                    {movie.poster_path ? (
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}${movie.poster_path}` }}
                        style={styles.searchResultImage}
                      />
                    ) : (
                      <View style={styles.searchResultNoImage}>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{i18n.t('none')}</Text>
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {movie.title}
                      </Text>
                      <Text style={styles.searchResultYear}>
                        {movie.release_date?.split('-')[0] || i18n.t('no_date')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <SkeletonScreen />
      ) : homeLoadError && featuredMovies.length === 0 && nowPlaying.length === 0 && topRated.length === 0 ? (
        <View style={styles.loadErrorContainer}>
          <Ionicons
            name={missingApiKey ? 'key-outline' : 'cloud-offline-outline'}
            size={42}
            color={COLORS.textMuted}
          />
          <Text style={styles.loadErrorText}>
            {missingApiKey ? i18n.t('missing_api_key') : i18n.t('load_error')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMovies()}>
            <Ionicons name="refresh" size={18} color={COLORS.textDark} />
            <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMovies(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <HeroCarousel
            movies={featuredMovies}
            watchlistIds={watchlistIds}
            onPressMovie={goToDetails}
            onToggleWatchlist={handleToggleWatchlist}
          />

          <MovieRow title={i18n.t('upcoming')} data={upcomingMovies} onPressMovie={goToDetails} style={{ marginTop: 10 }} />
          <MovieRow title={i18n.t('in_theaters')} data={nowPlaying} onPressMovie={goToDetails} onEndReached={() => loadMore('nowPlaying')} />
          <MovieRow title={i18n.t('new_releases')} data={newReleases} onPressMovie={goToDetails} onEndReached={() => loadMore('newReleases')} />

          {popularActors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('popular_actors')}</Text>
              <FlatList
                horizontal
                data={popularActors}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderPopularActor}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          <MovieRow title={i18n.t('top_rated')} data={topRated} onPressMovie={goToDetails} onEndReached={() => loadMore('topRated')} />
          <MovieRow title={i18n.t('action')} data={actionMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('action')} />
          <MovieRow title={i18n.t('comedy')} data={comedyMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('comedy')} />
          <MovieRow title={i18n.t('horror')} data={horrorMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('horror')} />
          <MovieRow title={i18n.t('romance')} data={romanceMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('romance')} />
          <MovieRow title={i18n.t('drama')} data={dramaMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('drama')} />
          <MovieRow title={i18n.t('animation')} data={animationMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('animation')} />
          <MovieRow title={i18n.t('sci_fi')} data={sciFiMovies} onPressMovie={goToDetails} onEndReached={() => loadMore('sciFi')} />
          <MovieRow title={i18n.t('star_wars')} data={starWarsMovies} onPressMovie={goToDetails} />
          <MovieRow title={i18n.t('marvel')} data={marvelMovies} onPressMovie={goToDetails} />

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadErrorText: {
    color: '#bbb',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 14,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: COLORS.surface,
    zIndex: 9999,
  },
  logoContainer: {
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.xxl,
    zIndex: 11,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
    zIndex: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  noSearchResults: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noSearchResultsText: {
    color: '#bbb',
    textAlign: 'center',
  },
  searchRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 2,
  },
  searchRetryText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 5,
  },
  searchResultImage: {
    width: 35,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: 12,
  },
  searchResultNoImage: {
    width: 35,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchResultYear: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 10,
  },
  horizontalList: {
    paddingHorizontal: 12,
  },
  popularActorCard: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  popularActorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 6,
  },
  noPopularActorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 6,
  },
  popularActorName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 76,
  },
  popularActorKnownFor: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
