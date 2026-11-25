import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Linking,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMovieDetails,
  getWatchProviders,
  getSimilarMovies,
  isApiKeyConfigured,
  IMAGE_BASE_URL,
} from '../services/tmdb';
import {
  saveWatchedMovie,
  updateWatchedMovie,
  removeWatchedMovie,
  saveToWatchlist,
  removeFromWatchlist,
  getCustomLists,
  addMovieToCustomList,
  removeMovieFromCustomList,
  addToFavorites,
  removeFromFavorites,
  getMovieListStatus,
} from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import { mergeWatchProviders } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import ImageGalleryModal from '../components/ImageGalleryModal';
import WatchRatingModal from '../components/WatchRatingModal';
import i18n from '../services/i18n';

export default function DetailsScreen({ route, navigation }) {
  const { movieId } = route.params;
  const { language } = useContext(LanguageContext);

  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Kullanıcının liste durumları
  const [watchedEntry, setWatchedEntry] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [customListIds, setCustomListIds] = useState(new Set());

  // Puanlama / Düzenleme Modal State'leri
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');

  // Custom Alert State'leri
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Özel Liste Seçim Modalı State'leri
  const [listModalVisible, setListModalVisible] = useState(false);
  const [userLists, setUserLists] = useState([]);

  // Fotoğraf Galeri State'leri
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Fragman, Yayın Platformları, Benzer Filmler
  const [trailerKey, setTrailerKey] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);

  const photos = movie?.images?.backdrops || [];
  const rentAndBuyProviders = mergeWatchProviders(watchProviders);
  const isInAnyList = inWatchlist || customListIds.size > 0;

  const refreshListStatus = useCallback(async () => {
    const status = await getMovieListStatus(movieId);
    setWatchedEntry(status.watchedMovie);
    setInWatchlist(status.inWatchlist);
    setIsFavorite(status.isFavorite);
    setCustomListIds(new Set(status.customListIds));
  }, [movieId]);

  useFocusEffect(
    useCallback(() => {
      refreshListStatus();
    }, [refreshListStatus])
  );

  useEffect(() => {
    navigation.setOptions({ title: i18n.t('view_details') });
  }, [navigation, language]);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      setLoadError(false);

      const [data, providersData, similarData] = await Promise.all([
        getMovieDetails(movieId),
        getWatchProviders(movieId),
        getSimilarMovies(movieId),
      ]);

      if (!active) return;

      setMovie(data);
      setLoadError(!data);
      if (data?.credits?.cast) {
        setCast(data.credits.cast.slice(0, 10));
      } else {
        setCast([]);
      }

      const preferredRegion = language?.startsWith('en') ? 'US' : 'TR';
      const selectedProviders =
        providersData?.[preferredRegion] ||
        providersData?.TR ||
        providersData?.US ||
        Object.values(providersData || {})[0];
      setWatchProviders(selectedProviders || null);

      setSimilarMovies(similarData || []);

      const trailer =
        data?.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
        data?.videos?.results?.find((v) => v.site === 'YouTube');
      setTrailerKey(trailer?.key || null);

      await refreshListStatus();
      if (active) setLoading(false);
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [movieId, retryCount, language, refreshListStatus]);

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 2000);
  };

  const handleOpenPhoto = (index) => {
    setSelectedImageIndex(index);
    setImageModalVisible(true);
  };

  const handlePrevPhoto = () => {
    if (photos.length === 0) return;
    setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : photos.length - 1);
  };

  const handleNextPhoto = () => {
    if (photos.length === 0) return;
    setSelectedImageIndex(selectedImageIndex < photos.length - 1 ? selectedImageIndex + 1 : 0);
  };

  const handleToggleFavorite = async () => {
    if (!movie) return;
    if (isFavorite) {
      await removeFromFavorites(movie.id);
      setIsFavorite(false);
    } else {
      await addToFavorites(movie);
      setIsFavorite(true);
    }
  };

  const handleOpenWatchModal = () => {
    if (watchedEntry) {
      setRating(watchedEntry.userRating ?? '');
      setReview(watchedEntry.userReview || '');
    } else {
      setRating('');
      setReview('');
    }
    setModalVisible(true);
  };

  const handleSaveWatched = async () => {
    if (!movie) return;
    const numericRating = rating ? Number(rating) : null;
    const trimmedReview = review.trim();

    if (watchedEntry) {
      const updated = await updateWatchedMovie(movie.id, {
        userRating: numericRating,
        userReview: trimmedReview,
      });
      setModalVisible(false);
      if (updated) {
        await refreshListStatus();
        setTimeout(() => showCustomAlert(i18n.t('updated_watched')), 300);
      }
      return;
    }

    const movieDataToSave = {
      ...movie,
      userRating: numericRating,
      userReview: trimmedReview,
      watchedAt: new Date().toISOString(),
    };

    // İzledim işaretlenince Watchlist'te varsa otomatik çıkarılır
    const success = await saveWatchedMovie(movieDataToSave, {
      removeFromWatchlistIfPresent: true,
    });
    setModalVisible(false);
    setRating('');
    setReview('');

    if (success) {
      await refreshListStatus();
      setTimeout(() => showCustomAlert(i18n.t('added_to_watched')), 300);
    } else {
      setTimeout(() => showCustomAlert(i18n.t('already_watched')), 300);
    }
  };

  const handleRemoveWatched = async () => {
    if (!movie) return;
    await removeWatchedMovie(movie.id);
    setModalVisible(false);
    setRating('');
    setReview('');
    await refreshListStatus();
    setTimeout(() => showCustomAlert(i18n.t('removed_from_watched')), 300);
  };

  const handleOpenListSelector = async () => {
    const [lists] = await Promise.all([getCustomLists(), refreshListStatus()]);
    setUserLists(lists);
    setListModalVisible(true);
  };

  const handleToggleSpecificList = async (listId, listName) => {
    if (!movie) return;
    if (listId === 'watchlist') {
      if (inWatchlist) {
        await removeFromWatchlist(movie.id);
        setInWatchlist(false);
        setListModalVisible(false);
        setTimeout(() => showCustomAlert(i18n.t('removed_from_watchlist')), 300);
      } else {
        await saveToWatchlist(movie);
        setInWatchlist(true);
        setListModalVisible(false);
        setTimeout(() => showCustomAlert(i18n.t('added_to_watchlist')), 300);
      }
      return;
    }

    const alreadyInList = customListIds.has(listId);
    if (alreadyInList) {
      await removeMovieFromCustomList(listId, movie.id);
      setCustomListIds((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
      setListModalVisible(false);
      setTimeout(() => showCustomAlert(`"${listName}" ${i18n.t('removed_from_list')}`), 300);
    } else {
      await addMovieToCustomList(listId, movie);
      setCustomListIds((prev) => new Set([...prev, listId]));
      setListModalVisible(false);
      setTimeout(() => showCustomAlert(`"${listName}" ${i18n.t('added_to_list')}`), 300);
    }
  };

  const handleShareMovie = async () => {
    if (!movie) return;
    try {
      const year = movie.release_date?.split('-')[0] || '';
      const score = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}/10` : '';
      const message = `🎬 ${i18n.t('share_intro')}\n\n*${movie.title}* (${year}) ${score}\n\n${i18n.t('share_details')}: https://www.themoviedb.org/movie/${movie.id}`;
      await Share.share({
        message,
        title: movie.title,
      });
    } catch (error) {
      console.log('Paylaşım hatası:', error);
    }
  };

  const handleWatchTrailer = async () => {
    const key =
      trailerKey ||
      movie?.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer')?.key ||
      movie?.videos?.results?.find((v) => v.site === 'YouTube')?.key;

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
      onPress={() =>
        navigation.navigate('Actor', {
          actorId: item.id,
          actorName: item.name,
          actorPhoto: item.profile_path,
        })
      }
    >
      {item.profile_path ? (
        <Image source={{ uri: `${IMAGE_BASE_URL}${item.profile_path}` }} style={styles.castImage} />
      ) : (
        <View style={styles.noCastImage}>
          <Text style={styles.noCastText}>{i18n.t('none')}</Text>
        </View>
      )}
      <Text style={styles.castName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.castCharacter} numberOfLines={2}>
        {item.character}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (loadError || !movie) {
    const missingKey = !isApiKeyConfigured();
    return (
      <View style={styles.centered}>
        <Ionicons
          name={missingKey ? 'key-outline' : 'cloud-offline-outline'}
          size={42}
          color={COLORS.textMuted}
        />
        <Text style={styles.loadErrorText}>
          {missingKey ? i18n.t('missing_api_key') : i18n.t('load_error')}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount((v) => v + 1)}>
          <Ionicons name="refresh" size={18} color={COLORS.textDark} />
          <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trRelease = movie.release_dates?.results?.find((r) => r.iso_3166_1 === 'TR');
  const usRelease = movie.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
  let certification =
    trRelease?.release_dates?.[0]?.certification ||
    usRelease?.release_dates?.[0]?.certification ||
    'NR';
  if (certification === '') certification = 'NR';

  const director = movie.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const writer = movie.credits?.crew?.find(
    (c) => c.job === 'Screenplay' || c.job === 'Writer'
  )?.name;

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
              handleOpenPhoto(0);
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
          {/* Başlık, Paylaş ve Favori */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{movie.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleShareMovie} style={[styles.favoriteButton, { marginRight: 8 }]}>
                <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isFavorite ? COLORS.danger : COLORS.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metaData}>
            <Text style={styles.metaText}>{movie.release_date?.split('-')[0] || i18n.t('no_date')}</Text>
            {movie.runtime ? (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.metaText}>
                  {movie.runtime} {i18n.t('minutes_short')}
                </Text>
              </>
            ) : null}
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rating}>⭐ {movie.vote_average?.toFixed(1)}</Text>
            <Text style={styles.dot}>•</Text>
            <View style={styles.certBadge}>
              <Text style={styles.certText}>{certification}</Text>
            </View>
          </View>

          {watchedEntry?.userRating ? (
            <View style={styles.userRatingBanner}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.userRatingBannerText}>
                {i18n.t('watched_done')} • {i18n.t('your_rating')}: ⭐ {watchedEntry.userRating}/10
              </Text>
            </View>
          ) : null}

          {(director || writer) && (
            <View style={styles.crewContainer}>
              {director && (
                <Text style={styles.crewText}>
                  <Text style={styles.crewLabel}>{i18n.t('director')}</Text>
                  {director}
                </Text>
              )}
              {writer && (
                <Text style={styles.crewText}>
                  <Text style={styles.crewLabel}>{i18n.t('writer')}</Text>
                  {writer}
                </Text>
              )}
            </View>
          )}

          <View style={styles.genres}>
            {movie.genres?.map((genre) => (
              <View key={genre.id} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, watchedEntry ? styles.watchedDoneButton : styles.watchButton]}
              onPress={handleOpenWatchModal}
            >
              <View style={styles.watchButtonContent}>
                <Ionicons
                  name={watchedEntry ? 'checkmark-circle' : 'eye-outline'}
                  size={19}
                  color={watchedEntry ? COLORS.success : COLORS.textDark}
                />
                <Text style={[styles.buttonText, watchedEntry && styles.watchedDoneButtonText]}>
                  {watchedEntry ? i18n.t('watched_done') : i18n.t('watched')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.watchlistButton, isInAnyList && styles.watchlistButtonActive]}
              onPress={handleOpenListSelector}
            >
              <View style={styles.watchButtonContent}>
                {isInAnyList ? (
                  <Ionicons name="bookmark" size={17} color={COLORS.primary} />
                ) : null}
                <Text style={styles.watchlistButtonText}>
                  {isInAnyList ? i18n.t('in_lists') : i18n.t('add_to_list')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.trailerButton} onPress={handleWatchTrailer}>
            <Ionicons name="play" size={20} color={COLORS.textDark} style={{ marginRight: 8 }} />
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
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCastItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </>
          )}

          {/* Fotoğraflar */}
          {photos.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('photos')}</Text>
              <FlatList
                horizontal
                data={photos.slice(0, 20)}
                keyExtractor={(item, index) => item.file_path + index}
                renderItem={({ item, index }) => (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenPhoto(index)}>
                    <Image
                      source={{ uri: `${IMAGE_BASE_URL}${item.file_path}` }}
                      style={styles.backdropGalleryImage}
                    />
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </>
          )}

          {/* Nerede İzlenir? */}
          {watchProviders &&
            (watchProviders.flatrate?.length > 0 || rentAndBuyProviders.length > 0) && (
              <View style={styles.providersContainer}>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  {i18n.t('watch_providers')}
                </Text>

                {watchProviders.flatrate?.length > 0 && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>{i18n.t('stream')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.providersList}
                    >
                      {watchProviders.flatrate.map((provider) => (
                        <View key={provider.provider_id} style={styles.providerItem}>
                          <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                            style={styles.providerLogo}
                          />
                          <Text style={styles.providerName} numberOfLines={1}>
                            {provider.provider_name}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {rentAndBuyProviders.length > 0 && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>{i18n.t('rent_buy')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.providersList}
                    >
                      {rentAndBuyProviders.slice(0, 12).map((provider) => (
                        <View key={provider.provider_id} style={styles.providerItem}>
                          <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                            style={styles.providerLogo}
                          />
                          <Text style={styles.providerName} numberOfLines={1}>
                            {provider.provider_name}
                          </Text>
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
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                {i18n.t('similar_movies')}
              </Text>
              <FlatList
                horizontal
                data={similarMovies.slice(0, 15)}
                keyExtractor={(item) => String(item.id)}
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
                        <Text style={styles.noCastText}>{i18n.t('none')}</Text>
                      </View>
                    )}
                    <Text style={styles.similarMovieTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
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

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <WatchRatingModal
        visible={modalVisible}
        isEditing={Boolean(watchedEntry)}
        rating={rating}
        review={review}
        onChangeRating={setRating}
        onChangeReview={setReview}
        onSave={handleSaveWatched}
        onRemove={handleRemoveWatched}
        onClose={() => setModalVisible(false)}
      />

      {/* Liste Seçme / Yönetme Modalı */}
      <Modal
        animationType="slide"
        transparent
        visible={listModalVisible}
        onRequestClose={() => setListModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.listSelectorOverlay}
          activeOpacity={1}
          onPress={() => setListModalVisible(false)}
        >
          <View style={styles.listSelectorSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{i18n.t('which_list')}</Text>
            </View>

            <ScrollView style={styles.sheetScroll}>
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => handleToggleSpecificList('watchlist', i18n.t('watchlist'))}
              >
                <Ionicons
                  name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={COLORS.primary}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetItemText}>{i18n.t('watchlist')}</Text>
                {inWatchlist ? (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                ) : null}
              </TouchableOpacity>

              {userLists.map((list) => {
                const included = customListIds.has(list.id);
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.sheetItem}
                    onPress={() => handleToggleSpecificList(list.id, list.name)}
                  >
                    <Ionicons
                      name={included ? 'list-circle' : 'list'}
                      size={24}
                      color={COLORS.primary}
                      style={styles.sheetIcon}
                    />
                    <Text style={styles.sheetItemText}>{list.name}</Text>
                    {included ? (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bildirim Toast Modalı */}
      <Modal
        animationType="fade"
        transparent
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertBox}>
            <Ionicons name="information-circle" size={40} color={COLORS.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.customAlertText}>{alertMessage}</Text>
          </View>
        </View>
      </Modal>

      <ImageGalleryModal
        visible={imageModalVisible}
        photos={photos}
        fallbackBackdropPath={movie.backdrop_path}
        selectedIndex={selectedImageIndex}
        onPrev={handlePrevPhoto}
        onNext={handleNextPhoto}
        onClose={() => setImageModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.surface,
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: COLORS.background,
    opacity: 0.8,
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    padding: 20,
    backgroundColor: COLORS.background,
    minHeight: '100%',
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadErrorText: {
    color: '#bbb',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 14,
    marginBottom: 20,
    paddingHorizontal: 28,
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
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
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  dot: {
    color: COLORS.textSecondary,
    marginHorizontal: 8,
    fontSize: 14,
  },
  rating: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  certBadge: {
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  certText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  userRatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  userRatingBannerText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  crewContainer: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  crewText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
  crewLabel: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.xl,
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
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  watchButton: {
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  watchedDoneButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.success,
    marginRight: 8,
  },
  watchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  watchlistButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 8,
  },
  watchlistButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  buttonText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchedDoneButtonText: {
    color: COLORS.success,
  },
  watchlistButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  trailerButton: {
    backgroundColor: COLORS.text,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 24,
  },
  trailerButtonText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: COLORS.text,
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
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 8,
  },
  backdropGalleryImage: {
    width: 240,
    height: 135,
    borderRadius: BORDER_RADIUS.md,
    marginRight: 15,
  },
  noCastImage: {
    width: 90,
    height: 135,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCastText: {
    color: COLORS.textMuted,
  },
  castName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  castCharacter: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  listSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  listSelectorSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: 20,
    maxHeight: '60%',
  },
  sheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 15,
    marginBottom: 10,
  },
  sheetTitle: {
    color: COLORS.text,
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
    borderBottomColor: COLORS.border,
  },
  sheetIcon: {
    marginRight: 15,
  },
  sheetItemText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlertBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: 20,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    width: 260,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  customAlertText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  providersContainer: {
    marginTop: 4,
  },
  providerCategory: {
    marginTop: 12,
  },
  providerCategoryTitle: {
    color: COLORS.textSecondary,
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
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  providerName: {
    color: COLORS.text,
    fontSize: 11,
    textAlign: 'center',
    width: 65,
  },
  similarPosterContainer: {
    width: 110,
    marginRight: 12,
  },
  similarPoster: {
    width: 110,
    height: 165,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 6,
  },
  noSimilarPoster: {
    width: 110,
    height: 165,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarMovieTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  similarMovieRating: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
