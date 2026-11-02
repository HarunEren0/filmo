import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { getActorMovies, getActorDetails, IMAGE_BASE_URL } from '../services/tmdb';
import i18n from '../services/i18n';

export default function ActorScreen({ route, navigation }) {
  const { actorId, actorName, actorPhoto } = route.params;
  const [movies, setMovies] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Navigasyon başlığını güncelle
    navigation.setOptions({ title: actorName });

    const fetchData = async () => {
      const [actorMovies, actorDetails] = await Promise.all([
        getActorMovies(actorId),
        getActorDetails(actorId)
      ]);
      // Sadece posteri olan filmleri gösterelim ve popülerliğe göre sıralayalım
      const validMovies = actorMovies
        .filter(m => m.poster_path)
        .sort((a, b) => b.popularity - a.popularity);
      setMovies(validMovies);
      setDetails(actorDetails);
      setLoading(false);
    };
    
    fetchData();
  }, [actorId]);

  const calculateAge = (birthDateStr, endDateStr = null) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderMovieItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => navigation.push('Details', { movieId: item.id })}
    >
      <Image 
        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} 
        style={styles.poster} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Oyuncu Üst Bilgisi */}
      <View style={styles.header}>
        {actorPhoto ? (
          <Image source={{ uri: `${IMAGE_BASE_URL}${actorPhoto}` }} style={styles.actorImage} />
        ) : (
          <View style={styles.noActorImage}><Text style={styles.noActorText}>{i18n.t('none')}</Text></View>
        )}
        <Text style={styles.actorName}>{actorName}</Text>
        
        {details && (
          <View style={styles.infoContainer}>
            {details.birthday && (
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>{i18n.t('dob')}</Text>
                {details.birthday.split('-').reverse().join('.')}
                {!details.deathday ? ` (${calculateAge(details.birthday)} ${i18n.t('age')})` : ''}
              </Text>
            )}
            {details.deathday && (
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>{i18n.t('dod')}</Text>
                {details.deathday.split('-').reverse().join('.')}
                {details.birthday ? ` (${calculateAge(details.birthday, details.deathday)} ${i18n.t('died_at_age')})` : ''}
              </Text>
            )}
            {details.place_of_birth && (
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>{i18n.t('pob')}</Text>
                {details.place_of_birth}
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>{i18n.t('acted_movies')}</Text>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff9800" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item, index) => item.id.toString() + index}
          renderItem={renderMovieItem}
          numColumns={3}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c',
  },
  actorImage: {
    width: 100,
    height: 140,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  noActorImage: {
    width: 100,
    height: 140,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  noActorText: {
    color: '#888',
  },
  actorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    marginTop: 10,
    alignItems: 'center'
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#888'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  movieCard: {
    width: '31%',
    aspectRatio: 2/3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  }
});
