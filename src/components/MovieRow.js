import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { IMAGE_BASE_URL } from '../services/tmdb';
import { COLORS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import i18n from '../services/i18n';

export default function MovieRow({ title, data, onPressMovie, onEndReached, style }) {
  if (!data || data.length === 0) return null;

  const renderMoviePoster = ({ item }) => (
    <TouchableOpacity
      style={styles.posterContainer}
      onPress={() => onPressMovie(item.id)}
      activeOpacity={0.85}
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
    </TouchableOpacity>
  );

  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMoviePoster}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: 'bold',
    marginLeft: SPACING.lg,
    marginBottom: 10,
  },
  horizontalList: {
    paddingHorizontal: SPACING.md,
  },
  posterContainer: {
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  poster: {
    width: 120,
    height: 180,
  },
  noPoster: {
    width: 120,
    height: 180,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: COLORS.textMuted,
  },
});
