import * as SQLite from "expo-sqlite";
import type { DatabaseAdapter, QueryResult } from "./types";

export async function createAdapter(): Promise<DatabaseAdapter> {
  const db = await SQLite.openDatabaseAsync("ibrahim_bangle_store.db");
  console.log("✅ Database Opened");

  const exec = async (
  sql: string,
  params: any[] = []
): Promise<QueryResult> => {
  const cmd = sql.trim().toUpperCase();

  if (
    cmd.startsWith("CREATE") ||
    cmd.startsWith("DROP") ||
    cmd.startsWith("BEGIN") ||
    cmd.startsWith("COMMIT")
  ) {
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
  console.log("Executing SQL:", stmt);
  await db.execAsync(stmt);
    }

    return {
      rowsAffected: 0,
      rows: {
        _array: [],
        length: 0,
      },
    };
  }

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
      try {
        await db.closeAsync();
      } catch {}
    },
  };
}
