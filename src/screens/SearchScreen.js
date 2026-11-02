import React, { useState, useEffect } from 'react';
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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchMovies, searchActors, getTrendingMovies, getMoviesByGenre, IMAGE_BASE_URL } from '../services/tmdb';
import i18n from '../services/i18n';

const getGenres = () => [
  { id: null, name: i18n.t('discover') },
  { id: 28, name: i18n.t('action') },
  { id: 35, name: i18n.t('comedy') },
  { id: 878, name: i18n.t('sci_fi') },
  { id: 27, name: i18n.t('horror') },
  { id: 10749, name: i18n.t('romance') },
  { id: 16, name: i18n.t('animation') }
];

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [actors, setActors] = useState([]);
  const [searchType, setSearchType] = useState('movies');
  const [searchError, setSearchError] = useState(false);
  
  // Keşfet State'leri
  const [trending, setTrending] = useState([]);
  const [trendingPage, setTrendingPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtre State'leri
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (query.trim().length > 1) {
      const results = await searchMovies(query);
      setMovies(results);
    } else {
      setTrendingPage(1);
      let newMovies = [];
      if (selectedGenre) {
        newMovies = await getMoviesByGenre(selectedGenre, 1);
      } else {
        newMovies = await getTrendingMovies(1);
      }
      setTrending(newMovies);
    }
    setRefreshing(false);
  };

  // Kategori değiştiğinde filmleri sıfırla ve yeniden çek
  useEffect(() => {
    setTrending([]);
    setTrendingPage(1);
    fetchMoreDiscover(1, selectedGenre);
  }, [selectedGenre]);

  const fetchMoreDiscover = async (pageToFetch, genreId) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    
    let newMovies = [];
    if (genreId) {
      newMovies = await getMoviesByGenre(genreId, pageToFetch);
    } else {
      newMovies = await getTrendingMovies(pageToFetch);
    }
    
    if (newMovies.length > 0) {
      if (pageToFetch === 1) {
        setTrending(newMovies);
      } else {
        setTrending(prev => [...prev, ...newMovies]);
      }
      setTrendingPage(pageToFetch);
    }
    
    setIsLoadingMore(false);
  };

  const handleEndReached = () => {
    if (!isSearchActive && !isLoadingMore) {
      fetchMoreDiscover(trendingPage + 1, selectedGenre);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#ff9800" />
      </View>
    );
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        setSearchError(false);
        const [movieResults, actorResults] = await Promise.all([searchMovies(query), searchActors(query)]);
        setMovies(movieResults);
        setActors(actorResults);
        setSearchError(movieResults.length === 0 && actorResults.length === 0);
        setLoading(false);
      } else {
        setMovies([]); 
        setActors([]);
        setSearchError(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => navigation.navigate('Details', { movieId: item.id })}
    >
      {item.poster_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
      ) : (
        <View style={styles.noPoster}><Text style={styles.noPosterText}>{i18n.t('none')}</Text></View>
      )}
      
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.movieDate}>{item.release_date?.split('-')[0] || 'Tarih Yok'}</Text>
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
        <View style={styles.gridNoImage}><Text style={styles.noPosterText}>{i18n.t('none')}</Text></View>
      )}
    </TouchableOpacity>
  );

  const renderActorItem = ({ item }) => (
    <TouchableOpacity style={styles.movieCard} onPress={() => navigation.navigate('Actor', {
      actorId: item.id, actorName: item.name, actorPhoto: item.profile_path,
    })}>
      {item.profile_path ? <Image source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }} style={styles.poster} /> :
        <View style={styles.noPoster}><Text style={styles.noPosterText}>{i18n.t('none')}</Text></View>}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.movieDate}>{item.known_for_department || i18n.t('cast')}</Text>
        <Text style={styles.movieRating} numberOfLines={2}>{(item.known_for || []).map(movie => movie.title || movie.name).filter(Boolean).slice(0, 3).join(' · ')}</Text>
      </View>
    </TouchableOpacity>
  );

  const isSearchActive = query.trim().length > 1;
  const genres = getGenres();
  const currentGenreName = genres.find(g => g.id === selectedGenre)?.name || i18n.t('discover');

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
          placeholder={i18n.t('search_placeholder')}
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff9800" style={styles.loader} />
      ) : isSearchActive ? (
        <>
        <View style={styles.searchTabs}>
          {['movies', 'actors'].map(type => <TouchableOpacity key={type} onPress={() => setSearchType(type)} style={[styles.searchTab, searchType === type && styles.searchTabActive]}>
            <Text style={[styles.searchTabText, searchType === type && styles.searchTabTextActive]}>{i18n.t(type === 'movies' ? 'movies' : 'actors')}</Text>
          </TouchableOpacity>)}
        </View>
        <FlatList
          data={searchType === 'movies' ? movies : actors}
          keyExtractor={(item, index) => item.id.toString() + index.toString()}
          renderItem={searchType === 'movies' ? renderSearchResultItem : renderActorItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff9800"
              colors={['#ff9800']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>{searchError ? i18n.t('load_error') : i18n.t('no_results')}</Text>
          }
        />
        </>
      ) : (
        <View style={styles.discoverContainer}>
          <View style={styles.discoverHeader}>
            <Text style={styles.discoverTitle}>{currentGenreName}</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
              <Ionicons name="filter" size={20} color="#ff9800" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={trending}
            keyExtractor={(item, index) => item.id.toString() + index.toString()}
            renderItem={renderDiscoverItem}
            numColumns={4}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5} 
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ff9800"
                colors={['#ff9800']}
              />
            }
          />
        </View>
      )}

      {/* Filtre Modalı */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('category')}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {genres.map(genre => (
              <TouchableOpacity 
                key={genre.id || 'all'}
                style={[styles.genreButton, selectedGenre === genre.id && styles.genreButtonActive]}
                onPress={() => {
                  setSelectedGenre(genre.id);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={[styles.genreButtonText, selectedGenre === genre.id && styles.genreButtonTextActive]}>
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
    backgroundColor: '#121212',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#272727',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchTabs: { flexDirection: 'row', backgroundColor: '#1e1e1e', paddingHorizontal: 16 },
  searchTab: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  searchTabActive: { borderBottomColor: '#ff9800' },
  searchTabText: { color: '#aaa', fontWeight: '600' },
  searchTabTextActive: { color: '#ff9800' },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 0,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
  },
  movieCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#272727',
  },
  poster: {
    width: 80,
    height: 120,
  },
  noPoster: {
    width: 80,
    height: 120,
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  movieDate: {
    color: '#aaaaaa',
    fontSize: 13,
    marginBottom: 4,
  },
  movieRating: {
    color: '#ff9800',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  discoverContainer: {
    flex: 1,
    paddingTop: 16,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  discoverTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
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
    aspectRatio: 2/3,
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
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#888',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  genreButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2c2c2c',
  },
  genreButtonActive: {
    backgroundColor: '#ff9800',
  },
  genreButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  genreButtonTextActive: {
    fontWeight: 'bold',
    color: '#121212',
  }
});
