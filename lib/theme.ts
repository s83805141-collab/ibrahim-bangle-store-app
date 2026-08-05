import { StyleSheet } from 'react-native';

// Material Design 3 premium color system
export const MD3Colors = {
  primary: '#1565C0',
  primaryContainer: '#D1E4FF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001D36',
  secondary: '#565F71',
  secondaryContainer: '#DAE2F9',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#131C2B',
  tertiary: '#695779',
  tertiaryContainer: '#F1DAFF',
  onTertiary: '#FFFFFF',
  accent: '#00897B',
  accentContainer: '#B2DFDB',
  success: '#2E7D32',
  successContainer: '#C8E6C9',
  onSuccess: '#FFFFFF',
  warning: '#ED6C02',
  warningContainer: '#FFE0B2',
  onWarning: '#FFFFFF',
  error: '#C62828',
  errorContainer: '#FFCDD2',
  onError: '#FFFFFF',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#EEEF2',
  surfaceDim: '#D8DBE0',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#42474E',
  outline: '#73777F',
  outlineVariant: '#C3C7CF',
  shadow: '#000000',
  disabled: '#9E9E9E',
};

// Gradient color pairs for premium buttons
export const MD3Gradients = {
  save: ['#43A047', '#2E7D32'],
  update: ['#1976D2', '#1565C0'],
  delete: ['#E53935', '#C62828'],
  add: ['#7B1FA2', '#4A148C'],
  cancel: ['#9E9E9E', '#757575'],
  view: ['#FB8C00', '#EF6C00'],
  search: ['#3949AB', '#283593'],
  payment: ['#00897B', '#00695C'],
  primary: ['#42A5F5', '#1565C0'],
  teal: ['#26A69A', '#00897B'],
  purple: ['#9C27B0', '#6A1B9A'],
};

export const MD3Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const MD3Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 28,
  full: 9999,
};

export const MD3Elevation = {
  level0: 'none',
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  level5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const MD3Typography = {
  displayLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  displayMedium: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  headlineLarge: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  headlineMedium: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  headlineSmall: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  titleLarge: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  titleMedium: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  titleSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  labelSmall: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16 },
};

export const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
