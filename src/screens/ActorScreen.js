import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActorMovies, getActorDetails, IMAGE_BASE_URL } from '../services/tmdb';
import { LanguageContext } from '../context/LanguageContext';
import { dedupeMoviesById } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

export default function ActorScreen({ route, navigation }) {
  const { actorId, actorName, actorPhoto } = route.params;
  const { language } = useContext(LanguageContext);

  const [movies, setMovies] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    navigation.setOptions({ title: actorName });

    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [actorMovies, actorDetails] = await Promise.all([
          getActorMovies(actorId, { throwOnError: true }),
          getActorDetails(actorId, { throwOnError: true }),
        ]);

        if (!active) return;

        const validMovies = dedupeMoviesById(
          [],
          actorMovies
            .filter((m) => m.poster_path)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        );
        setMovies(validMovies);
        setDetails(actorDetails);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [actorId, actorName, navigation, language, retryCount]);

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
      <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {actorPhoto ? (
          <Image source={{ uri: `${IMAGE_BASE_URL}${actorPhoto}` }} style={styles.actorImage} />
        ) : (
          <View style={styles.noActorImage}>
            <Text style={styles.noActorText}>{i18n.t('none')}</Text>
          </View>
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
                {details.birthday
                  ? ` (${calculateAge(details.birthday, details.deathday)} ${i18n.t('died_at_age')})`
                  : ''}
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{i18n.t('load_error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount((v) => v + 1)}>
            <Ionicons name="refresh" size={18} color={COLORS.textDark} />
            <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
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
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actorImage: {
    width: 100,
    height: 140,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  noActorImage: {
    width: 100,
    height: 140,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 10,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  noActorText: {
    color: COLORS.textMuted,
  },
  actorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginLeft: 6,
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
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
});
