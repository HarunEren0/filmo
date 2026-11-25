import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HeroCarousel({ movies, watchlistIds, onPressMovie, onToggleWatchlist }) {
  const heroListRef = useRef(null);
  const activeHeroIndexRef = useRef(0);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    activeHeroIndexRef.current = activeHeroIndex;
  }, [activeHeroIndex]);

  useEffect(() => {
    if (!movies || movies.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeHeroIndexRef.current + 1) % movies.length;
      heroListRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      activeHeroIndexRef.current = nextIndex;
      setActiveHeroIndex(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={heroListRef}
        data={movies}
        keyExtractor={(item) => String(item.id)}
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
          if (newIndex >= 0 && newIndex < movies.length && newIndex !== activeHeroIndexRef.current) {
            activeHeroIndexRef.current = newIndex;
            setActiveHeroIndex(newIndex);
          }
        }}
        renderItem={({ item }) => {
          const inWatchlist = watchlistIds.has(String(item.id));
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.heroSlide, { width: SCREEN_WIDTH }]}
              onPress={() => onPressMovie(item.id)}
            >
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w1280${item.backdrop_path || item.poster_path}` }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(18,18,18,0.7)', COLORS.background]}
                locations={[0, 0.65, 1]}
                style={styles.heroGradient}
              />
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Ionicons name="sparkles" size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
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

                <View style={styles.heroButtons}>
                  <TouchableOpacity
                    style={styles.heroPrimaryBtn}
                    onPress={() => onPressMovie(item.id)}
                  >
                    <Ionicons name="play" size={18} color={COLORS.textDark} style={{ marginRight: 6 }} />
                    <Text style={styles.heroPrimaryBtnText}>{i18n.t('view_details')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.heroSecondaryBtn, inWatchlist && styles.heroSecondaryBtnActive]}
                    onPress={() => onToggleWatchlist(item)}
                  >
                    <Ionicons
                      name={inWatchlist ? 'checkmark' : 'add'}
                      size={20}
                      color={inWatchlist ? COLORS.primary : COLORS.text}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.heroSecondaryBtnText, inWatchlist && styles.heroSecondaryBtnTextActive]}>
                      {inWatchlist ? i18n.t('in_watchlist') : i18n.t('watchlist')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {movies.length > 1 && (
        <View style={styles.paginationDots}>
          {movies.map((movie, idx) => (
            <View
              key={movie.id}
              style={[
                styles.dotIndicator,
                activeHeroIndex === idx && styles.activeDotIndicator,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: COLORS.text,
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
    color: COLORS.textMuted,
    marginHorizontal: 8,
    fontSize: 14,
  },
  heroRating: {
    color: COLORS.text,
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
    backgroundColor: COLORS.text,
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
    color: COLORS.textDark,
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
  heroSecondaryBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  heroSecondaryBtnText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  heroSecondaryBtnTextActive: {
    color: COLORS.primary,
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
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
});
