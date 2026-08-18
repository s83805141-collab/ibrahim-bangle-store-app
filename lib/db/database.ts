import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';

import { SCHEMA_SQL, MIGRATION_SQL, MIGRATION_SQL_2, MIGRATION_SQL_3, MIGRATION_SQL_4, MIGRATION_SQL_5, MIGRATION_SQL_6, MIGRATION_SQL_7, MIGRATION_SQL_8, SEED_CATEGORIES } from './schema';
import type { DatabaseAdapter } from './types';
import {
  exportAllImages,
  restoreAllImages,
  type ImageBackupEntry,
} from './imageBackup';

// Platform-specific adapter creation. On web, we import a localStorage-backed
// adapter; on native, we import the expo-sqlite adapter. Using platform-specific
// entry files (.web.ts / .native.ts) ensures the bundler never sees expo-sqlite
// on web (which pulls in a WASM worker that breaks the web build).
async function createAdapter(): Promise<DatabaseAdapter> {
  // Metro resolves platform-specific extensions: adapter.web.ts on web,
  // adapter.native.ts on native. This keeps expo-sqlite out of the web bundle.
  const mod = await import('./adapter');
  return mod.createAdapter();
}

let adapterPromise: Promise<DatabaseAdapter> | null = null;
let isInitialized = false;

export async function getDb(): Promise<DatabaseAdapter> {
  if (!adapterPromise) {
    adapterPromise = createAdapter().then(async (db) => {
      if (!isInitialized) {
        try {
          // Execute initial schema
          console.log("Starting SCHEMA");
          await db.exec(SCHEMA_SQL);
          const check = await db.exec(
  "SELECT name FROM sqlite_master WHERE type='table'"
);

console.log(check.rows._array);
          console.log("SCHEMA Completed");
          
          // Run migrations
          await runMigration(db);
          
          // Seed default categories if none exist
          const res = await db.exec('SELECT * FROM categories');

if (res.rows.length === 0) {
  const now = Date.now();

  for (const name of SEED_CATEGORIES) {
    await db.exec(
      'INSERT INTO categories (name, description, created_at) VALUES (?, ?, ?)',
      [name, '', now]
    );
  }
}
    
          isInitialized = true;
        } catch (error) {
  console.error("DATABASE ERROR:", error);
  alert(JSON.stringify(error));
  throw error;
        }
      }
      return db;
    });
  }
  return adapterPromise;
}

export async function resetDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem('ibrahim_bangle_store_db');
    adapterPromise = null;
    isInitialized = false;
    await getDb();
  } else {
    // Native: drop and recreate all tables, then re-seed
    const db = await getDb();
    const allTables = [
      'stock_movements', 'customer_payment_images', 'customer_payments',
      'supplier_payments', 'payment_proof_images', 'purchase_items',
      'sale_items', 'purchase_headers', 'sale_headers', 'product_variants',
      'products', 'supplier_ledger', 'customer_ledger', 'bank_accounts',
      'suppliers', 'customers', 'categories','daily_customer_entries', 'transport_receipts',
      'quick_bill_headers', 'quick_bill_items',
      'order_headers', 'order_items', 'order_item_colours',
      'settings',
    ];
    for (const t of allTables) {
      try {
        await db.exec(`DROP TABLE IF EXISTS ${t}`);
      } catch (error) {
        console.error(`Error dropping table ${t}:`, error);
      }
    }
    adapterPromise = null;
    isInitialized = false;
    await getDb();
  }
}

// Run ALTER TABLE migrations safely. SQLite doesn't support "IF NOT EXISTS"
// for ADD COLUMN, so we check the current columns via PRAGMA table_info.
async function runMigration(db: DatabaseAdapter): Promise<void> {
  for (const migration of [MIGRATION_SQL, MIGRATION_SQL_2, MIGRATION_SQL_3, MIGRATION_SQL_4, MIGRATION_SQL_5, MIGRATION_SQL_6, MIGRATION_SQL_7, MIGRATION_SQL_8]) {
    if (!migration || migration.trim().length === 0) continue;
    
    const statements = migration
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    
    for (const stmt of statements) {
      const upper = stmt.toUpperCase();
      try {
        if (upper.startsWith('ALTER TABLE') && upper.includes('ADD COLUMN')) {
          const m = stmt.match(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i);
          if (m) {
            const table = m[1];
            const column = m[2];
            const info = await db.exec(`PRAGMA table_info(${table})`);
            const exists = info.rows._array.some((c: any) => c.name === column);
            if (!exists) {
              await db.exec(stmt);
            }
          }
        } else if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX')) {
          await db.exec(stmt);
        }
      } catch (error) {
        console.error(`Migration error for statement: ${stmt}`, error);
        // Continue with next statement
      }
    }
  }
}

