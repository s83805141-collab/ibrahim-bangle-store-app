import * as SQLite from "expo-sqlite";
import type { DatabaseAdapter, QueryResult } from "./types";

export async function createAdapter(): Promise<DatabaseAdapter> {
  const db = await SQLite.openDatabaseAsync("ibrahim_bangle_store.db");

  const exec = async (
    sql: string,
    params: any[] = []
  ): Promise<QueryResult> => {
    const cmd = sql.trim().toUpperCase();

    // CREATE TABLE / multiple statements
    if (cmd.startsWith("CREATE")) {
      const statements = sql
        .split(";")
        .map(s => s.trim())
        .filter(Boolean);

      await db.withTransactionAsync(async () => {
        for (const stmt of statements) {
          await db.execAsync(stmt);
        }
      });

      return {
        rowsAffected: 0,
        rows: {
          _array: [],
          length: 0,
        },
      };
    }

    // SELECT
    if (
      cmd.startsWith("SELECT") ||
      cmd.startsWith("PRAGMA") ||
      cmd.startsWith("WITH")
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

    // INSERT / UPDATE / DELETE / ALTER
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
