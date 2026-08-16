export const MIGRATION_SQL_7 = `
CREATE TABLE IF NOT EXISTS quick_bill_headers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quick_bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quick_bill_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (quick_bill_id) REFERENCES quick_bill_headers(id) ON DELETE CASCADE
);
`;
