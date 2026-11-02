/**
 * Filmo Uygulama Tasarım Sabitleri (Theme & Constants)
 * Merkezi renk paleti, tipografi ve boşluk tanımları.
 */

export const COLORS = {
  // Ana Vurgu Renkleri
  primary: '#ff9800',
  primaryDark: '#f57c00',
  primaryLight: 'rgba(255, 152, 0, 0.15)',
  primaryBorder: 'rgba(255, 152, 0, 0.4)',

  // Arka Plan ve Yüzeyler
  background: '#121212',
  surface: '#1e1e1e',
  surfaceLight: '#2c2c2c',
  surfaceHover: '#333333',
  card: '#262626',

  // Metin Renkleri
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  textMuted: '#888888',
  textDark: '#121212',

  // Kenarlıklar (Borders)
  border: '#2c2c2c',
  borderLight: '#383838',

  // Durum Renkleri
  danger: '#ff4444',
  dangerLight: 'rgba(255, 68, 68, 0.15)',
  success: '#4caf50',
  star: '#ffc107',
  
  // Şeffaf Katmanlar
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 30,
  round: 9999,
};

export const TYPOGRAPHY = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
};
