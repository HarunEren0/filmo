import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Linking,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getMovieDetails, 
  getWatchProviders, 
  getSimilarMovies, 
  IMAGE_BASE_URL 
} from '../services/tmdb';
import i18n from '../services/i18n';
import { 
  saveWatchedMovie, 
  saveToWatchlist, 
  getCustomLists, 
  addMovieToCustomList,
  getFavorites,
  addToFavorites,
  removeFromFavorites
} from '../services/storage';

export default function DetailsScreen({ route, navigation }) {
  const { movieId } = route.params;
  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Favori Durumu
  const [isFavorite, setIsFavorite] = useState(false);

  // Puanlama Modal State'leri
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');
  
  // Custom Alert State'leri
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Özel Liste Seçim Modalı State'leri
  const [listModalVisible, setListModalVisible] = useState(false);
  const [userLists, setUserLists] = useState([]);

  const insets = useSafeAreaInsets();

  // Fotoğraf Büyütme (Tam Ekran Galeri) State'leri
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const photos = movie?.images?.backdrops || [];

  const handleOpenPhoto = (index) => {
    setSelectedImageIndex(index);
    setImageModalVisible(true);
  };

  const handlePrevPhoto = () => {
    if (photos.length === 0) return;
    if (selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else {
      setSelectedImageIndex(photos.length - 1);
    }
  };

  const handleNextPhoto = () => {
    if (photos.length === 0) return;
    if (selectedImageIndex < photos.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    } else {
      setSelectedImageIndex(0);
    }
  };

  const currentPhotoPath = selectedImageIndex !== null ? (photos[selectedImageIndex]?.file_path || (selectedImageIndex === 0 ? movie?.backdrop_path : null)) : null;
  const currentPhotoUrl = currentPhotoPath ? `https://image.tmdb.org/t/p/w1280${currentPhotoPath}` : null;

  // Fragman Modal State
  const [trailerKey, setTrailerKey] = useState(null);

  // Yayın Platformları ve Benzer Filmler State'leri
  const [watchProviders, setWatchProviders] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setLoadError(false);
      const [data, favData, providersData, similarData] = await Promise.all([
        getMovieDetails(movieId),
        getFavorites(),
        getWatchProviders(movieId),
        getSimilarMovies(movieId)
      ]);
      setMovie(data);
      setLoadError(!data);
      if (data && data.credits && data.credits.cast) {
        setCast(data.credits.cast.slice(0, 10));
      }
      
      const isFav = favData.some(m => m.id === data?.id);
      setIsFavorite(isFav);

      // Yayın platformları (Türkiye öncelikli, yoksa US/ilk mevcut)
      const trProviders = providersData?.TR || providersData?.US || (Object.values(providersData || {})[0]);
      setWatchProviders(trProviders || null);

      // Benzer filmler
      setSimilarMovies(similarData || []);

      // Fragman anahtarı
      const trailer = data?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer') || data?.videos?.results?.find(v => v.site === 'YouTube');
      if (trailer?.key) {
        setTrailerKey(trailer.key);
      }

      setLoading(false);
    };
    
    fetchDetails();
  }, [movieId, retryCount]);

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 2000);
  };

  const handleToggleFavorite = async () => {
    if (isFavorite) {
      await removeFromFavorites(movie.id);
      setIsFavorite(false);
    } else {
      await addToFavorites(movie);
      setIsFavorite(true);
    }
  };

  const handleOpenListSelector = async () => {
    const lists = await getCustomLists();
    setUserLists(lists);
    setListModalVisible(true);
  };

  const handleAddToSpecificList = async (listId, listName) => {
    setListModalVisible(false);
    if (listId === 'watchlist') {
      const success = await saveToWatchlist(movie);
      if (!success) {
        setTimeout(() => showCustomAlert(i18n.t('already_in_watchlist')), 500);
      } else {
        setTimeout(() => showCustomAlert(i18n.t('added_to_watchlist')), 500);
      }
    } else {
      const success = await addMovieToCustomList(listId, movie);
      if (!success) {
        setTimeout(() => showCustomAlert(`${i18n.t('already_in_list')}`), 500);
      } else {
        setTimeout(() => showCustomAlert(`"${listName}" ${i18n.t('added_to_list')}`), 500);
      }
    }
  };

  const handleSaveWatched = async () => {
    const watchDate = new Date().toISOString();

    const movieDataToSave = {
      ...movie,
      userRating: rating ? Number(rating) : null,
      userReview: review,
      watchedAt: watchDate
    };

    const success = await saveWatchedMovie(movieDataToSave);
    
    if (success) {
      setModalVisible(false);
      setRating('');
      setReview('');
      setTimeout(() => showCustomAlert(i18n.t('added_to_watched')), 500);
    } else {
      setModalVisible(false);
      setTimeout(() => {
        showCustomAlert(i18n.t('already_watched'));
      }, 500);
    }
  };

  const handleShareMovie = async () => {
    if (!movie) return;
    try {
      const year = movie.release_date?.split('-')[0] || '';
      const score = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}/10` : '';
      const message = `🎬 Filmo'da bu filmi buldum:\n\n*${movie.title}* (${year}) ${score}\n\nDetaylar: https://www.themoviedb.org/movie/${movie.id}`;
      await Share.share({
        message,
        title: movie.title,
      });
    } catch (error) {
      console.log('Paylaşım hatası:', error);
    }
  };

  const handleWatchTrailer = async () => {
    const key = trailerKey || movie?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key || movie?.videos?.results?.find(v => v.site === 'YouTube')?.key;
    if (key) {
      try {
        await Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(key)}`);
      } catch (error) {
        console.error('Fragman açılamadı:', error);
        showCustomAlert(i18n.t('trailer_open_error'));
      }
    } else {
      showCustomAlert(i18n.t('no_trailer'));
    }
  };

  const renderCastItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.castItem}
      onPress={() => navigation.navigate('Actor', { actorId: item.id, actorName: item.name, actorPhoto: item.profile_path })}
    >
      {item.profile_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }} style={styles.castImage} />
      ) : (
        <View style={styles.noCastImage}><Text style={styles.noCastText}>{i18n.t('none')}</Text></View>
      )}
      <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.castCharacter} numberOfLines={2}>{item.character}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff9800" />
      </View>
    );
  }

  if (loadError || !movie) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={42} color="#888" />
        <Text style={styles.loadErrorText}>{i18n.t('load_error')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount(value => value + 1)}>
          <Ionicons name="refresh" size={18} color="#121212" />
          <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Yaş Sınırı
  const trRelease = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'TR');
  const usRelease = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
  let certification = trRelease?.release_dates?.[0]?.certification || usRelease?.release_dates?.[0]?.certification || 'NR';
  if (certification === '') certification = 'NR';

  // Yönetmen ve Yazar
  const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name;
  const writer = movie.credits?.crew?.find(c => c.job === 'Screenplay' || c.job === 'Writer')?.name;

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerCover}>
        <TouchableOpacity 
          activeOpacity={0.9}
          style={{ width: '100%', height: '100%' }}
          onPress={() => {
            if (photos.length > 0) {
              handleOpenPhoto(0);
            } else if (movie.backdrop_path) {
              setSelectedImageIndex(0);
              setImageModalVisible(true);
            }
          }}
        >
          {movie.backdrop_path ? (
            <Image 
              source={{ uri: `${IMAGE_BASE_URL}${movie.backdrop_path}` }} 
              style={styles.backdrop}
            />
          ) : (
            <View style={styles.noBackdrop} />
          )}
        </TouchableOpacity>
        <View style={styles.headerGradient} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 200 }}
      >
        <View style={styles.content}>
          
          {/* Başlık, Paylaş ve Kalp (Favori) İkonları */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{movie.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleShareMovie} style={[styles.favoriteButton, { marginRight: 8 }]}>
                <Ionicons name="share-social-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
                <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={26} color={isFavorite ? "#ff4444" : "#ffffff"} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.metaData}>
            <Text style={styles.metaText}>{movie.release_date?.split('-')[0]}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{movie.runtime} dk</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rating}>⭐ {movie.vote_average?.toFixed(1)}</Text>
            <Text style={styles.dot}>•</Text>
            <View style={styles.certBadge}><Text style={styles.certText}>{certification}</Text></View>
          </View>

          {(director || writer) && (
            <View style={styles.crewContainer}>
              {director && <Text style={styles.crewText}><Text style={styles.crewLabel}>{i18n.t('director')}</Text>{director}</Text>}
              {writer && <Text style={styles.crewText}><Text style={styles.crewLabel}>{i18n.t('writer')}</Text>{writer}</Text>}
            </View>
          )}

          <View style={styles.genres}>
            {movie.genres?.map(genre => (
              <View key={genre.id} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.watchButton]} 
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.buttonText}>{i18n.t('watched')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.watchlistButton]} 
              onPress={handleOpenListSelector}
            >
              <Text style={styles.watchlistButtonText}>{i18n.t('add_to_list')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.trailerButton}
            onPress={handleWatchTrailer}
          >
            <Ionicons name="play" size={20} color="#121212" style={{marginRight: 8}} />
            <Text style={styles.trailerButtonText}>{i18n.t('watch_trailer')}</Text>
          </TouchableOpacity>
          
          <Text style={styles.sectionTitle}>{i18n.t('overview')}</Text>
          <Text style={styles.overview}>{movie.overview || i18n.t('no_overview')}</Text>

          {/* Oyuncular */}
          {cast.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('cast')}</Text>
              <FlatList
                horizontal
                data={cast}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderCastItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </>
          )}

          {/* Fotoğraflar */}
          {movie.images?.backdrops?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('photos')}</Text>
              <FlatList
                horizontal
                data={movie.images.backdrops.slice(0, 20)}
                keyExtractor={(item, index) => item.file_path + index}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenPhoto(index)}
                  >
                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.file_path}` }} style={styles.backdropGalleryImage} />
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </>
          )}

          {/* Nerede İzlenir? (Yayın Platformları) */}
          {watchProviders && (watchProviders.flatrate?.length > 0 || watchProviders.rent?.length > 0 || watchProviders.buy?.length > 0) && (
            <View style={styles.providersContainer}>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('watch_providers')}</Text>
              
              {/* Abonelik (Stream) */}
              {watchProviders.flatrate?.length > 0 && (
                <View style={styles.providerCategory}>
                  <Text style={styles.providerCategoryTitle}>{i18n.t('stream')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersList}>
                    {watchProviders.flatrate.map(provider => (
                      <View key={provider.provider_id} style={styles.providerItem}>
                        <Image 
                          source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }} 
                          style={styles.providerLogo} 
                        />
                        <Text style={styles.providerName} numberOfLines={1}>{provider.provider_name}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Kirala / Satın Al (Rent / Buy) */}
              {(watchProviders.rent?.length > 0 || watchProviders.buy?.length > 0) && (
                <View style={styles.providerCategory}>
                  <Text style={styles.providerCategoryTitle}>{i18n.t('rent_buy')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersList}>
                    {(watchProviders.rent || watchProviders.buy || []).slice(0, 10).map((provider, idx) => (
                      <View key={provider.provider_id + '-' + idx} style={styles.providerItem}>
                        <Image 
                          source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }} 
                          style={styles.providerLogo} 
                        />
                        <Text style={styles.providerName} numberOfLines={1}>{provider.provider_name}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Benzer Filmler */}
          {similarMovies.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('similar_movies')}</Text>
              <FlatList
                horizontal
                data={similarMovies.slice(0, 15)}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.similarPosterContainer}
                    onPress={() => navigation.push('Details', { movieId: item.id })}
                  >
                    {item.poster_path ? (
                      <Image 
                        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} 
                        style={styles.similarPoster}
                      />
                    ) : (
                      <View style={styles.noSimilarPoster}>
                        <Text style={styles.noPosterText}>{i18n.t('none')}</Text>
                      </View>
                    )}
                    <Text style={styles.similarMovieTitle} numberOfLines={1}>{item.title}</Text>
                    {item.vote_average ? (
                      <Text style={styles.similarMovieRating}>⭐ {item.vote_average.toFixed(1)}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </>
          )}
          
          <View style={{height: 40}} />
        </View>
      </ScrollView>

      {/* Puanlama ve Yorum Modal'ı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{i18n.t('rate_movie')}</Text>
            
            <Text style={styles.label}>{i18n.t('rating_label')}</Text>
            <View style={styles.ratingGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.ratingButton, rating === num && styles.ratingButtonActive]}
                  onPress={() => setRating(rating === num ? '' : num)}
                >
                  <Text style={[styles.ratingButtonText, rating === num && styles.ratingButtonTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{i18n.t('review_label')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder={i18n.t('review_placeholder')}
              placeholderTextColor="#888"
              value={review}
              onChangeText={setReview}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.mButton, styles.mCancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.mButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mButton, styles.mSaveButton]} onPress={handleSaveWatched}>
                <Text style={styles.mButtonText}>{i18n.t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Liste Seçme Modal'ı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={listModalVisible}
        onRequestClose={() => setListModalVisible(false)}
      >
        <TouchableOpacity style={styles.listSelectorOverlay} activeOpacity={1} onPress={() => setListModalVisible(false)}>
          <View style={styles.listSelectorSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{i18n.t('which_list')}</Text>
            </View>
            
            <ScrollView style={styles.sheetScroll}>
              <TouchableOpacity 
                style={styles.sheetItem}
                onPress={() => handleAddToSpecificList('watchlist', i18n.t('watchlist'))}
              >
                <Ionicons name="bookmark" size={24} color="#ff9800" style={styles.sheetIcon} />
                <Text style={styles.sheetItemText}>{i18n.t('watchlist')}</Text>
              </TouchableOpacity>

              {userLists.map(list => (
                <TouchableOpacity 
                  key={list.id}
                  style={styles.sheetItem}
                  onPress={() => handleAddToSpecificList(list.id, list.name)}
                >
                  <Ionicons name="list" size={24} color="#ff9800" style={styles.sheetIcon} />
                  <Text style={styles.sheetItemText}>{list.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Özel Uyarı Modalı (Custom Alert) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertBox}>
            <Ionicons name="information-circle" size={40} color="#ff9800" style={{marginBottom: 10}} />
            <Text style={styles.customAlertText}>{alertMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Tam Ekran Fotoğraf Büyütme Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.imageViewerOverlay}>
          {/* Üst Bar: Kapatma Butonu ve Fotoğraf Sayacı */}
          <View style={[styles.imageViewerHeader, { paddingTop: Math.max(insets.top, 25) }]}>
            <View style={styles.counterBadge}>
              <Text style={styles.imageViewerCounter}>
                {photos.length > 0 ? `${selectedImageIndex + 1} / ${photos.length}` : '1 / 1'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.imageViewerCloseBtn}
              onPress={() => setImageModalVisible(false)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Görsel Alanı */}
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.imageViewerContent}
            onPress={() => setImageModalVisible(false)}
          >
            {currentPhotoUrl && (
              <Image
                source={{ uri: currentPhotoUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          {/* Sol Ok (Önceki Fotoğraf) */}
          {photos.length > 1 && (
            <TouchableOpacity 
              style={[styles.arrowButton, styles.leftArrow]}
              onPress={handlePrevPhoto}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Sağ Ok (Sonraki Fotoğraf) */}
          {photos.length > 1 && (
            <TouchableOpacity 
              style={[styles.arrowButton, styles.rightArrow]}
              onPress={handleNextPhoto}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* Uygulama İçi Fragman Modalı */}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    zIndex: 0,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  noBackdrop: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#121212',
    opacity: 0.8,
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    padding: 20,
    backgroundColor: '#121212',
    minHeight: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadErrorText: { color: '#bbb', fontSize: 16, textAlign: 'center', lineHeight: 23, marginTop: 14, marginBottom: 20, paddingHorizontal: 28 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff9800', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11 },
  retryButtonText: { color: '#121212', fontWeight: 'bold', marginLeft: 7 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  favoriteButton: {
    padding: 5,
  },
  metaData: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  dot: {
    color: '#aaaaaa',
    marginHorizontal: 8,
    fontSize: 14,
  },
  rating: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  certBadge: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  certText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  crewContainer: {
    marginBottom: 16,
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
  },
  crewText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  crewLabel: {
    color: '#888',
    fontWeight: 'bold',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreBadge: {
    backgroundColor: '#2c2c2c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: '#dddddd',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  watchButton: {
    backgroundColor: '#ff9800',
    marginRight: 8,
  },
  watchlistButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff9800',
    marginLeft: 8,
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchlistButtonText: {
    color: '#ff9800',
    fontSize: 15,
    fontWeight: 'bold',
  },
  trailerButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  trailerButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  overview: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 24,
  },
  castList: {
    paddingRight: 20,
  },
  castItem: {
    width: 90,
    marginRight: 15,
  },
  castImage: {
    width: 90,
    height: 135,
    borderRadius: 8,
    marginBottom: 8,
  },
  backdropGalleryImage: {
    width: 240,
    height: 135,
    borderRadius: 8,
    marginRight: 15,
  },
  noCastImage: {
    width: 90,
    height: 135,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCastText: {
    color: '#888',
  },
  castName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  castCharacter: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#aaaaaa',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4, // Yorum ile aradaki boşluk azaltıldı
  },
  ratingButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingButtonActive: {
    backgroundColor: '#ff9800',
  },
  ratingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingButtonTextActive: {
    color: '#121212',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mCancelButton: {
    backgroundColor: '#333333',
    marginRight: 8,
  },
  mSaveButton: {
    backgroundColor: '#ff9800',
    marginLeft: 8,
  },
  mButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Liste Seçim Modalı Stilleri
  listSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  listSelectorSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  sheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c',
    paddingBottom: 15,
    marginBottom: 10,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sheetScroll: {
    paddingVertical: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c',
  },
  sheetIcon: {
    marginRight: 15,
  },
  sheetItemText: {
    color: '#fff',
    fontSize: 16,
  },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlertBox: {
    backgroundColor: '#2c2c2c',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: 250,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  customAlertText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Tam Ekran Fotoğraf Görüntüleyici Stilleri
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 20,
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  imageViewerCounter: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  imageViewerCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  leftArrow: {
    left: 15,
  },
  rightArrow: {
    right: 15,
  },
  // Yayın Platformları (Watch Providers) Stilleri
  providersContainer: {
    marginTop: 4,
  },
  providerCategory: {
    marginTop: 12,
  },
  providerCategoryTitle: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  providersList: {
    paddingVertical: 4,
  },
  providerItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 65,
  },
  providerLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#2c2c2c',
  },
  providerName: {
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
    width: 65,
  },
  // Benzer Filmler Stilleri
  similarPosterContainer: {
    width: 110,
    marginRight: 12,
  },
  similarPoster: {
    width: 110,
    height: 165,
    borderRadius: 8,
    marginBottom: 6,
  },
  noSimilarPoster: {
    width: 110,
    height: 165,
    borderRadius: 8,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarMovieTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  similarMovieRating: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
