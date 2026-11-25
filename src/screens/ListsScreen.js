import React, { useState, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getWatchedMovies,
  getWatchlist,
  removeWatchedMovie,
  removeFromWatchlist,
  updateWatchedMovie,
} from '../services/storage';
import { IMAGE_BASE_URL } from '../services/tmdb';
import { LanguageContext } from '../context/LanguageContext';
import { filterAndSortMovies, validateWatchedEdit } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../services/i18n';

const SORT_OPTIONS = [
  { key: 'recent', labelKey: 'sort_recent' },
  { key: 'rating_desc', labelKey: 'sort_rating' },
  { key: 'date_desc', labelKey: 'sort_date' },
  { key: 'title_asc', labelKey: 'sort_title' },
];

export default function ListsScreen({ navigation, route }) {
  const { language } = useContext(LanguageContext);

  const [activeTab, setActiveTab] = useState('watched');
  const [watchedList, setWatchedList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const [editingMovie, setEditingMovie] = useState(null);
  const [editRating, setEditRating] = useState('');
  const [editReview, setEditReview] = useState('');
  const [editDate, setEditDate] = useState('');

  const loadData = async () => {
    const [watched, planned] = await Promise.all([getWatchedMovies(), getWatchlist()]);
    setWatchedList(watched);
    setWatchlist(planned);
  };

  useFocusEffect(
    useCallback(() => {
      if (route.params?.activeTab === 'watched' || route.params?.activeTab === 'watchlist') {
        setActiveTab(route.params.activeTab);
        navigation.setParams({ activeTab: undefined });
      }
      loadData();
    }, [navigation, route.params?.activeTab])
  );

  const activeSourceList = activeTab === 'watched' ? watchedList : watchlist;

  const displayedMovies = useMemo(
    () =>
      filterAndSortMovies(activeSourceList, {
        query: searchQuery,
        sortBy,
        listType: activeTab,
      }),
    [activeSourceList, searchQuery, sortBy, activeTab]
  );

  const handleDelete = async (movieId) => {
    if (activeTab === 'watched') {
      await removeWatchedMovie(movieId);
    } else {
      await removeFromWatchlist(movieId);
    }
    loadData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(language?.startsWith('en') ? 'en-US' : 'tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const openEditor = (movie) => {
    setEditingMovie(movie);
    setEditRating(movie.userRating == null ? '' : String(movie.userRating));
    setEditReview(movie.userReview || '');
    const watchedDate = movie.watchedAt ? new Date(movie.watchedAt) : new Date();
    const validDate = Number.isNaN(watchedDate.getTime()) ? new Date() : watchedDate;
    setEditDate(validDate.toISOString().slice(0, 10));
  };

  const saveEdit = async () => {
    const validation = validateWatchedEdit({ ratingText: editRating, dateText: editDate });
    if (!validation.valid) {
      Alert.alert(i18n.t('edit_watched'), i18n.t('invalid_watched_info'));
      return;
    }

    const saved = await updateWatchedMovie(editingMovie.id, {
      userRating: validation.rating,
      userReview: editReview.trim(),
      watchedAt: validation.watchedAt,
    });
    if (saved) {
      setEditingMovie(null);
      loadData();
    }
  };

  const renderMovieItem = ({ item }) => (
    <View style={styles.movieCard}>
      <TouchableOpacity
        style={styles.movieContent}
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

        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {activeTab === 'watched' ? (
            <>
              <TouchableOpacity style={styles.editButton} onPress={() => openEditor(item)}>
                <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                <Text style={styles.editButtonText}>{i18n.t('edit_watched')}</Text>
              </TouchableOpacity>
              {item.userRating ? (
                <View style={styles.ratingContainer}>
                  <Text style={styles.userRating}>
                    ⭐ {i18n.t('your_rating')}: {item.userRating}/10
                  </Text>
                </View>
              ) : null}
              <Text style={styles.watchDate}>
                {i18n.t('watched_date_prefix')}: {formatDate(item.watchedAt)}
              </Text>
              {item.userReview ? (
                <Text style={styles.review} numberOfLines={2}>
                  "{item.userReview}"
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.movieDate}>
                {item.release_date?.split('-')[0] || i18n.t('no_date')}
              </Text>
              <Text style={styles.tmdbRating}>⭐ TMDB: {item.vote_average?.toFixed(1)}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'watched' && styles.activeTab]}
          onPress={() => setActiveTab('watched')}
        >
          <Text style={[styles.tabText, activeTab === 'watched' && styles.activeTabText]}>
            {i18n.t('watched_movies')} ({watchedList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'watchlist' && styles.activeTab]}
          onPress={() => setActiveTab('watchlist')}
        >
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>
            {i18n.t('watchlist')} ({watchlist.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste İçi Arama ve Sıralama */}
      {activeSourceList.length > 0 && (
        <View style={styles.controlsBar}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('search_in_list')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
          >
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => setSortBy(option.key)}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {i18n.t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Listeler */}
      <FlatList
        data={displayedMovies}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMovieItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? i18n.t('no_matching_movies')
                : activeTab === 'watched'
                  ? i18n.t('watched_empty')
                  : i18n.t('watchlist_empty')}
            </Text>
          </View>
        }
      />

      {/* İzleme Bilgilerini Düzenleme Modalı */}
      <Modal
        visible={!!editingMovie}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMovie(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>{i18n.t('edit_watched')}</Text>
            <Text style={styles.inputLabel}>{i18n.t('rating_label')}</Text>
            <TextInput
              style={styles.input}
              value={editRating}
              onChangeText={setEditRating}
              keyboardType="decimal-pad"
              placeholder="1–10"
              placeholderTextColor="#777"
              maxLength={4}
            />
            <Text style={styles.inputLabel}>{i18n.t('watch_date_label')}</Text>
            <TextInput
              style={styles.input}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#777"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>{i18n.t('review_label')}</Text>
            <TextInput
              style={[styles.input, styles.reviewInput]}
              value={editReview}
              onChangeText={setEditReview}
              placeholder={i18n.t('review_placeholder')}
              placeholderTextColor="#777"
              multiline
              maxLength={1000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditingMovie(null)} style={styles.modalAction}>
                <Text style={styles.cancelText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.modalAction, styles.saveAction]}>
                <Text style={styles.saveText}>{i18n.t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  controlsBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  sortRow: {
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surfaceLight,
    marginRight: 8,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
  },
  sortChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: COLORS.textDark,
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
    alignItems: 'center',
  },
  movieContent: {
    flex: 1,
    flexDirection: 'row',
  },
  poster: {
    width: 100,
    height: 150,
  },
  noPoster: {
    width: 100,
    height: 150,
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
    marginBottom: 8,
  },
  ratingContainer: {
    backgroundColor: COLORS.surfaceLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 7,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  userRating: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  watchDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  review: {
    color: '#cccccc',
    fontSize: 13,
    fontStyle: 'italic',
  },
  movieDate: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  tmdbRating: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  deleteButton: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  editModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reviewInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveAction: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  cancelText: {
    color: '#ccc',
    fontWeight: '600',
  },
  saveText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
});
