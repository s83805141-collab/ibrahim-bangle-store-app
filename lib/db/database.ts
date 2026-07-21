import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { SCHEMA_SQL, MIGRATION_SQL, MIGRATION_SQL_2, MIGRATION_SQL_3, SEED_CATEGORIES } from './schema';
import type { DatabaseAdapter } from './types';

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
          await db.exec(SCHEMA_SQL);
          
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
          console.error('Database initialization error:', error);
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
      'suppliers', 'customers', 'categories', 'settings',
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
  for (const migration of [MIGRATION_SQL, MIGRATION_SQL_2, MIGRATION_SQL_3]) {
    if (!migration || migration.trim().length === 0) continue;
    
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
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

export interface BackupPayload {
  version: number;
  exported_at: number;
  store_key: string;
  data: string;
}

export async function exportBackup(): Promise<string> {
  let raw = JSON.stringify({ tables: {}, seqs: {} });
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
      'stock_movements', 'settings',
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
  }
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exported_at: Date.now(),
    store_key: BACKUP_KEY,
    data: raw,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importBackup(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr) as BackupPayload;
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
  }
}

export async function downloadBackupFile(): Promise<void> {
  const json = await exportBackup();

  const fileName = `ibrahim_bangle_backup_${new Date()
    .toISOString()
    .split('T')[0]}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
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

    await FileSystem.writeAsStringAsync(
      fileUri,
      json,
      {
        encoding: FileSystem.EncodingType.UTF8,
      }
    );

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  }
}
  
