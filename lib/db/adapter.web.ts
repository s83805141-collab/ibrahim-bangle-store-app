// Web-only entry - localStorage-backed SQL subset (for browser preview only)
import type { DatabaseAdapter, QueryResult } from './types';

const STORE_KEY = 'ibrahim_bangle_store_db';

export function createAdapter(): DatabaseAdapter {
  const tables: Record<string, any[]> = {};
  const seqs: Record<string, number> = {};
  const tableColumns: Record<string, string[]> = {};

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(tables, data.tables);
        Object.assign(seqs, data.seqs);
      }
    } catch { /* ignore */ }
  }
  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify({ tables, seqs }));
  }
  load();

  function getTableColumns(t: string): string[] {
    return tableColumns[t] || [];
  }

  function parseCreateTable(sql: string) {
    const m = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*)\)/i);
    if (!m) return;
    const tname = m[1];
    if (!tables[tname]) tables[tname] = [];
    if (!seqs[tname]) seqs[tname] = 1;
    // Extract column names from the body
    const body = m[2];
    const colLines = body.split(',').map(c => c.trim()).filter(c => c && !c.toUpperCase().startsWith('FOREIGN KEY') && !c.toUpperCase().startsWith('PRIMARY KEY'));
    tableColumns[tname] = colLines.map(c => c.split(/\s+/)[0].replace(/["`]/g, ''));
  }

  function addColumnToTable(t: string, col: string) {
    if (!tableColumns[t]) tableColumns[t] = [];
    if (!tableColumns[t].includes(col)) tableColumns[t].push(col);
    // Add the column to existing rows with default null
    if (tables[t]) {
      for (const row of tables[t]) {
        if (!(col in row)) row[col] = null;
      }
    }
  }

  function evalCond(row: any, cond: string, params: any[], pIdx: { i: number }): boolean {
    cond = cond.trim();
    if (!cond) return true;
    const andParts = cond.split(/\s+AND\s+/i);
    for (const part of andParts) {
      const m = part.match(/(\w+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*\?/i);
      if (m) {
        const col = m[1], op = m[2].toUpperCase();
        const val = params[pIdx.i++];
        const rv = row[col];
        if (op === '=' && !(rv == val)) return false;
        if ((op === '!=' || op === '<>') && !(rv != val)) return false;
        if (op === '>' && !(Number(rv) > Number(val))) return false;
        if (op === '<' && !(Number(rv) < Number(val))) return false;
        if (op === '>=' && !(Number(rv) >= Number(val))) return false;
        if (op === '<=' && !(Number(rv) <= Number(val))) return false;
        if (op === 'LIKE' && typeof rv === 'string') {
          const pat = String(val).replace(/%/g, '.*').replace(/_/g, '.');
          if (!new RegExp('^' + pat + '$', 'i').test(rv)) return false;
        }
      } else {
        const m2 = part.match(/(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*([\w.]+)/);
        if (m2) {
          const rv = row[m2[1]];
          const val = m2[3];
          const op = m2[2];
          if (op === '=' && !(rv == val)) return false;
          if ((op === '!=' || op === '<>') && !(rv != val)) return false;
          if (op === '>' && !(Number(rv) > Number(val))) return false;
          if (op === '<' && !(Number(rv) < Number(val))) return false;
        }
      }
    }
    return true;
  }

  function exec(sql: string, params: any[] = []): Promise<QueryResult> {
    sql = sql.trim().replace(/;$/, '');
    const upper = sql.toUpperCase();

    if (upper.startsWith('CREATE')) {
      for (const stmt of sql.split(/;\s*/).filter(s => s.trim())) parseCreateTable(stmt);
      save();
      return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
    }

    if (upper.startsWith('ALTER TABLE') && upper.includes('ADD COLUMN')) {
      const m = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
      if (m) addColumnToTable(m[1], m[2]);
      save();
      return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
    }

    if (upper.startsWith('INSERT')) {
      const m = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i);
      if (!m) return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
      const t = m[1];
      const cols = m[2].split(',').map(c => c.trim());
      const row: any = {};
      cols.forEach((c, i) => { row[c] = params[i] ?? null; });
      const id = row.id ?? seqs[t]++;
      if (!row.id) row.id = id;
      seqs[t] = Math.max(seqs[t] ?? 1, id + 1);
      tables[t] = tables[t] || [];
      tables[t].push(row);
      save();
      return Promise.resolve({ insertId: id, rowsAffected: 1, rows: { _array: [row], length: 1 } });
    }

    if (upper.startsWith('UPDATE')) {
      const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*)/i);
      if (!m) return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
      const t = m[1];
      const setClause = m[2];
      const whereClause = m[3];
      const setParts = setClause.split(',').map(s => s.trim().match(/(\w+)\s*=\s*\?/)).filter(Boolean);
      const setCols = setParts.map(m => m![1]);
      const whereParamCount = (whereClause.match(/\?/g) || []).length;
      const setParams = params.slice(0, setCols.length);
      const whereParams = params.slice(setCols.length, setCols.length + whereParamCount);
      let affected = 0;
      for (const row of tables[t] || []) {
        if (evalCond(row, whereClause, whereParams, { i: 0 })) {
          setCols.forEach((c, i) => { row[c] = setParams[i]; });
          affected++;
        }
      }
      save();
      return Promise.resolve({ rowsAffected: affected, rows: { _array: [], length: 0 } });
    }

    if (upper.startsWith('DELETE')) {
      const m = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+([\s\S]*)/i);
      if (!m) {
        const m2 = sql.match(/DELETE\s+FROM\s+(\w+)/i);
        if (m2) { tables[m2[1]] = []; save(); }
        return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
      }
      const t = m[1];
      const whereClause = m[2];
      const before = (tables[t] || []).length;
      tables[t] = (tables[t] || []).filter(row => !evalCond(row, whereClause, params, { i: 0 }));
      save();
      return Promise.resolve({ rowsAffected: before - tables[t].length, rows: { _array: [], length: 0 } });
    }

    if (upper.startsWith('PRAGMA')) {
      // PRAGMA table_info(tablename) - return column metadata
      const m = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
      if (m) {
        const t = m[1];
        const rows = tables[t] || [];
        // If the table exists, return its known columns; we track them from CREATE TABLE
        const cols = getTableColumns(t);
        return Promise.resolve({
          rowsAffected: 0,
          rows: { _array: cols.map(c => ({ name: c })), length: cols.length },
        });
      }
      return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
    }

    if (upper.startsWith('SELECT')) {
      const m = sql.match(/SELECT\s+([\s\S]*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]*?))?(?:\s+ORDER BY\s+([\s\S]*?))?(?:\s+LIMIT\s+(\d+))?$/i);
      if (!m) return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
      const selCols = m[1].trim();
      const t = m[2];
      const whereClause = m[3] || '';
      const orderBy = m[4];
      const limit = m[5];
      let rows = tables[t] || [];
      if (whereClause) rows = rows.filter(row => evalCond(row, whereClause, params, { i: 0 }));
      if (orderBy) {
        const ob = orderBy.trim();
        const desc = /DESC$/i.test(ob);
        const col = ob.replace(/\s+(ASC|DESC)$/i, '').trim();
        rows = [...rows].sort((a, b) => {
          const av = a[col], bv = b[col];
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (desc ? -1 : 1);
        });
      }
      let result = rows;
      if (selCols !== '*') {
        const cols = selCols.split(',').map(c => c.trim());
        result = rows.map(r => {
          const o: any = {};
          cols.forEach(c => {
            const asM = c.match(/(\S+)\s+AS\s+(\w+)/i);
            if (asM) o[asM[2]] = r[asM[1]];
            else o[c] = r[c];
          });
          return o;
        });
      }
      if (limit) result = result.slice(0, Number(limit));
      return Promise.resolve({ rowsAffected: 0, rows: { _array: result, length: result.length } });
    }

    return Promise.resolve({ rowsAffected: 0, rows: { _array: [], length: 0 } });
  }

  return { exec, close: async () => { save(); } };
}
