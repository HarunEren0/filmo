import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWatchedMovies, getWatchlist, removeWatchedMovie, removeFromWatchlist, updateWatchedMovie } from '../services/storage';
import { IMAGE_BASE_URL } from '../services/tmdb';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../services/i18n';

export default function ListsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('watched'); 
  const [watchedList, setWatchedList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null);
  const [editRating, setEditRating] = useState('');
  const [editReview, setEditReview] = useState('');
  const [editDate, setEditDate] = useState('');

  const loadData = async () => {
    const watched = await getWatchedMovies();
    const planned = await getWatchlist();
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

  const handleDelete = async (movieId) => {
    if (activeTab === 'watched') {
      await removeWatchedMovie(movieId);
    } else {
      await removeFromWatchlist(movieId);
    }
    // Sildikten sonra listeyi yenile
    loadData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale?.startsWith('en') ? 'en-US' : 'tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
    const trimmedRating = editRating.trim();
    const rating = trimmedRating === '' ? null : Number(trimmedRating);
    if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 10)) {
      Alert.alert(i18n.t('edit_watched'), i18n.t('invalid_watched_info'));
      return;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(editDate.trim());
    if (!match) {
      Alert.alert(i18n.t('edit_watched'), i18n.t('invalid_watched_info'));
      return;
    }
    const [, year, month, day] = match;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12);
    if (localDate.getFullYear() !== Number(year) || localDate.getMonth() !== Number(month) - 1 || localDate.getDate() !== Number(day)) {
      Alert.alert(i18n.t('edit_watched'), i18n.t('invalid_watched_info'));
      return;
    }
    const saved = await updateWatchedMovie(editingMovie.id, {
      userRating: rating,
      userReview: editReview.trim(),
      watchedAt: localDate.toISOString(),
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
          <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
          
          {activeTab === 'watched' ? (
            <>
              <TouchableOpacity style={styles.editButton} onPress={() => openEditor(item)}>
                <Ionicons name="create-outline" size={15} color="#ff9800" />
                <Text style={styles.editButtonText}>{i18n.t('edit_watched')}</Text>
              </TouchableOpacity>
              {item.userRating ? (
                <View style={styles.ratingContainer}>
                <Text style={styles.userRating}>⭐ {i18n.t('your_rating')}: {item.userRating}/10</Text>
                </View>
              ) : null}
              <Text style={styles.watchDate}>{i18n.t('watched_date_prefix')}: {formatDate(item.watchedAt)}</Text>
              {item.userReview ? (
                <Text style={styles.review} numberOfLines={2}>"{item.userReview}"</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.movieDate}>{item.release_date?.split('-')[0]}</Text>
              <Text style={styles.tmdbRating}>⭐ TMDB: {item.vote_average?.toFixed(1)}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sekmeler (Tabs) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'watched' && styles.activeTab]}
          onPress={() => setActiveTab('watched')}
        >
          <Text style={[styles.tabText, activeTab === 'watched' && styles.activeTabText]}>
            {i18n.t('watched_movies')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'watchlist' && styles.activeTab]}
          onPress={() => setActiveTab('watchlist')}
        >
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>
            {i18n.t('watchlist')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listeler */}
      <FlatList
        data={activeTab === 'watched' ? watchedList : watchlist}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMovieItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'watched' 
                ? i18n.t('watched_empty')
                : i18n.t('watchlist_empty')}
            </Text>
          </View>
        }
      />
      <Modal visible={!!editingMovie} transparent animationType="fade" onRequestClose={() => setEditingMovie(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
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
    backgroundColor: '#121212',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
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
    borderBottomColor: '#ff9800',
  },
  tabText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#ff9800',
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
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPosterText: {
    color: '#888',
    fontSize: 12,
  },
  movieInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    backgroundColor: '#2c2c2c',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 7,
  },
  editButtonText: { color: '#ff9800', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  userRating: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: 'bold',
  },
  watchDate: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 6,
  },
  review: {
    color: '#cccccc',
    fontSize: 13,
    fontStyle: 'italic',
  },
  movieDate: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 4,
  },
  tmdbRating: {
    color: '#aaaaaa',
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
    color: '#888888',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.72)' },
  editModal: { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  inputLabel: { color: '#ccc', fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { color: '#fff', backgroundColor: '#292929', borderRadius: 8, borderWidth: 1, borderColor: '#444', paddingHorizontal: 12, paddingVertical: 10 },
  reviewInput: { minHeight: 84, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalAction: { paddingHorizontal: 16, paddingVertical: 10 },
  saveAction: { backgroundColor: '#ff9800', borderRadius: 8 },
  cancelText: { color: '#ccc', fontWeight: '600' },
  saveText: { color: '#121212', fontWeight: 'bold' },
});
