// Native-only entry - never imported on web (avoids expo-sqlite WASM bundling issues)
import type { DatabaseAdapter, QueryResult } from './types';

export async function createAdapter(): Promise<DatabaseAdapter> {
  const SQLite = await import('expo-sqlite');
  const open = (SQLite as any).openDatabaseAsync ?? (SQLite as any).openDatabase;
  const db = await open('ibrahim_bangle_store.db');

  const getAll = async (sql: string, params: any[] = []): Promise<any[]> => {
    if (typeof (db as any).getAllAsync === 'function') {
      return (db as any).getAllAsync(sql, params);
    }
    return new Promise((resolve, reject) => {
      (db as any).transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_: any, res: any) => resolve(res.rows._array ?? []),
          (_: any, err: any) => { reject(err); return false; }
        );
      });
    });
  };

  const run = async (sql: string, params: any[] = []): Promise<QueryResult> => {
    if (typeof (db as any).runAsync === 'function') {
      const r = await (db as any).runAsync(sql, params);
      return { insertId: r.lastInsertRowId, rowsAffected: r.changes, rows: { _array: [], length: 0 } };
    }
    return new Promise((resolve, reject) => {
      (db as any).transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_: any, res: any) => resolve({ insertId: res.insertId, rowsAffected: res.rowsAffected, rows: { _array: [], length: 0 } }),
          (_: any, err: any) => { reject(err); return false; }
        );
      });
    });
  };

  const exec = async (sql: string, params: any[] = []): Promise<QueryResult> => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
      const rows = await getAll(sql, params);
      return { rowsAffected: 0, rows: { _array: rows, length: rows.length } };
    }
    if (trimmed.startsWith("CREATE")) {
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await run(stmt);
  }

  return {
    rowsAffected: 0,
    rows: {
      _array: [],
      length: 0,
    },
  };
    }
    return run(sql, params);
  };

  return {
    exec,
    close: async () => { if (typeof (db as any).closeAsync === 'function') await (db as any).closeAsync(); },
  };
}
