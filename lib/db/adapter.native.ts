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

    // SELECT / PRAGMA
    if (
      cmd.startsWith("SELECT") ||
      cmd.startsWith("PRAGMA") ||
      cmd.startsWith("WITH")
    ) {
      console.log("SELECT:", sql);

      const rows = await db.getAllAsync(sql, params);

      return {
        rowsAffected: 0,
        rows: {
          _array: rows,
          length: rows.length,
        },
      };
    }

    if (
  cmd.startsWith("CREATE") ||
  cmd.startsWith("ALTER") ||
  cmd.startsWith("DROP")
) {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  
    for (const stmt of statements) {
  try {
    console.log("EXEC:", stmt);
    await db.execAsync(stmt);
  } catch (e) {
    console.log("SQL ERROR:", stmt, e);
    throw e;
  }
    }


  return {
    rowsAffected: 0,
    rows: {
      _array: [],
      length: 0,
    },
  };
  } 

    // INSERT / UPDATE / DELETE / ALTER
    console.log("RUN:", sql);

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
      } catch (e) {
        console.log(e);
      }
    },
  };
}
