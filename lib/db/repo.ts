import { getDb } from './database';
import { UNITS, Unit, PAYMENT_METHODS, PaymentMethod } from './schema';

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: number;
}

export interface Product {
  id?: number;
  name: string;
  design_number: string;
  brand: string;
  category_id: number;
  supplier_id?: number | null;
  color: string;
  size: string;
  unit: Unit;
  box_conversion: number;
  dozen_conversion: number;
  cost_price: number;
  wholesale_price: number;
  retail_price: number;
  sale_price: number;
  min_stock: number;
  barcode: string;
  qr_code: string;
  image: string;
  notes: string;
  created_at?: number;
}

export interface ProductVariant {
  id?: number;
  product_id: number;
  size: string;
  color: string;
  quantity: number;
}

export interface ProductWithDetails extends Product {
  id: number;
  category_name: string;
  supplier_name?: string;
  total_stock: number;
  variant_count: number;
  variants?: ProductVariant[];
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM categories ORDER BY name');
  return res.rows._array || [];
}

export async function getAllSuppliers(): Promise<{ id: number; name: string }[]> {
  const db = await getDb();
  const res = await db.exec('SELECT id, name FROM suppliers ORDER BY name');
  return res.rows._array || [];
}

export async function getAllProducts(): Promise<ProductWithDetails[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT p.*, c.name AS category_name, s.name AS supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.created_at DESC
  `);
  const products = res.rows._array || [];
  for (const p of products) {
    const vRes = await db.exec(
      'SELECT * FROM product_variants WHERE product_id = ?',
      [p.id]
    );
    p.variants = vRes.rows._array || [];
    p.total_stock = (vRes.rows._array || []).reduce((s: number, v: any) => s + (v.quantity || 0), 0);
    p.variant_count = (vRes.rows._array || []).length;
  }
  return products;
}

export async function getProductById(id: number): Promise<ProductWithDetails | null> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT p.*, c.name AS category_name, s.name AS supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `, [id]);
  if (res.rows.length === 0) return null;
  const product = res.rows._array[0];
  const vRes = await db.exec('SELECT * FROM product_variants WHERE product_id = ?', [id]);
  product.variants = vRes.rows._array || [];
  product.total_stock = (vRes.rows._array || []).reduce((s: number, v: any) => s + (v.quantity || 0), 0);
  return product;
}

export async function getProductStock(productId: number, variantId: number | null): Promise<number> {
  const db = await getDb();
  if (variantId) {
    const res = await db.exec('SELECT quantity FROM product_variants WHERE id = ?', [variantId]);
    return res.rows.length > 0 ? (res.rows._array[0].quantity || 0) : 0;
  }
  const res = await db.exec('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
  return (res.rows._array || []).reduce((s: number, v: any) => s + (v.quantity || 0), 0);
}

export async function addProduct(product: Product, variants: Omit<ProductVariant, 'product_id'>[]): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.exec(
    `INSERT INTO products (name, design_number, brand, category_id, supplier_id, color, size, unit, box_conversion, dozen_conversion, cost_price, wholesale_price, retail_price, sale_price, min_st[...]
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.name, product.design_number || '', product.brand || '', product.category_id,
      product.supplier_id ?? null, product.color || '', product.size || '', product.unit,
      product.box_conversion || 0, product.dozen_conversion || 0, product.cost_price || 0,
      product.wholesale_price || 0, product.retail_price || 0, product.sale_price || 0,
      product.min_stock || 0, product.barcode || '', product.qr_code || '', product.image || '', product.notes || '', now,
    ]
  );
  const productId = res.insertId!;
  for (const v of variants) {
    await db.exec(
      'INSERT INTO product_variants (product_id, size, color, quantity) VALUES (?, ?, ?, ?)',
      [productId, v.size || '', v.color || '', v.quantity || 0]
    );
  }
  return productId;
}

export async function updateProduct(id: number, product: Product, variants: Omit<ProductVariant, 'product_id'>[]): Promise<void> {
  const db = await getDb();
  await db.exec(
    `UPDATE products SET name = ?, design_number = ?, brand = ?, category_id = ?, supplier_id = ?, color = ?, size = ?, unit = ?, box_conversion = ?, dozen_conversion = ?, cost_price = ?, wholesa[...]
    [
      product.name, product.design_number || '', product.brand || '', product.category_id,
      product.supplier_id ?? null, product.color || '', product.size || '', product.unit,
      product.box_conversion || 0, product.dozen_conversion || 0, product.cost_price || 0,
      product.wholesale_price || 0, product.retail_price || 0, product.sale_price || 0,
      product.min_stock || 0, product.barcode || '', product.qr_code || '', product.image || '', product.notes || '', id,
    ]
  );
  await db.exec('DELETE FROM product_variants WHERE product_id = ?', [id]);
  for (const v of variants) {
    await db.exec(
      'INSERT INTO product_variants (product_id, size, color, quantity) VALUES (?, ?, ?, ?)',
      [id, v.size || '', v.color || '', v.quantity || 0]
    );
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM product_variants WHERE product_id = ?', [id]);
  await db.exec('DELETE FROM products WHERE id = ?', [id]);
}

export async function addCategory(name: string, description = ''): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO categories (name, description, created_at) VALUES (?, ?, ?)',
    [name, description, Date.now()]
  );
  return res.insertId!;
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM categories WHERE id = ?', [id]);
}

