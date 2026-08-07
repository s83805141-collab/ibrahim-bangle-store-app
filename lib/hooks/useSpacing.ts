import { useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the bottom spacing needed to clear the tab bar + safe area inset.
 * Combines the device safe-area bottom inset with a fixed tab bar height
 * estimate so scroll content is never hidden behind the bottom navigation.
 */
export function useBottomTabSpacing(): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56;
  const extra = 16;

  if (Platform.OS === 'web') {
    return 40;
  }

  return (insets?.bottom || 0) + tabBarHeight + extra;
}
