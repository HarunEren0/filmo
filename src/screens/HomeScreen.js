import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getNowPlayingMovies, 
  getTopRatedMovies,
  getMoviesByGenre,
  getUpcomingMovies,
  getNewReleases,
  getPopularActors,
  searchMovies,
  IMAGE_BASE_URL 
} from '../services/tmdb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToWatchlist, getWatchlist } from '../services/storage';
import SkeletonScreen from '../components/Skeleton';
import i18n from '../services/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  // Günlük rastgele sayfa numarası (1 ile 10 arası)
  const date = new Date();
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const dailyPage = (seed % 10) + 1;

  const heroListRef = useRef(null);
  const activeHeroIndexRef = useRef(0);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
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
  const [animationMovies, setAnimationMovies] = useState([]);
  const [starWarsMovies, setStarWarsMovies] = useState([]);
  const [marvelMovies, setMarvelMovies] = useState([]);

  // Sonsuz kaydırma için sayfa stateleri
  const [pages, setPages] = useState({
    nowPlaying: 1, // Vizyondakiler her zaman 1. sayfadan başlar
    newReleases: 1, // Yeni Çıkanlar her zaman 1. sayfadan başlar
    topRated: dailyPage,
    action: dailyPage,
    comedy: dailyPage,
    sciFi: dailyPage,
    horror: dailyPage,
    romance: dailyPage,
    animation: dailyPage,
  });

  const [loading, setLoading] = useState(true);
  const [homeLoadError, setHomeLoadError] = useState(false);

  // Canlı Arama (Live Search) State'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestRef = useRef(0);
  const [searchRetry, setSearchRetry] = useState(0);

  // Ref'i aktif indeks ile senkronize tut
  useEffect(() => {
    activeHeroIndexRef.current = activeHeroIndex;
  }, [activeHeroIndex]);

  // Öne Çıkanlar Carousel Otomatik Kaydırma (Her 5 saniyede bir)
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeHeroIndexRef.current + 1) % featuredMovies.length;
      heroListRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      activeHeroIndexRef.current = nextIndex;
      setActiveHeroIndex(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  const fetchMovies = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHomeLoadError(false);

    try {
      // İlk ekranda görünen ana içerikleri önce getir.
      const [now, top] = await Promise.all([
        getNowPlayingMovies(1), // Vizyondakiler (Sinemalarda)
        getTopRatedMovies(dailyPage),
      ]);
      setNowPlaying(now);
      setTopRated(top);

      const candidates = [...now, ...top].filter(m => m.backdrop_path);
      const uniqueFeatured = [];
      const seenIds = new Set();
      for (const m of candidates) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueFeatured.push(m);
        }
        if (uniqueFeatured.length >= 5) break;
      }
      setFeaturedMovies(uniqueFeatured);
      const watchlist = await getWatchlist();
      setWatchlistIds(new Set((watchlist || []).map(m => m.id)));
      setHomeLoadError(now.length === 0 && top.length === 0);
      setLoading(false);

      // Kalan satırlar ilk içerik gösterilirken arkada yüklenir.
      const [upcoming, newRel, actors, action, comedy, scifi, horror, romance, animation, starWars, marvel] = await Promise.all([
        getUpcomingMovies(1), // Pek Yakında (Henüz vizyona girmemiş)
        getNewReleases(1), // Yeni Çıkanlar (Son 60 gün)
        getPopularActors(1), // Popüler Oyuncular
        getMoviesByGenre(28, dailyPage), // Aksiyon
        getMoviesByGenre(35, dailyPage), // Komedi
        getMoviesByGenre(878, dailyPage), // Bilim Kurgu
        getMoviesByGenre(27, dailyPage), // Korku
        getMoviesByGenre(10749, dailyPage), // Romantik
        getMoviesByGenre(16, dailyPage), // Animasyon
        searchMovies('Star Wars'),
        searchMovies('Marvel')
      ]);
      setUpcomingMovies(upcoming);
      setNewReleases(newRel);
      setPopularActors(actors);
      setActionMovies(action);
      setComedyMovies(comedy);
      setSciFiMovies(scifi);
      setHorrorMovies(horror);
      setRomanceMovies(romance);
      setAnimationMovies(animation);
      setStarWarsMovies(starWars);
      setMarvelMovies(marvel);
    } catch (error) {
      console.error('Film yükleme hatası:', error);
      setHomeLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const onRefresh = () => {
    fetchMovies(true);
  };

  const handleToggleWatchlist = async (movie) => {
    if (!movie) return;
    const isAdded = watchlistIds.has(movie.id);
    if (!isAdded) {
      const saved = await saveToWatchlist(movie);
      if (saved) setWatchlistIds(prev => new Set([...prev, movie.id]));
    }
  };

  // Daha fazla film yükleme (Infinite Scroll)
  const loadMore = async (category) => {
    const nextPage = pages[category] + 1;
    setPages(prev => ({ ...prev, [category]: nextPage }));
    let newMovies = [];
    if (category === 'nowPlaying') newMovies = await getNowPlayingMovies(nextPage);
    else if (category === 'newReleases') newMovies = await getNewReleases(nextPage);
    else if (category === 'topRated') newMovies = await getTopRatedMovies(nextPage);
    else if (category === 'action') newMovies = await getMoviesByGenre(28, nextPage);
    else if (category === 'comedy') newMovies = await getMoviesByGenre(35, nextPage);
    else if (category === 'sciFi') newMovies = await getMoviesByGenre(878, nextPage);
    else if (category === 'horror') newMovies = await getMoviesByGenre(27, nextPage);
    else if (category === 'romance') newMovies = await getMoviesByGenre(10749, nextPage);
    else if (category === 'animation') newMovies = await getMoviesByGenre(16, nextPage);

    if (newMovies && newMovies.length > 0) {
      if (category === 'nowPlaying') setNowPlaying(prev => [...prev, ...newMovies]);
      else if (category === 'newReleases') setNewReleases(prev => [...prev, ...newMovies]);
      else if (category === 'topRated') setTopRated(prev => [...prev, ...newMovies]);
      else if (category === 'action') setActionMovies(prev => [...prev, ...newMovies]);
      else if (category === 'comedy') setComedyMovies(prev => [...prev, ...newMovies]);
      else if (category === 'sciFi') setSciFiMovies(prev => [...prev, ...newMovies]);
      else if (category === 'horror') setHorrorMovies(prev => [...prev, ...newMovies]);
      else if (category === 'romance') setRomanceMovies(prev => [...prev, ...newMovies]);
      else if (category === 'animation') setAnimationMovies(prev => [...prev, ...newMovies]);
    }
  };

  // Kullanıcı yazdıkça arama yapar
  useEffect(() => {
    const requestId = ++searchRequestRef.current;
    if (searchQuery.trim().length > 1) setIsSearching(true);
    else {
      setSearchResults([]);
      setIsSearching(false);
    }
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        const results = await searchMovies(searchQuery);
        if (requestId === searchRequestRef.current) {
          setSearchResults(results.slice(0, 5)); // Sadece en iyi 5 sonucu göster
          setIsSearching(false);
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
  }, [searchQuery, searchRetry]);

  const renderMoviePoster = ({ item }) => (
    <TouchableOpacity 
      style={styles.posterContainer}
      onPress={() => navigation.navigate('Details', { movieId: item.id })}
    >
      {item.poster_path ? (
        <Image 
          source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} 
          style={styles.poster}
        />
      ) : (
        <View style={styles.noPoster}>
          <Text style={styles.noPosterText}>{i18n.t('none')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPopularActor = ({ item }) => (
    <TouchableOpacity 
      style={styles.popularActorCard}
      onPress={() => navigation.navigate('Actor', { 
        actorId: item.id,
        actorName: item.name,
        actorPhoto: item.profile_path
      })}
    >
      {item.profile_path ? (
        <Image 
          source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }} 
          style={styles.popularActorAvatar}
        />
      ) : (
        <View style={styles.noPopularActorAvatar}>
          <Ionicons name="person" size={28} color="#888" />
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
        
        {/* Filmo Logosu */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Filmo</Text>
        </View>

        {/* Arama Çubuğu Wrapper */}
        <View style={{ position: 'relative', zIndex: 10 }}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('search_placeholder')}
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Canlı Arama Sonuçları */}
          {(searchResults.length > 0 || isSearching || (searchQuery.trim().length > 1 && !isSearching)) && (
            <View style={styles.searchResultsContainer}>
              {isSearching ? (
                <ActivityIndicator color="#ff9800" style={{ padding: 10 }} />
              ) : searchResults.length === 0 ? (
                <View style={styles.noSearchResults}>
                  <Text style={styles.noSearchResultsText}>{i18n.t('no_results')}</Text>
                  <TouchableOpacity onPress={() => setSearchRetry(value => value + 1)} style={styles.searchRetryButton}>
                    <Ionicons name="refresh" size={15} color="#ff9800" />
                    <Text style={styles.searchRetryText}>{i18n.t('retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                searchResults.map(movie => (
                  <TouchableOpacity 
                    key={movie.id} 
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      navigation.navigate('Details', { movieId: movie.id });
                    }}
                  >
                    {movie.poster_path ? (
                      <Image source={{ uri: `${IMAGE_BASE_URL}${movie.poster_path}` }} style={styles.searchResultImage} />
                    ) : (
                      <View style={styles.searchResultNoImage}><Text style={{fontSize: 10, color: '#888'}}>{i18n.t('none')}</Text></View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>{movie.title}</Text>
                      <Text style={styles.searchResultYear}>{movie.release_date?.split('-')[0]}</Text>
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
          <Ionicons name="cloud-offline-outline" size={42} color="#888" />
          <Text style={styles.loadErrorText}>{i18n.t('load_error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMovies()}>
            <Ionicons name="refresh" size={18} color="#121212" />
            <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff9800"
              colors={['#ff9800']}
            />
          }
        >
          {/* Öne Çıkan Filmler Carousel (Hero Carousel) */}
          {featuredMovies.length > 0 && (
            <View style={styles.carouselContainer}>
              <FlatList
                ref={heroListRef}
                data={featuredMovies}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onScroll={(e) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const newIndex = Math.round(offsetX / SCREEN_WIDTH);
                  if (newIndex >= 0 && newIndex < featuredMovies.length && newIndex !== activeHeroIndexRef.current) {
                    activeHeroIndexRef.current = newIndex;
                    setActiveHeroIndex(newIndex);
                  }
                }}
                renderItem={({ item }) => {
                  const inWatchlist = watchlistIds.has(item.id);
                  return (
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      style={[styles.heroSlide, { width: SCREEN_WIDTH }]}
                      onPress={() => navigation.navigate('Details', { movieId: item.id })}
                    >
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w1280${item.backdrop_path || item.poster_path}` }}
                        style={styles.heroImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(18,18,18,0.7)', '#121212']}
                        locations={[0, 0.65, 1]}
                        style={styles.heroGradient}
                      />
                      <View style={styles.heroContent}>
                        <View style={styles.heroBadge}>
                          <Ionicons name="sparkles" size={13} color="#ff9800" style={{ marginRight: 5 }} />
                          <Text style={styles.heroBadgeText}>{i18n.t('featured')}</Text>
                        </View>

                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {item.title}
                        </Text>

                        <View style={styles.heroMetaRow}>
                          {item.release_date ? (
                            <Text style={styles.heroMetaText}>{item.release_date.split('-')[0]}</Text>
                          ) : null}
                          {item.vote_average ? (
                            <>
                              <Text style={styles.heroDot}>•</Text>
                              <Text style={styles.heroRating}>⭐ {item.vote_average.toFixed(1)}</Text>
                            </>
                          ) : null}
                        </View>

                        {/* Hero Butonları */}
                        <View style={styles.heroButtons}>
                          <TouchableOpacity
                            style={styles.heroPrimaryBtn}
                            onPress={() => navigation.navigate('Details', { movieId: item.id })}
                          >
                            <Ionicons name="play" size={18} color="#121212" style={{ marginRight: 6 }} />
                            <Text style={styles.heroPrimaryBtnText}>{i18n.t('view_details')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.heroSecondaryBtn}
                            onPress={() => handleToggleWatchlist(item)}
                          >
                            <Ionicons 
                              name={inWatchlist ? "checkmark" : "add"} 
                              size={20} 
                              color="#ffffff" 
                              style={{ marginRight: 4 }} 
                            />
                            <Text style={styles.heroSecondaryBtnText}>
                              {inWatchlist ? i18n.t('in_watchlist') : i18n.t('watchlist')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Pagination Dots */}
              {featuredMovies.length > 1 && (
                <View style={styles.paginationDots}>
                  {featuredMovies.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.dotIndicator, 
                        activeHeroIndex === idx && styles.activeDotIndicator
                      ]} 
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Pek Yakında / Vizyona Girecekler */}
          {upcomingMovies.length > 0 && (
            <View style={[styles.section, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>{i18n.t('upcoming')}</Text>
              <FlatList 
                horizontal 
                data={upcomingMovies} 
                keyExtractor={(item, index) => item.id.toString() + index} 
                renderItem={renderMoviePoster} 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalList} 
              />
            </View>
          )}

          {/* Vizyondakiler (Sinemalarda) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('in_theaters')}</Text>
            <FlatList horizontal data={nowPlaying} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('nowPlaying')} onEndReachedThreshold={0.5} />
          </View>

          {/* Yeni Çıkanlar (Son Yayınlananlar) */}
          {newReleases.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('new_releases')}</Text>
              <FlatList horizontal data={newReleases} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('newReleases')} onEndReachedThreshold={0.5} />
            </View>
          )}

          {/* Popüler Oyuncular */}
          {popularActors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('popular_actors')}</Text>
              <FlatList 
                horizontal 
                data={popularActors} 
                keyExtractor={(item, index) => item.id.toString() + index} 
                renderItem={renderPopularActor} 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalList} 
              />
            </View>
          )}

          {/* En Çok Oy Alanlar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('top_rated')}</Text>
            <FlatList horizontal data={topRated} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('topRated')} onEndReachedThreshold={0.5} />
          </View>
          
          {/* Aksiyon */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('action')}</Text>
            <FlatList horizontal data={actionMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('action')} onEndReachedThreshold={0.5} />
          </View>

          {/* Komedi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('comedy')}</Text>
            <FlatList horizontal data={comedyMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('comedy')} onEndReachedThreshold={0.5} />
          </View>
          
          {/* Korku */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('horror')}</Text>
            <FlatList horizontal data={horrorMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('horror')} onEndReachedThreshold={0.5} />
          </View>
          
          {/* Romantik */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('romance')}</Text>
            <FlatList horizontal data={romanceMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('romance')} onEndReachedThreshold={0.5} />
          </View>
          
          {/* Animasyon */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('animation') || 'Animation'}</Text>
            <FlatList horizontal data={animationMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('animation')} onEndReachedThreshold={0.5} />
          </View>

          {/* Bilim Kurgu */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('sci_fi')}</Text>
            <FlatList horizontal data={sciFiMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} onEndReached={() => loadMore('sciFi')} onEndReachedThreshold={0.5} />
          </View>
          
          {/* Star Wars Evreni (En Sonda) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('star_wars')}</Text>
            <FlatList horizontal data={starWarsMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} />
          </View>

          {/* Marvel Evreni (En Sonda) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('marvel')}</Text>
            <FlatList horizontal data={marvelMovies} keyExtractor={(item, index) => item.id.toString() + index} renderItem={renderMoviePoster} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} />
          </View>
          
          <View style={{height: 40}} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadErrorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadErrorText: { color: '#bbb', fontSize: 16, textAlign: 'center', lineHeight: 23, marginTop: 14, marginBottom: 20 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff9800', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11 },
  retryButtonText: { color: '#121212', fontWeight: 'bold', marginLeft: 7 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#1e1e1e',
    zIndex: 9999, // Yüksek z-index
  },
  logoContainer: {
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ff9800',
    letterSpacing: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 11,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 0,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 45, // Arama çubuğunun hemen altına konumlandırıldı
    left: 0,
    right: 0,
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
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
    borderBottomColor: '#3d3d3d',
  },
  noSearchResults: { alignItems: 'center', paddingVertical: 8 },
  noSearchResultsText: { color: '#bbb', textAlign: 'center' },
  searchRetryButton: { flexDirection: 'row', alignItems: 'center', padding: 8, marginTop: 2 },
  searchRetryText: { color: '#ff9800', fontWeight: '600', marginLeft: 5 },
  searchResultImage: {
    width: 35,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  searchResultNoImage: {
    width: 35,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchResultYear: {
    color: '#aaaaaa',
    fontSize: 13,
    marginTop: 2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 10,
  },
  horizontalList: {
    paddingHorizontal: 12,
  },
  posterContainer: {
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: 120,
    height: 180,
  },
  noPoster: {
    width: 120,
    height: 180,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#888',
  },
  // Hero Carousel & Banner Stilleri
  carouselContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  heroSlide: {
    height: 380,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroMetaText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
  },
  heroDot: {
    color: '#888888',
    marginHorizontal: 8,
    fontSize: 14,
  },
  heroRating: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  heroPrimaryBtnText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14,
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroSecondaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginHorizontal: 3,
  },
  activeDotIndicator: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff9800',
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
    borderColor: '#ff9800',
    marginBottom: 6,
  },
  noPopularActorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 6,
  },
  popularActorName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 76,
  },
  popularActorKnownFor: {
    color: '#888888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});

