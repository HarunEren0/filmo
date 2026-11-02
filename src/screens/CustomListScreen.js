import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getCustomLists, 
  removeMovieFromCustomList, 
  deleteCustomList,
  getFavorites,
  removeFromFavorites
} from '../services/storage';
import { IMAGE_BASE_URL } from '../services/tmdb';
import i18n from '../services/i18n';

export default function CustomListScreen({ route, navigation }) {
  const { listId, listName } = route.params;
  const [movies, setMovies] = useState([]);
  
  // Silme Onay Modalı State'leri
  const [alertVisible, setAlertVisible] = useState(false);
  
  const isFavoritesList = listId === 'favorites';

  const loadList = async () => {
    if (isFavoritesList) {
      const favs = await getFavorites();
      setMovies(favs);
    } else {
      const lists = await getCustomLists();
      const currentList = lists.find(l => l.id === listId);
      if (currentList) {
        setMovies(currentList.movies);
      } else {
        // Liste bulunamadı (silinmiş olabilir), geri dön
        navigation.goBack();
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [listId])
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

  // Sağ üst köşeye çöp kutusu (Sadece özel listeler için, Favoriler silinemez)
  React.useLayoutEffect(() => {
    if (!isFavoritesList) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => setAlertVisible(true)} style={{ marginRight: 15 }}>
            <Ionicons name="trash-outline" size={24} color="#ff4444" />
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
          <Text style={styles.movieDate}>{item.release_date?.split('-')[0]}</Text>
          <Text style={styles.tmdbRating}>⭐ {item.vote_average?.toFixed(1)}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleRemoveMovie(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMovieItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {i18n.t('list_empty')}
            </Text>
          </View>
        }
      />

      {/* Özel Onay Modalı (Alert yerine geçer) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name="warning-outline" size={40} color="#ff4444" style={{marginBottom: 10}} />
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
    backgroundColor: '#121212',
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
    width: 90,
    height: 135,
  },
  noPoster: {
    width: 90,
    height: 135,
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
  },
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#3d3d3d',
    alignItems: 'center',
  },
  alertTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertMessage: {
    color: '#aaaaaa',
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
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333333',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#ff4444',
    marginLeft: 8,
  },
  alertButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
