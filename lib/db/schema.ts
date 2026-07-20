export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  supplier_id INTEGER,
  unit TEXT NOT NULL DEFAULT 'Piece',
  cost_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_headers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  invoice_number TEXT,
  date INTEGER NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  remaining_balance REAL NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  transaction_number TEXT DEFAULT '',
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_header_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Piece',
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (purchase_header_id) REFERENCES purchase_headers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sale_headers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  is_walkin INTEGER NOT NULL DEFAULT 0,
  date INTEGER NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  amount_received REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  transaction_number TEXT DEFAULT '',
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_header_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Piece',
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (sale_header_id) REFERENCES sale_headers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  date INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS customer_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  date INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Cash',
  bank_name TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  opening_balance REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  purchase_header_id INTEGER,
  amount REAL NOT NULL DEFAULT 0,
  payment_date INTEGER NOT NULL,
  payment_time TEXT DEFAULT '',
  payment_mode TEXT DEFAULT 'Cash',
  bank_account_id INTEGER,
  bank_name TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  transaction_number TEXT DEFAULT '',
  cheque_number TEXT DEFAULT '',
  reference_number TEXT DEFAULT '',
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (purchase_header_id) REFERENCES purchase_headers(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS payment_proof_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_payment_id INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  sale_header_id INTEGER,
  amount REAL NOT NULL DEFAULT 0,
  payment_date INTEGER NOT NULL,
  payment_time TEXT DEFAULT '',
  payment_mode TEXT DEFAULT 'Cash',
  bank_account_id INTEGER,
  bank_name TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  transaction_number TEXT DEFAULT '',
  reference_number TEXT DEFAULT '',
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sale_header_id) REFERENCES sale_headers(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS customer_payment_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_payment_id INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'Piece',
  reference_type TEXT DEFAULT '',
  reference_id INTEGER DEFAULT 0,
  note TEXT,
  date INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// Migration: expand suppliers table with new columns and add purchase
// header/items tables. Uses ALTER TABLE ADD COLUMN which is idempotent-safe
// via a PRAGMA check wrapper in database.ts.
export const MIGRATION_SQL = `
ALTER TABLE suppliers ADD COLUMN whatsapp TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN city TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN state TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN opening_balance REAL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE supplier_ledger ADD COLUMN payment_method TEXT DEFAULT '';
ALTER TABLE supplier_ledger ADD COLUMN transaction_number TEXT DEFAULT '';
ALTER TABLE supplier_ledger ADD COLUMN ref_type TEXT DEFAULT '';
ALTER TABLE supplier_ledger ADD COLUMN ref_id INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN whatsapp TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN city TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN opening_balance REAL DEFAULT 0;
ALTER TABLE customers ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE customer_ledger ADD COLUMN payment_method TEXT DEFAULT '';
ALTER TABLE customer_ledger ADD COLUMN transaction_number TEXT DEFAULT '';
ALTER TABLE customer_ledger ADD COLUMN ref_type TEXT DEFAULT '';
ALTER TABLE customer_ledger ADD COLUMN ref_id INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN design_number TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN brand TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN color TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN size TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN box_conversion REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN dozen_conversion REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN wholesale_price REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN retail_price REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN barcode TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN qr_code TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE purchase_headers ADD COLUMN discount REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_headers ADD COLUMN transport_charges REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_headers ADD COLUMN other_charges REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_headers ADD COLUMN grand_total REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN selling_price REAL NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN gst_number TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE sale_headers ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0;
ALTER TABLE sale_headers ADD COLUMN extra_charges REAL NOT NULL DEFAULT 0;
ALTER TABLE sale_headers ADD COLUMN payment_date INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sale_headers ADD COLUMN payment_time TEXT DEFAULT '';
ALTER TABLE sale_headers ADD COLUMN upi_id TEXT DEFAULT '';
ALTER TABLE sale_headers ADD COLUMN bank_account_id INTEGER;
ALTER TABLE sale_headers ADD COLUMN reference_number TEXT DEFAULT '';
ALTER TABLE sale_headers ADD COLUMN payment_screenshot TEXT DEFAULT '';
`;

export const MIGRATION_SQL_2 = `
ALTER TABLE customers ADD COLUMN state TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE customers ADD COLUMN photo TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN photo TEXT DEFAULT '';
ALTER TABLE purchase_headers ADD COLUMN payment_date INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_headers ADD COLUMN payment_time TEXT DEFAULT '';
ALTER TABLE purchase_headers ADD COLUMN upi_id TEXT DEFAULT '';
ALTER TABLE purchase_headers ADD COLUMN reference_number TEXT DEFAULT '';
ALTER TABLE purchase_headers ADD COLUMN payment_screenshot TEXT DEFAULT '';
`;

export const MIGRATION_SQL_3 = `
-- Placeholder for future migrations
`;

export const SEED_CATEGORIES = [
  'Toda',
  'Plain Toda',
  'Pakki Toda',
  'Plain Dibbi',
  'Jari Dibbi',
  'Zircon Dibbi',
  'Juliet Kangan',
  'Loose Glass Bangles',
  'Fancy Bangles',
];

export const UNITS = ['Box', 'Dozen', 'Piece'] as const;
export type Unit = (typeof UNITS)[number];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
