export interface QueryResult {
  insertId?: number;
  rowsAffected: number;
  rows: { _array: any[]; length: number };
}

export interface DatabaseAdapter {
  exec: (sql: string, params?: any[]) => Promise<QueryResult>;
  close: () => Promise<void>;
}
