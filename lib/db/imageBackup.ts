import * as FileSystem from 'expo-file-system/legacy';
import type { DatabaseAdapter } from './types';

/**
 * Complete persistent image backup/restore system.
 *
 * IMPORTANT:
 * Images selected from ImagePicker may initially live in cache.
 * Before saving their URI to SQLite, screens should copy them to
 * FileSystem.documentDirectory. This module also handles existing
 * local/cache files whenever possible.
 */

export interface ImageBackupEntry {
  table: string;
  column: string;
  rowId: number;
  originalUri: string;
  filename: string;
  mimeType: string;
  base64: string;
}

interface ImageColumnConfig {
  table: string;
  column: string;
}

const IMAGE_COLUMNS: ImageColumnConfig[] = [
  { table: 'payment_proof_images', column: 'image_path' },
  { table: 'customer_payment_images', column: 'image_path' },

  
  { table: 'daily_customer_entries', column: 'bill_photo' },
  { table: 'daily_customer_entries', column: 'payment_photo' },

  { table: 'transport_receipts', column: 'receipt_image' },

  { table: 'products', column: 'image' },
  { table: 'suppliers', column: 'photo' },
  { table: 'customers', column: 'photo' },

  { table: 'sale_headers', column: 'payment_screenshot' },
  { table: 'purchase_headers', column: 'payment_screenshot' },
];

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0];

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpeg') || lower.endsWith('.jpg')) {
    return 'image/jpeg';
  }

  return 'image/jpeg';
}

function extractFilename(uri: string): string {
  const clean = uri.split('?')[0];
  const parts = clean.split('/');
  const name = parts[parts.length - 1];

  if (name && name.includes('.')) {
    return name;
  }

  return `image_${Date.now()}.jpg`;
}

/**
 * Makes an image persistent.
 *
 * If the supplied URI is already inside documentDirectory,
 * it is returned unchanged.
 *
 * Otherwise the file is copied into documentDirectory.
 */
export async function persistImage(uri: string): Promise<string> {
  if (!uri || typeof uri !== 'string') {
    throw new Error('Invalid image URI');
  }

  const cleanUri = uri.trim();

  if (!cleanUri) {
    throw new Error('Empty image URI');
  }

  // Remote URLs cannot be copied using local FileSystem APIs.
  if (
    cleanUri.startsWith('http://') ||
    cleanUri.startsWith('https://')
  ) {
    return cleanUri;
  }

  const documentDir = FileSystem.documentDirectory;

  if (!documentDir) {
    throw new Error('App document directory is unavailable');
  }

  // Already persistent.
  if (cleanUri.startsWith(documentDir)) {
    return cleanUri;
  }

  const info = await FileSystem.getInfoAsync(cleanUri);

  if (!info.exists) {
    throw new Error(`Image file does not exist: ${cleanUri}`);
  }

  const filename =
    `image_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}_${extractFilename(cleanUri)}`;

  const destination = documentDir + filename;

  await FileSystem.copyAsync({
    from: cleanUri,
    to: destination,
  });

  return destination;
}

/**
 * Export one image as base64.
 */
export async function exportImage(
  uri: string
): Promise<{
  filename: string;
  mimeType: string;
  base64: string;
} | null> {
  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
    return null;
  }

  // Remote images are not embedded.
  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      console.warn(`Backup image does not exist: ${uri}`);
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      filename: extractFilename(uri),
      mimeType: guessMimeType(uri),
      base64,
    };
  } catch (error) {
    console.error(`exportImage failed for ${uri}:`, error);
    return null;
  }
}

/**
 * Restore one image from base64.
 */
export async function restoreImage(
  entry: ImageBackupEntry
): Promise<string | null> {
  if (!entry.base64) {
    return null;
  }

  try {
    const documentDir = FileSystem.documentDirectory;

    if (!documentDir) {
      throw new Error('App document directory is unavailable');
    }

    let extension = 'jpg';

    if (entry.filename && entry.filename.includes('.')) {
      const candidate = entry.filename
        .split('.')
        .pop()
        ?.toLowerCase();

      if (
        candidate &&
        ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(candidate)
      ) {
        extension = candidate;
      }
    }

    const filename =
      `restored_${entry.table}_${entry.column}_${entry.rowId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

    const destination = documentDir + filename;

    await FileSystem.writeAsStringAsync(
      destination,
      entry.base64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    const check = await FileSystem.getInfoAsync(destination);

    if (!check.exists) {
      throw new Error(
        `Restored image was not created: ${destination}`
      );
    }

    return destination;
  } catch (error) {
    console.error(
      `restoreImage failed for ${entry.table}.${entry.column}:${entry.rowId}`,
      error
    );

    return null;
  }
}

/**
 * Export every configured database image.
 */
export async function exportAllImages(
  db: DatabaseAdapter
): Promise<ImageBackupEntry[]> {
  const entries: ImageBackupEntry[] = [];

  for (const cfg of IMAGE_COLUMNS) {
    try {
      const result = await db.exec(
        `SELECT id, ${cfg.column}
         FROM ${cfg.table}
         WHERE ${cfg.column} IS NOT NULL
         AND ${cfg.column} != ''`
      );

      for (const row of result.rows._array || []) {
        const uri = String(row[cfg.column] || '').trim();

        if (!uri) continue;

        const exported = await exportImage(uri);

        if (!exported) {
          console.warn(
            `Could not backup image: ${cfg.table}.${cfg.column} row ${row.id}`
          );
          continue;
        }

        entries.push({
          table: cfg.table,
          column: cfg.column,
          rowId: Number(row.id),
          originalUri: uri,
          filename: exported.filename,
          mimeType: exported.mimeType,
          base64: exported.base64,
        });
      }
    } catch (error) {
      console.error(
        `exportAllImages failed for ${cfg.table}.${cfg.column}:`,
        error
      );
    }
  }

  console.log(
    `Image backup complete: ${entries.length} image(s)`
  );

  return entries;
}

/**
 * Restore every image and update its SQLite URI.
 */
export async function restoreAllImages(
  db: DatabaseAdapter,
  entries: ImageBackupEntry[]
): Promise<void> {
  let restored = 0;

  for (const entry of entries) {
    try {
      const newUri = await restoreImage(entry);
      if (!newUri) continue;

      await db.exec(
        `UPDATE ${entry.table}
         SET ${entry.column} = ?
         WHERE id = ?`,
        [newUri, entry.rowId]
      );

      restored++;
    } catch (error) {
      console.error(
        `restoreAllImages failed for ${entry.table}.${entry.column}:${entry.rowId}`,
        error
      );
    }
  }

  console.log(
    `Image restore complete: ${restored}/${entries.length} image(s)`
  );
}
