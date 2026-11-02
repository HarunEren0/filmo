import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function SkeletonBox({ width, height, borderRadius = 8, style }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

export function SkeletonHero() {
  return (
    <View style={styles.heroContainer}>
      <SkeletonBox width="100%" height={380} borderRadius={0} />
      <View style={styles.heroContentOverlay}>
        <SkeletonBox width={120} height={20} borderRadius={6} style={{ marginBottom: 10 }} />
        <SkeletonBox width="80%" height={32} borderRadius={8} style={{ marginBottom: 12 }} />
        <SkeletonBox width="50%" height={16} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={styles.heroButtonsRow}>
          <SkeletonBox width={140} height={44} borderRadius={22} style={{ marginRight: 12 }} />
          <SkeletonBox width={140} height={44} borderRadius={22} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.rowContainer}>
      <SkeletonBox width={150} height={22} borderRadius={6} style={styles.rowTitle} />
      <View style={styles.posterRow}>
        {[1, 2, 3, 4].map((item) => (
          <SkeletonBox
            key={item}
            width={120}
            height={180}
            borderRadius={8}
            style={styles.posterItem}
          />
        ))}
      </View>
    </View>
  );
}

export default function SkeletonScreen() {
  return (
    <View style={styles.screenContainer}>
      <SkeletonHero />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  skeletonBase: {
    backgroundColor: '#262626',
  },
  heroContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
    marginBottom: 20,
  },
  heroContentOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContainer: {
    marginBottom: 24,
  },
  rowTitle: {
    marginLeft: 16,
    marginBottom: 12,
  },
  posterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  posterItem: {
    marginHorizontal: 4,
  },
});
