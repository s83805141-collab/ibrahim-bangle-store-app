import * as SQLite from 'expo-sqlite';
import type { DatabaseAdapter, QueryResult } from './types';

export async function createAdapter(): Promise<DatabaseAdapter> {
  const db = await SQLite.openDatabaseAsync('ibrahim_bangle_store.db');

  const exec = async (
    sql: string,
    params: any[] = []
  ): Promise<QueryResult> => {
    const trimmed = sql.trim().toUpperCase();

    if (
      trimmed.startsWith('SELECT') ||
      trimmed.startsWith('PRAGMA') ||
      trimmed.startsWith('WITH')
    ) {
      const rows = await db.getAllAsync(sql, params);

      return {
        rowsAffected: 0,
        rows: {
          _array: rows,
          length: rows.length,
        },
      };
    }

    if (trimmed.startsWith('CREATE')) {
      await db.execAsync(sql);

      return {
        rowsAffected: 0,
        rows: {
          _array: [],
          length: 0,
        },
      };
    }

    const result = await db.runAsync(sql, params);

    return {
      insertId: result.lastInsertRowId,
      rowsAffected: result.changes,
      rows: {
        _array: [],
        length: 0,
      },
    };
  };

  return {
    exec,
    close: async () => {
      await db.closeAsync();
    },
  };
}
