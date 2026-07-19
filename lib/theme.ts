import { StyleSheet } from 'react-native';

// Material Design 3 inspired color system
export const MD3Colors = {
  primary: '#1565C0',        // blue-800
  primaryContainer: '#D1E4FF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001D36',
  secondary: '#565F71',
  secondaryContainer: '#DAE2F9',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#131C2B',
  tertiary: '#695779',
  tertiaryContainer: '#F1DAFF',
  accent: '#00897B',         // teal
  success: '#2E7D32',
  successContainer: '#C8E6C9',
  warning: '#ED6C02',
  warningContainer: '#FFE0B2',
  error: '#C62828',
  errorContainer: '#FFCDD2',
  background: '#FDFCFF',
  surface: '#FFFFFF',
  surfaceVariant: '#DFE3EB',
  surfaceDim: '#D8DBE0',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#42474E',
  outline: '#73777F',
  outlineVariant: '#C3C7CF',
  shadow: '#000000',
  disabled: '#9E9E9E',
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
  full: 9999,
};

export const MD3Elevation = {
  level0: 'none',
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
