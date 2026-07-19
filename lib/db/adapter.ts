import { Platform } from 'react-native';
import type { DatabaseAdapter } from './types';

// Re-export so TypeScript resolves the module. Metro picks the platform-specific
// file (.web.ts / .native.ts) at bundle time, so this base file is only used by tsc.
export async function createAdapter(): Promise<DatabaseAdapter> {
  if (Platform.OS === 'web') {
    const mod = await import('./adapter.web');
    return mod.createAdapter();
  }
  const mod = await import('./adapter.native');
  return mod.createAdapter();
}
