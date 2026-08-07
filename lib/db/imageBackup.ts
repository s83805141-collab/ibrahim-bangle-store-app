import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { DatabaseAdapter } from './types';

/**
 * Future-proof image backup system.
 *
 * Every image-bearing column in the database is described by an entry in
 * IMAGE_COLUMNS. Adding a new image field to any table only requires adding
 * one entry here — export/restore then works automatically.
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
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function extractFilename(uri: string): string {
  const clean = uri.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || `image_${Date.now()}.jpg`;
}

/**
 * Read a single image from local storage and return its base64 representation.
 * Returns null if the URI is empty, remote, or the file cannot be read.
 */
export async function exportImage(uri: string): Promise<{ filename: string; mimeType: string; base64: string } | null> {
  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) return null;

  // Skip remote URLs — only back up local files
  if (uri.startsWith('http://') || uri.startsWith('https://')) return null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return null;

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
 * Restore a single image from a backup entry.
 * Decodes base64, writes it to app document storage, and returns the new local URI.
 */
export async function restoreImage(entry: ImageBackupEntry): Promise<string | null> {
  if (!entry.base64 || entry.base64.length === 0) return null;

  try {
    const ext = entry.filename.includes('.')
      ? entry.filename.split('.').pop()
      : 'jpg';
    const safeExt = ext && ext.length <= 5 ? ext : 'jpg';
    const newFilename = `restored_${entry.table}_${entry.column}_${entry.rowId}_${Date.now()}.${safeExt}`;
    const destUri = FileSystem.documentDirectory + newFilename;

    await FileSystem.writeAsStringAsync(destUri, entry.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return destUri;
  } catch (error) {
    console.error(`restoreImage failed for ${entry.table}.${entry.column}:${entry.rowId}`, error);
    return null;
  }
}

/**
 * Export all images from every configured image column in the database.
 * Reads each row, converts local image files to base64, and returns a flat
 * array of ImageBackupEntry objects.
 */
export async function exportAllImages(db: DatabaseAdapter): Promise<ImageBackupEntry[]> {
  const entries: ImageBackupEntry[] = [];

  for (const cfg of IMAGE_COLUMNS) {
    try {
      const res = await db.exec(`SELECT id, ${cfg.column} FROM ${cfg.table}`);
      for (const row of res.rows._array) {
        const uri = row[cfg.column];
        if (!uri || String(uri).trim().length === 0) continue;

        const exported = await exportImage(String(uri));
        if (exported) {
          entries.push({
            table: cfg.table,
            column: cfg.column,
            rowId: row.id,
            originalUri: String(uri),
            filename: exported.filename,
            mimeType: exported.mimeType,
            base64: exported.base64,
          });
        }
      }
    } catch (error) {
      console.error(`exportAllImages: error scanning ${cfg.table}.${cfg.column}`, error);
    }
  }

  return entries;
}

/**
 * Restore all images from backup entries.
 * For each entry: decode base64, write to local storage, and UPDATE the
 * database row with the new local URI so images display correctly after restore.
 */
export async function restoreAllImages(db: DatabaseAdapter, entries: ImageBackupEntry[]): Promise<void> {
  for (const entry of entries) {
    try {
      const newUri = await restoreImage(entry);
      if (newUri) {
        await db.exec(
          `UPDATE ${entry.table} SET ${entry.column} = ? WHERE id = ?`,
          [newUri, entry.rowId],
        );
      }
    } catch (error) {
      console.error(`restoreAllImages: error restoring ${entry.table}.${entry.column}:${entry.rowId}`, error);
    }
  }
}
