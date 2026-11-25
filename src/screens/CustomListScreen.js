import React, { useState, useCallback, useMemo, useContext } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCustomLists,
  removeMovieFromCustomList,
  deleteCustomList,
  getFavorites,
  removeFromFavorites,
} from '../services/storage';
import { IMAGE_BASE_URL } from '../services/tmdb';
import { LanguageContext } from '../context/LanguageContext';
import { filterAndSortMovies } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

const SORT_OPTIONS = [
  { key: 'recent', labelKey: 'sort_recent' },
  { key: 'rating_desc', labelKey: 'sort_rating' },
  { key: 'date_desc', labelKey: 'sort_date' },
  { key: 'title_asc', labelKey: 'sort_title' },
];

export default function CustomListScreen({ route, navigation }) {
  useContext(LanguageContext);
  const { listId, listName } = route.params;
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [alertVisible, setAlertVisible] = useState(false);

  const isFavoritesList = listId === 'favorites';

  const loadList = useCallback(async () => {
    if (isFavoritesList) {
      const favs = await getFavorites();
      setMovies(favs);
    } else {
      const lists = await getCustomLists();
      const currentList = lists.find((l) => l.id === listId);
      if (currentList) {
        setMovies(currentList.movies);
      } else {
        navigation.goBack();
      }
    }
  }, [isFavoritesList, listId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const displayedMovies = useMemo(
    () =>
      filterAndSortMovies(movies, {
        query: searchQuery,
        sortBy,
        listType: 'watchlist',
      }),
    [movies, searchQuery, sortBy]
  );

  const handleRemoveMovie = async (movieId) => {
    if (isFavoritesList) {
      await removeFromFavorites(movieId);
    } else {
      await removeMovieFromCustomList(listId, movieId);
    }
    loadList();
  };

  const executeDeleteList = async () => {
    setAlertVisible(false);
    await deleteCustomList(listId);
    navigation.goBack();
  };

  React.useLayoutEffect(() => {
    if (!isFavoritesList) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => setAlertVisible(true)} style={{ marginRight: 15 }}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, isFavoritesList]);

  const renderMovieItem = ({ item }) => (
    <View style={styles.movieCard}>
      <TouchableOpacity
        style={styles.movieContent}
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
          <Text style={styles.movieDate}>
            {item.release_date?.split('-')[0] || i18n.t('no_date')}
          </Text>
          <Text style={styles.tmdbRating}>⭐ {item.vote_average?.toFixed(1)}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveMovie(item.id)}>
        <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {movies.length > 0 && (
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

      <FlatList
        data={displayedMovies}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMovieItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? i18n.t('no_matching_movies') : i18n.t('list_empty')}
            </Text>
          </View>
        }
      />

      <Modal
        animationType="fade"
        transparent
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name="warning-outline" size={40} color={COLORS.danger} style={{ marginBottom: 10 }} />
            <Text style={styles.alertTitle}>{i18n.t('delete_list')}</Text>
            <Text style={styles.alertMessage}>
              "{listName}" {i18n.t('delete_list_confirm')}?
            </Text>

            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setAlertVisible(false)}
              >
                <Text style={styles.alertButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={executeDeleteList}
              >
                <Text style={styles.alertButtonText}>{i18n.t('delete')}</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 8,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  alertTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertMessage: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceHover,
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: COLORS.danger,
    marginLeft: 8,
  },
  alertButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
