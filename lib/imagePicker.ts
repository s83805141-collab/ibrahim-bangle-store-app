import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Centralized image picker that copies the picked image into the app's
 * persistent documentDirectory so the file survives cache clears and
 * app restarts. The returned URI is stable and safe to store in the DB.
 *
 * This is critical for backup/restore: exportImage() can only back up
 * images that exist in persistent storage at backup time.
 */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function pickImage(
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  },
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? false,
    aspect: options?.aspect,
    quality: options?.quality ?? 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const sourceUri = result.assets[0].uri;

  // On web, the URI is a blob/object URL — return as-is (web backup uses
  // localStorage, not file-based image export).
  if (Platform.OS === 'web') return sourceUri;

  return copyToPersistentStorage(sourceUri);
}

export async function takePhoto(
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  },
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (camPerm.status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: options?.allowsEditing ?? false,
    aspect: options?.aspect,
    quality: options?.quality ?? 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  return copyToPersistentStorage(result.assets[0].uri);
}

/**
 * Copy an image file from a temporary/cache URI into the app's
 * documentDirectory so it persists across cache clears and app restarts.
 * Returns the new persistent URI.
 */
async function copyToPersistentStorage(sourceUri: string): Promise<string> {
  try {
    // If already in documentDirectory, no need to copy
    if (sourceUri.startsWith(FileSystem.documentDirectory!)) {
      return sourceUri;
    }

    const ext = extractExtension(sourceUri);
    const filename = `img_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const destUri = FileSystem.documentDirectory + filename;

    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    return destUri;
  } catch (error) {
    console.error('copyToPersistentStorage failed:', error);
    // Return the original URI as fallback — better than losing the reference
    return sourceUri;
  }
}

function extractExtension(uri: string): string {
  const clean = uri.split('?')[0];
  const parts = clean.split('.');
  if (parts.length < 2) return 'jpg';
  const ext = parts[parts.length - 1].toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].includes(ext)) {
    return ext;
  }
  return 'jpg';
}