export async function getDashboardStats(): Promise<{
  productCount: number;
  categoryCount: number;
  totalStock: number;
  totalProductsValue: number;
  lowStockCount: number;
  supplierCount: number;
  customerCount: number;
  todayPurchase: number;
  todaySales: number;
  pendingSupplierBalance: number;
  pendingCustomerBalance: number;
  recentTransactions: Array<{
    id: number;
    type: 'purchase' | 'sale' | 'supplier_payment' | 'customer_payment';
    label: string;
    amount: number;
    date: number;
    party: string;
  }>;
}> {
  const db = await getDb();
  const [products, categories, variants, suppliers, customers, purchases, sales, supplierLedger, customerLedger] = await Promise.all([
    db.exec('SELECT * FROM products'),
    db.exec('SELECT * FROM categories'),
    db.exec('SELECT * FROM product_variants'),
    db.exec('SELECT * FROM suppliers'),
    db.exec('SELECT * FROM customers'),
    db.exec('SELECT * FROM purchase_headers ORDER BY date DESC LIMIT 50'),
    db.exec('SELECT * FROM sale_headers ORDER BY date DESC LIMIT 50'),
    db.exec('SELECT * FROM supplier_ledger ORDER BY date DESC LIMIT 50'),
    db.exec('SELECT * FROM customer_ledger ORDER BY date DESC LIMIT 50'),
  ]);
  const productList = products.rows._array || [];
  const variantList = variants.rows._array || [];
  const totalStock = variantList.reduce((s: number, v: any) => s + (v.quantity || 0), 0);
  const totalProductsValue = productList.reduce((s: number, p: any) => {
    const stock = variantList.filter((v: any) => v.product_id === p.id).reduce((sv: number, v: any) => sv + (v.quantity || 0), 0);
    return s + stock * (p.cost_price || 0);
  }, 0);
  const lowStockCount = productList.filter((p: any) => {
    const stock = variantList.filter((v: any) => v.product_id === p.id).reduce((sv: number, v: any) => sv + (v.quantity || 0), 0);
    return stock > 0 && stock <= 10;
  }).length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();
  const todayPurchase = (purchases.rows._array || [])
    .filter((p: any) => p.date >= todayTs)
    .reduce((s: number, p: any) => s + (p.grand_total || p.subtotal || 0), 0);
  const todaySales = (sales.rows._array || [])
    .filter((s: any) => s.date >= todayTs)
    .reduce((s: number, h: any) => s + (h.grand_total || h.subtotal || 0), 0);

  const pendingSupplierBalance = (suppliers.rows._array || []).reduce((s: number, sup: any) => {
    const entries = (supplierLedger.rows._array || []).filter((e: any) => e.supplier_id === sup.id);
    const purchase = entries.filter((e: any) => e.type === 'purchase' || e.type === 'opening').reduce((a: number, e: any) => a + (e.amount || 0), 0);
    const paid = entries.filter((e: any) => e.type === 'payment').reduce((a: number, e: any) => a + (e.amount || 0), 0);
    return s + Math.max(0, purchase - paid);
  }, 0);

  const pendingCustomerBalance = (customers.rows._array || []).reduce((s: number, c: any) => {
    const entries = (customerLedger.rows._array || []).filter((e: any) => e.customer_id === c.id);
    const purchase = entries.filter((e: any) => e.type === 'sale' || e.type === 'opening').reduce((a: number, e: any) => a + (e.amount || 0), 0);
    const paid = entries.filter((e: any) => e.type === 'payment').reduce((a: number, e: any) => a + (e.amount || 0), 0);
    return s + Math.max(0, purchase - paid);
  }, 0);

  const recentMap = new Map<number, any>();
  for (const p of (purchases.rows._array || [])) {
    recentMap.set(p.id, { id: p.id, type: 'purchase' as const, label: `Purchase ${p.invoice_number || `#${p.id}`}`, amount: p.grand_total || p.subtotal || 0, date: p.date, party: p.supplier_id })[...]
  }
  for (const s of (sales.rows._array || [])) {
    recentMap.set(s.id + 1000000, { id: s.id, type: 'sale' as const, label: `Sale ${s.invoice_number || `#${s.id}`}`, amount: s.grand_total || s.subtotal || 0, date: s.date, party: s.customer_nam[...]
  }
  const recentTransactions = Array.from(recentMap.values())
    .sort((a, b) => b.date - a.date)
    .slice(0, 8);

  return {
    productCount: products.rows.length,
    categoryCount: categories.rows.length,
    totalStock,
    totalProductsValue,
    lowStockCount,
    supplierCount: suppliers.rows.length,
    customerCount: customers.rows.length,
    todayPurchase,
    todaySales,
    pendingSupplierBalance,
    pendingCustomerBalance,
    recentTransactions,
  };
}

export { UNITS, PAYMENT_METHODS };
export type { Unit, PaymentMethod };

// ============================================================
// SUPPLIER CRUD
// ============================================================

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gst_number: string;
  opening_balance: number;
  notes: string;
  status: string;
  photo: string;
  created_at?: number;
}

export interface SupplierWithStats extends Supplier {
  id: number;
  total_purchase: number;
  total_paid: number;
  remaining_balance: number;
}

export async function getAllSuppliersFull(): Promise<SupplierWithStats[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM suppliers ORDER BY name');
  const suppliers: SupplierWithStats[] = [];
  for (const s of (res.rows._array || [])) {
    const stats = await getSupplierLedgerTotals(s.id);
    suppliers.push({
      ...s,
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      city: s.city || '',
      state: s.state || '',
      gst_number: s.gst_number || '',
      opening_balance: s.opening_balance || 0,
      notes: s.notes || '',
      status: s.status || 'Active',
      photo: s.photo || '',
      total_purchase: stats.totalPurchase,
      total_paid: stats.totalPaid,
      remaining_balance: stats.remainingBalance,
    });
  }
  return suppliers;
}

export async function getSupplierById(id: number): Promise<SupplierWithStats | null> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM suppliers WHERE id = ?', [id]);
  if (res.rows.length === 0) return null;
  const s = res.rows._array[0];
  const stats = await getSupplierLedgerTotals(id);
  return {
    ...s,
    whatsapp: s.whatsapp || '',
    email: s.email || '',
    city: s.city || '',
    state: s.state || '',
    gst_number: s.gst_number || '',
    opening_balance: s.opening_balance || 0,
    notes: s.notes || '',
    status: s.status || 'Active',
    photo: s.photo || '',
    total_purchase: stats.totalPurchase,
    total_paid: stats.totalPaid,
    remaining_balance: stats.remainingBalance,
  };
}

[...]