export type { DatabaseAdapter, QueryResult } from './types';

// ============================================================
// BACKUP & RESTORE (offline, localStorage-based; structured for
// future Google Drive sync — the blob is a single JSON snapshot)
// ============================================================

const BACKUP_KEY = 'ibrahim_bangle_store_db';
const BACKUP_VERSION = 1;

const AUTO_BACKUP_TIME_KEY = 'automatic_backup_last_run';
const AUTO_BACKUP_ENABLED_KEY = 'automatic_backup_enabled';
const AUTO_BACKUP_FOLDER_KEY = 'automatic_backup_folder_uri';
const AUTO_BACKUP_FILE_KEY = 'automatic_backup_file_uri';
const AUTO_BACKUP_FILE_NAME = 'Ibrahim_Bangle_Auto_Backup.json.gz';

export async function isAutomaticBackupEnabled(): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [AUTO_BACKUP_ENABLED_KEY]
    );

    const value = result.rows._array[0]?.value;

    // Default = ON, ताकि existing automatic backup behavior बना रहे।
    return value === undefined ? true : value === '1';
  } catch (error) {
    console.error('Could not read automatic backup setting:', error);
    return true;
  }
}

export async function setAutomaticBackupEnabled(
  enabled: boolean
): Promise<void> {
  const db = await getDb();

  await db.exec(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [AUTO_BACKUP_ENABLED_KEY, enabled ? '1' : '0']
  );
}

export async function selectAutomaticBackupFolder(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted || !permissions.directoryUri) {
      return false;
    }

    const db = await getDb();

    await db.exec(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [AUTO_BACKUP_FOLDER_KEY, permissions.directoryUri]
    );

    // Clear the old file URI so it will be recreated in the newly selected folder.
    await db.exec(
      'DELETE FROM settings WHERE key = ?',
      [AUTO_BACKUP_FILE_KEY]
    );

    console.log(
      'Automatic backup folder selected:',
      permissions.directoryUri
    );

    return true;
  } catch (error) {
    console.error('Could not select automatic backup folder:', error);
    return false;
  }
}

export async function getAutomaticBackupFolder(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    const db = await getDb();

    const result = await db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [AUTO_BACKUP_FOLDER_KEY]
    );

    return result.rows._array?.[0]?.value || null;
  } catch (error) {
    console.error('Could not read automatic backup folder:', error);
    return null;
  }
}

export async function getLastAutomaticBackup(): Promise<number> {
  try {
    const db = await getDb();

    const result = await db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [AUTO_BACKUP_TIME_KEY]
    );

    return Number(result.rows._array[0]?.value || 0);
  } catch (error) {
    console.error('Could not read last automatic backup:', error);
    return 0;
  }
}

export async function runAutomaticBackup(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      console.log('Automatic Download backup is native-only.');
      return;
    }

    const enabled = await isAutomaticBackupEnabled();

    if (!enabled) {
      console.log('Automatic backup is OFF');
      return;
    }

    const db = await getDb();

    // Read the folder URI previously selected by the user.
    const folderResult = await db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [AUTO_BACKUP_FOLDER_KEY]
    );

    const folderUri = folderResult.rows._array?.[0]?.value;

    // User must select a Download folder once.
    if (!folderUri) {
      console.log(
        'Automatic backup folder is not configured. Open Backup & Restore and select Download folder.'
      );
      return;
    }

    // Create the complete compressed backup.
    const backup = await exportBackup();
    const compressed = gzipSync(strToU8(backup));

    // Convert compressed bytes to base64.
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }

    const base64 = btoa(binary);

    // Reuse the previously-created file URI so every backup overwrites
    // the same Download-folder file.
    const fileResult = await db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [AUTO_BACKUP_FILE_KEY]
    );

    let fileUri = fileResult.rows._array?.[0]?.value;

    // If the saved file URI is unavailable, find/create the backup file.
    if (!fileUri) {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        folderUri
      );

      const existing = files.find((uri: string) =>
        uri.endsWith('/' + AUTO_BACKUP_FILE_NAME) ||
        decodeURIComponent(uri).endsWith('/' + AUTO_BACKUP_FILE_NAME)
      );

      if (existing) {
        fileUri = existing;
      } else {
        fileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            folderUri,
            AUTO_BACKUP_FILE_NAME,
            'application/gzip'
          );
      }

      await db.exec(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [AUTO_BACKUP_FILE_KEY, fileUri]
      );
    }

    // Overwrite the same file in the user's Download folder.
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      base64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    const now = Date.now();

    await db.exec(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [AUTO_BACKUP_TIME_KEY, String(now)]
    );

    console.log(
      'Automatic backup completed successfully:',
      fileUri
    );
  } catch (error) {
    console.error('Automatic backup failed:', error);
  }
}

export interface BackupPayload {
  version: number;
  exported_at: number;
  store_key: string;
  data: string;
  images?: ImageBackupEntry[];
}

export async function exportBackup(): Promise<string> {
  let raw = JSON.stringify({ tables: {}, seqs: {} });
  let images: ImageBackupEntry[] = [];
  if (Platform.OS === 'web') {
    raw = localStorage.getItem(BACKUP_KEY) || raw;
  } else {
    // Native: dump all tables via the adapter
    const db = await getDb();
    const tables = [
      'categories', 'suppliers', 'customers', 'products', 'product_variants',
      'purchase_headers', 'purchase_items', 'sale_headers', 'sale_items',
      'supplier_ledger', 'customer_ledger', 'supplier_payments', 'customer_payments',
      'payment_proof_images', 'customer_payment_images', 'bank_accounts',
      'stock_movements','daily_customer_entries', 'transport_receipts', 'settings',
    ];
    const dump: Record<string, any[]> = {};
    for (const t of tables) {
      try {
        const res = await db.exec(`SELECT * FROM ${t}`);
        dump[t] = res.rows._array;
      } catch (error) {
        console.error(`Error exporting table ${t}:`, error);
        dump[t] = [];
      }
    }
    raw = JSON.stringify(dump);
    // Export all images as base64 so they survive app uninstall/restore
    images = await exportAllImages(db);
  }
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exported_at: Date.now(),
    store_key: BACKUP_KEY,
    data: raw,
    images,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importBackup(jsonStr: string): Promise<void> {
  // Supports both old JSON backups and new compressed backups.
  let backupText = jsonStr;

  try {
    const trimmed = jsonStr.trim();

    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
      const binary = atob(trimmed);
      const bytes = Uint8Array.from(
        binary,
        (c) => c.charCodeAt(0)
      );

      backupText = strFromU8(gunzipSync(bytes));
    }
  } catch (error) {
    console.warn(
      'Backup decompression failed, trying plain JSON:',
      error
    );
  }

  const parsed = JSON.parse(backupText) as BackupPayload;
  if (!parsed || typeof parsed.data !== 'string') throw new Error('Invalid backup file');
  if (Platform.OS === 'web') {
    localStorage.setItem(BACKUP_KEY, parsed.data);
    adapterPromise = null;
    isInitialized = false;
    await getDb();
  } else {
    // Native: restore rows into the SQLite database
    const db = await getDb();
    const data = JSON.parse(parsed.data) as Record<string, any[]>;
    const tables = Object.keys(data);
    for (const t of tables) {
      try {
        await db.exec(`DELETE FROM ${t}`);
        for (const row of data[t]) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          await db.exec(
            `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`,
            cols.map(c => row[c])
          );
        }
      } catch (error) {
        console.error(`Error importing table ${t}:`, error);
      }
    }
    // Restore all images: decode base64, write to local storage, update DB URIs
    if (parsed.images && Array.isArray(parsed.images) && parsed.images.length > 0) {
      await restoreAllImages(db, parsed.images);
    }
  }
}

export async function downloadBackupFile(): Promise<void> {
  const json = await exportBackup();

  // Compress complete backup JSON.
  const compressed = gzipSync(strToU8(json), { level: 9 });

  const fileName = `ibrahim_bangle_backup_${new Date()
    .toISOString()
    .split('T')[0]}.json.gz`;

  if (Platform.OS === 'web') {
    const blob = new Blob([compressed], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } else {
    const fileUri = FileSystem.documentDirectory + fileName;

    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < compressed.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...compressed.subarray(i, Math.min(i + chunkSize, compressed.length))
      );
    }

    const base64 = btoa(binary);

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/gzip',
        dialogTitle: 'Save Ibrahim Bangle Store Backup',
      });
    }
  }
}
  
