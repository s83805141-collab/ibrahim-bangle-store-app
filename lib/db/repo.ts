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
    `INSERT INTO products (name, design_number, brand, category_id, supplier_id, color, size, unit, box_conversion, dozen_conversion, cost_price, wholesale_price, retail_price, sale_price, min_stock, barcode, qr_code, image, notes, created_at)
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
    `UPDATE products SET name = ?, design_number = ?, brand = ?, category_id = ?, supplier_id = ?, color = ?, size = ?, unit = ?, box_conversion = ?, dozen_conversion = ?, cost_price = ?, wholesale_price = ?, retail_price = ?, sale_price = ?, min_stock = ?, barcode = ?, qr_code = ?, image = ?, notes = ? WHERE id = ?`,
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
    recentMap.set(p.id, { id: p.id, type: 'purchase' as const, label: `Purchase ${p.invoice_number || `#${p.id}`}`, amount: p.grand_total || p.subtotal || 0, date: p.date, party: p.supplier_id });
  }
  for (const s of (sales.rows._array || [])) {
    recentMap.set(s.id + 1000000, { id: s.id, type: 'sale' as const, label: `Sale ${s.invoice_number || `#${s.id}`}`, amount: s.grand_total || s.subtotal || 0, date: s.date, party: s.customer_name });
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

export async function addSupplier(supplier: Supplier): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO suppliers (name, phone, whatsapp, email, address, city, state, gst_number, opening_balance, notes, status, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [supplier.name, supplier.phone || '', supplier.whatsapp || '', supplier.email || '', supplier.address || '', supplier.city || '', supplier.state || '', supplier.gst_number || '', supplier.opening_balance || 0, supplier.notes || '', supplier.status || 'Active', supplier.photo || '', Date.now()]
  );
  const supplierId = res.insertId!;
  if (supplier.opening_balance && supplier.opening_balance > 0) {
    await db.exec(
      'INSERT INTO supplier_ledger (supplier_id, type, amount, date, note, payment_method, transaction_number, ref_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [supplierId, 'opening', supplier.opening_balance, Date.now(), 'Opening balance', '', '', 'opening']
    );
  }
  return supplierId;
}

export async function updateSupplier(id: number, supplier: Supplier): Promise<void> {
  const db = await getDb();
  await db.exec(
    'UPDATE suppliers SET name = ?, phone = ?, whatsapp = ?, email = ?, address = ?, city = ?, state = ?, gst_number = ?, opening_balance = ?, notes = ?, status = ?, photo = ? WHERE id = ?',
    [supplier.name, supplier.phone || '', supplier.whatsapp || '', supplier.email || '', supplier.address || '', supplier.city || '', supplier.state || '', supplier.gst_number || '', supplier.opening_balance || 0, supplier.notes || '', supplier.status || 'Active', supplier.photo || '', id]
  );
}

export async function deleteSupplier(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM supplier_ledger WHERE supplier_id = ?', [id]);
  await db.exec('DELETE FROM purchase_items WHERE purchase_header_id IN (SELECT id FROM purchase_headers WHERE supplier_id = ?)', [id]);
  await db.exec('DELETE FROM purchase_headers WHERE supplier_id = ?', [id]);
  await db.exec('DELETE FROM suppliers WHERE id = ?', [id]);
}

// ============================================================
// PURCHASE MANAGEMENT (header + line items)
// ============================================================

export interface PurchaseItemInput {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit: Unit;
  unit_price: number;
  selling_price: number;
  total: number;
}

export interface PurchaseHeader {
  id?: number;
  supplier_id: number;
  invoice_number: string;
  date: number;
  subtotal: number;
  discount: number;
  transport_charges: number;
  other_charges: number;
  grand_total: number;
  amount_paid: number;
  remaining_balance: number;
  payment_method: PaymentMethod;
  transaction_number: string;
  note: string;
  payment_date: number;
  payment_time: string;
  upi_id: string;
  reference_number: string;
  payment_screenshot: string;
  created_at?: number;
}

export interface PurchaseHeaderWithDetails extends PurchaseHeader {
  id: number;
  supplier_name: string;
  items: PurchaseItemDetail[];
  payments?: SupplierPayment[];
}

export interface PurchaseItemDetail {
  id: number;
  purchase_header_id: number;
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  selling_price: number;
  total: number;
}

export interface SupplierPaymentInput {
  amount: number;
  payment_date: number;
  payment_time: string;
  payment_mode: string;
  bank_account_id?: number | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  upi_id: string;
  transaction_number: string;
  cheque_number: string;
  reference_number: string;
  note: string;
  proof_images: string[];
}

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  purchase_header_id?: number | null;
  amount: number;
  payment_date: number;
  payment_time: string;
  payment_mode: string;
  bank_account_id?: number | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  upi_id: string;
  transaction_number: string;
  cheque_number: string;
  reference_number: string;
  note: string;
  created_at: number;
  proof_images?: PaymentProofImage[];
}

export interface PaymentProofImage {
  id: number;
  supplier_payment_id: number;
  image_path: string;
  caption: string;
  created_at: number;
}

export async function addPurchase(
  header: PurchaseHeader,
  items: PurchaseItemInput[],
  payments: SupplierPaymentInput[] = []
): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const grandTotal = header.grand_total || (header.subtotal - (header.discount || 0) + (header.transport_charges || 0) + (header.other_charges || 0));
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0) || header.amount_paid;
  const remaining = Math.max(0, grandTotal - totalPaid);
  const res = await db.exec(
    'INSERT INTO purchase_headers (supplier_id, invoice_number, date, subtotal, discount, transport_charges, other_charges, grand_total, amount_paid, remaining_balance, payment_method, transaction_number, note, payment_date, payment_time, upi_id, reference_number, payment_screenshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [header.supplier_id, header.invoice_number || '', header.date, header.subtotal, header.discount || 0, header.transport_charges || 0, header.other_charges || 0, grandTotal, totalPaid, remaining, header.payment_method, header.transaction_number || '', header.note || '', header.payment_date || 0, header.payment_time || '', header.upi_id || '', header.reference_number || '', header.payment_screenshot || '', now]
  );
  const headerId = res.insertId!;

  for (const item of items) {
    await db.exec(
      'INSERT INTO purchase_items (purchase_header_id, product_id, variant_id, quantity, unit, unit_price, selling_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [headerId, item.product_id, item.variant_id ?? null, item.quantity, item.unit, item.unit_price, item.selling_price || 0, item.total]
    );
    if (item.variant_id) {
      await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.variant_id]);
    } else {
      const vRes = await db.exec('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [item.product_id]);
      if (vRes.rows.length > 0) {
        await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [item.quantity, vRes.rows._array[0].id]);
      } else {
        await db.exec('INSERT INTO product_variants (product_id, size, color, quantity) VALUES (?, ?, ?, ?)', [item.product_id, '', '', item.quantity]);
      }
    }
    await addStockMovement(item.product_id, item.variant_id ?? null, 'purchase', item.quantity, item.unit, 'purchase', headerId, `Purchase ${header.invoice_number || ''}`.trim());
  }

  await db.exec(
    'INSERT INTO supplier_ledger (supplier_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [header.supplier_id, 'purchase', grandTotal, header.date, `Purchase ${header.invoice_number || ''}`.trim(), '', '', 'purchase', headerId]
  );

  for (const payment of payments) {
    const payRes = await db.exec(
      `INSERT INTO supplier_payments (supplier_id, purchase_header_id, amount, payment_date, payment_time, payment_mode, bank_account_id, bank_name, account_name, account_number, upi_id, transaction_number, cheque_number, reference_number, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [header.supplier_id, headerId, payment.amount, payment.payment_date, payment.payment_time || '', payment.payment_mode, payment.bank_account_id ?? null, payment.bank_name || '', payment.account_name || '', payment.account_number || '', payment.upi_id || '', payment.transaction_number || '', payment.cheque_number || '', payment.reference_number || '', payment.note || '', now]
    );
    const paymentId = payRes.insertId!;
    for (const imgPath of payment.proof_images || []) {
      await db.exec('INSERT INTO payment_proof_images (supplier_payment_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', [paymentId, imgPath, '', now]);
    }
    await db.exec(
      'INSERT INTO supplier_ledger (supplier_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [header.supplier_id, 'payment', payment.amount, payment.payment_date, `Payment for ${header.invoice_number || ''}`.trim(), payment.payment_mode, payment.transaction_number || '', 'payment', paymentId]
    );
  }

  return headerId;
}

export async function getAllPurchases(): Promise<PurchaseHeaderWithDetails[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT ph.*, s.name AS supplier_name
    FROM purchase_headers ph
    LEFT JOIN suppliers s ON ph.supplier_id = s.id
    ORDER BY ph.date DESC
  `);
  const purchases: PurchaseHeaderWithDetails[] = [];
  for (const h of (res.rows._array || [])) {
    const items = await getPurchaseItems(h.id);
    const payments = await getPaymentsByPurchase(h.id);
    purchases.push({ ...h, items, payments });
  }
  return purchases;
}

export async function getPurchaseItems(headerId: number): Promise<PurchaseItemDetail[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT pi.*, p.name AS product_name,
      (COALESCE(pv.size, '') || ' ' || COALESCE(pv.color, '')) AS variant_label
    FROM purchase_items pi
    LEFT JOIN products p ON pi.product_id = p.id
    LEFT JOIN product_variants pv ON pi.variant_id = pv.id
    WHERE pi.purchase_header_id = ?
  `, [headerId]);
  return (res.rows._array || []).map((item: any) => ({
    ...item,
    variant_label: item.variant_label ? item.variant_label.trim() : undefined,
  }));
}

export async function deletePurchase(headerId: number): Promise<void> {
  const db = await getDb();
  const items = await getPurchaseItems(headerId);
  for (const item of items) {
    if (item.variant_id) {
      await db.exec('UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?', [item.quantity, item.variant_id]);
    } else {
      const vRes = await db.exec('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [item.product_id]);
      if (vRes.rows.length > 0) {
        await db.exec('UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?', [item.quantity, vRes.rows._array[0].id]);
      }
    }
  }
  const payments = await getPaymentsByPurchase(headerId);
  for (const p of payments) {
    await db.exec('DELETE FROM payment_proof_images WHERE supplier_payment_id = ?', [p.id]);
  }
  await db.exec('DELETE FROM supplier_payments WHERE purchase_header_id = ?', [headerId]);
  await db.exec('DELETE FROM supplier_ledger WHERE ref_type = ? AND ref_id = ?', ['purchase', headerId]);
  await db.exec('DELETE FROM supplier_ledger WHERE ref_type = ? AND ref_id = ?', ['payment', headerId]);
  await db.exec('DELETE FROM purchase_items WHERE purchase_header_id = ?', [headerId]);
  await db.exec('DELETE FROM purchase_headers WHERE id = ?', [headerId]);
}

// ============================================================
// SUPPLIER LEDGER
// ============================================================

export interface LedgerEntry {
  id: number;
  supplier_id: number;
  type: string;
  amount: number;
  date: number;
  note: string;
  payment_method: string;
  transaction_number: string;
  ref_type: string;
  ref_id: number;
}

export interface SupplierLedgerSummary {
  totalPurchase: number;
  totalPaid: number;
  remainingBalance: number;
}

export async function getSupplierLedgerEntries(supplierId: number): Promise<LedgerEntry[]> {
  const db = await getDb();
  const res = await db.exec(
    'SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC',
    [supplierId]
  );
  return res.rows._array || [];
}

export interface LedgerEntryWithBalance extends LedgerEntry {
  running_balance: number;
}

export async function getSupplierLedgerWithRunningBalance(supplierId: number, fromDate?: number, toDate?: number): Promise<LedgerEntryWithBalance[]> {
  const db = await getDb();
  let sql = 'SELECT * FROM supplier_ledger WHERE supplier_id = ?';
  const params: any[] = [supplierId];
  if (fromDate) { sql += ' AND date >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND date <= ?'; params.push(toDate); }
  sql += ' ORDER BY date ASC, id ASC';
  const res = await db.exec(sql, params);
  let running = 0;
  return (res.rows._array as any[] || []).map((e: any) => {
    if (e.type === 'purchase' || e.type === 'opening') running += e.amount || 0;
    else if (e.type === 'payment') running -= e.amount || 0;
    return { ...e, running_balance: running } as LedgerEntryWithBalance;
  }).reverse();
}

export async function getSupplierLedgerTotals(supplierId: number): Promise<SupplierLedgerSummary> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM supplier_ledger WHERE supplier_id = ?', [supplierId]);
  const entries = res.rows._array || [];
  const totalPurchase = entries
    .filter((e: any) => e.type === 'purchase' || e.type === 'opening')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalPaid = entries
    .filter((e: any) => e.type === 'payment')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const remainingBalance = totalPurchase - totalPaid;
  return { totalPurchase, totalPaid, remainingBalance };
}

export async function addSupplierPayment(
  supplierId: number,
  amount: number,
  date: number,
  paymentMethod: PaymentMethod,
  transactionNumber: string,
  note: string
): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO supplier_ledger (supplier_id, type, amount, date, note, payment_method, transaction_number, ref_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [supplierId, 'payment', amount, date, note || 'Payment', paymentMethod, transactionNumber || '', 'manual_payment']
  );
  return res.insertId!;
}

export async function deleteLedgerEntry(entryId: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM supplier_ledger WHERE id = ?', [entryId]);
}

export async function getPurchasesBySupplier(supplierId: number): Promise<PurchaseHeaderWithDetails[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT ph.*, s.name AS supplier_name
    FROM purchase_headers ph
    LEFT JOIN suppliers s ON ph.supplier_id = s.id
    WHERE ph.supplier_id = ?
    ORDER BY ph.date DESC
  `, [supplierId]);
  const purchases: PurchaseHeaderWithDetails[] = [];
  for (const h of (res.rows._array || [])) {
    const items = await getPurchaseItems(h.id);
    const payments = await getPaymentsByPurchase(h.id);
    purchases.push({ ...h, items, payments });
  }
  return purchases;
}

// ============================================================
// SETTINGS
// ============================================================

export interface ShopSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_footer: string;
}

export const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: 'Ibrahim Bangle Store',
  shop_address: 'Baggi Road, Gonda',
  shop_phone: '',
  shop_footer: 'Thank You For Shopping With Ibrahim Bangle Store',
};

export async function getSettings(): Promise<ShopSettings> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM settings');
  const map: Record<string, string> = {};
  for (const r of (res.rows._array || [])) {
    map[r.key] = r.value;
  }
  return {
    shop_name: map.shop_name || DEFAULT_SETTINGS.shop_name,
    shop_address: map.shop_address || DEFAULT_SETTINGS.shop_address,
    shop_phone: map.shop_phone || DEFAULT_SETTINGS.shop_phone,
    shop_footer: map.shop_footer || DEFAULT_SETTINGS.shop_footer,
  };
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  const db = await getDb();
  const entries: [string, string][] = [
    ['shop_name', settings.shop_name],
    ['shop_address', settings.shop_address],
    ['shop_phone', settings.shop_phone],
    ['shop_footer', settings.shop_footer],
  ];
  for (const [key, value] of entries) {
    await db.exec(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// ============================================================
// CUSTOMER CRUD
// ============================================================

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  opening_balance: number;
  notes: string;
  status: string;
  photo: string;
  created_at?: number;
}

export interface CustomerWithStats extends Customer {
  id: number;
  total_purchase: number;
  total_paid: number;
  outstanding_balance: number;
}

export async function getAllCustomersFull(): Promise<CustomerWithStats[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customers ORDER BY name');
  const customers: CustomerWithStats[] = [];
  for (const c of (res.rows._array || [])) {
    const stats = await getCustomerLedgerTotals(c.id);
    customers.push({
      ...c,
      whatsapp: c.whatsapp || '',
      city: c.city || '',
      state: c.state || '',
      opening_balance: c.opening_balance || 0,
      notes: c.notes || '',
      status: c.status || 'Active',
      photo: c.photo || '',
      total_purchase: stats.totalPurchase,
      total_paid: stats.totalPaid,
      outstanding_balance: stats.outstandingBalance,
    });
  }
  return customers;
}

export async function getCustomerById(id: number): Promise<CustomerWithStats | null> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customers WHERE id = ?', [id]);
  if (res.rows.length === 0) return null;
  const c = res.rows._array[0];
  const stats = await getCustomerLedgerTotals(id);
  return {
    ...c,
    whatsapp: c.whatsapp || '',
    city: c.city || '',
    state: c.state || '',
    opening_balance: c.opening_balance || 0,
    notes: c.notes || '',
    status: c.status || 'Active',
    photo: c.photo || '',
    total_purchase: stats.totalPurchase,
    total_paid: stats.totalPaid,
    outstanding_balance: stats.outstandingBalance,
  };
}

export async function addCustomer(customer: Customer): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO customers (name, phone, whatsapp, address, city, state, opening_balance, notes, status, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [customer.name, customer.phone || '', customer.whatsapp || '', customer.address || '', customer.city || '', customer.state || '', customer.opening_balance || 0, customer.notes || '', customer.status || 'Active', customer.photo || '', Date.now()]
  );
  const customerId = res.insertId!;
  if (customer.opening_balance && customer.opening_balance > 0) {
    await db.exec(
      'INSERT INTO customer_ledger (customer_id, type, amount, date, note, payment_method, transaction_number, ref_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [customerId, 'opening', customer.opening_balance, Date.now(), 'Opening balance', '', '', 'opening']
    );
  }
  return customerId;
}

export async function updateCustomer(id: number, customer: Customer): Promise<void> {
  const db = await getDb();
  await db.exec(
    'UPDATE customers SET name = ?, phone = ?, whatsapp = ?, address = ?, city = ?, state = ?, opening_balance = ?, notes = ?, status = ?, photo = ? WHERE id = ?',
    [customer.name, customer.phone || '', customer.whatsapp || '', customer.address || '', customer.city || '', customer.state || '', customer.opening_balance || 0, customer.notes || '', customer.status || 'Active', customer.photo || '', id]
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM customer_ledger WHERE customer_id = ?', [id]);
  await db.exec('DELETE FROM sale_items WHERE sale_header_id IN (SELECT id FROM sale_headers WHERE customer_id = ?)', [id]);
  await db.exec('DELETE FROM sale_headers WHERE customer_id = ?', [id]);
  await db.exec('DELETE FROM customers WHERE id = ?', [id]);
}

// ============================================================
// SALES MANAGEMENT (header + line items)
// ============================================================

export interface SaleItemInput {
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total: number;
}

export interface SaleHeader {
  id?: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string;
  is_walkin: boolean;
  date: number;
  subtotal: number;
  discount: number;
  discount_percent: number;
  extra_charges: number;
  grand_total: number;
  amount_received: number;
  balance_due: number;
  payment_method: PaymentMethod;
  transaction_number: string;
  note: string;
  payment_date: number;
  payment_time: string;
  upi_id: string;
  bank_account_id: number | null;
  reference_number: string;
  payment_screenshot: string;
  created_at?: number;
}

export interface SaleHeaderWithDetails extends SaleHeader {
  id: number;
  items: SaleItemDetail[];
  customer_phone?: string;
}

export interface SaleItemDetail {
  id: number;
  sale_header_id: number;
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total: number;
}

export async function generateInvoiceNumber(): Promise<string> {
  const all = await getAllSales();
  const count = all.length;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function addSale(
  header: SaleHeader,
  items: SaleItemInput[]
): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.exec(
    'INSERT INTO sale_headers (invoice_number, customer_id, customer_name, is_walkin, date, subtotal, discount, discount_percent, extra_charges, grand_total, amount_received, balance_due, payment_method, transaction_number, note, payment_date, payment_time, upi_id, bank_account_id, reference_number, payment_screenshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      header.invoice_number,
      header.customer_id,
      header.customer_name,
      header.is_walkin ? 1 : 0,
      header.date,
      header.subtotal,
      header.discount,
      header.discount_percent || 0,
      header.extra_charges || 0,
      header.grand_total,
      header.amount_received,
      header.balance_due,
      header.payment_method,
      header.transaction_number || '',
      header.note || '',
      header.payment_date || header.date,
      header.payment_time || '',
      header.upi_id || '',
      header.bank_account_id ?? null,
      header.reference_number || '',
      header.payment_screenshot || '',
      now,
    ]
  );
  const headerId = res.insertId!;

  for (const item of items) {
    const available = await getProductStock(item.product_id, item.variant_id ?? null);
    if (item.quantity > available) {
      throw new Error(`Insufficient stock for a product (available: ${available}, requested: ${item.quantity}). Negative stock is not allowed.`);
    }
    await db.exec(
      'INSERT INTO sale_items (sale_header_id, product_id, variant_id, product_name, quantity, unit, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [headerId, item.product_id, item.variant_id ?? null, item.product_name, item.quantity, item.unit, item.unit_price, item.total]
    );
    if (item.variant_id) {
      await db.exec(
        'UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?',
        [item.quantity, item.variant_id]
      );
    } else {
      const vRes = await db.exec('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [item.product_id]);
      if (vRes.rows.length > 0) {
        await db.exec(
          'UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?',
          [item.quantity, vRes.rows._array[0].id]
        );
      }
    }
    await db.exec(
      'INSERT INTO stock_movements (product_id, variant_id, type, quantity, unit, reference_type, reference_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item.product_id, item.variant_id ?? null, 'sale', item.quantity, item.unit, 'sale', headerId, `Sale ${header.invoice_number}`, now]
    );
  }

  if (!header.is_walkin && header.customer_id) {
    await db.exec(
      'INSERT INTO customer_ledger (customer_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [header.customer_id, 'sale', header.grand_total, header.date, `Sale ${header.invoice_number}`, '', '', 'sale', headerId]
    );
    if (header.amount_received > 0) {
      await db.exec(
        'INSERT INTO customer_ledger (customer_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [header.customer_id, 'payment', header.amount_received, header.date, `Payment for ${header.invoice_number}`, header.payment_method, header.transaction_number || '', 'payment', headerId]
      );
    }
  }

  return headerId;
}

export async function getAllSales(): Promise<SaleHeaderWithDetails[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM sale_headers ORDER BY date DESC');
  const sales: SaleHeaderWithDetails[] = [];
  for (const h of (res.rows._array || [])) {
    const items = await getSaleItems(h.id);
    sales.push({ ...h, is_walkin: !!h.is_walkin, items });
  }
  return sales;
}

export async function getSaleById(id: number): Promise<SaleHeaderWithDetails | null> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT sh.*, c.phone AS customer_phone
    FROM sale_headers sh
    LEFT JOIN customers c ON sh.customer_id = c.id
    WHERE sh.id = ?
  `, [id]);
  if (res.rows.length === 0) return null;
  const h = res.rows._array[0];
  const items = await getSaleItems(id);
  return { ...h, is_walkin: !!h.is_walkin, customer_phone: h.customer_phone || '', items };
}

export async function getSaleItems(headerId: number): Promise<SaleItemDetail[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT si.*, (COALESCE(pv.size, '') || ' ' || COALESCE(pv.color, '')) AS variant_label
    FROM sale_items si
    LEFT JOIN product_variants pv ON si.variant_id = pv.id
    WHERE si.sale_header_id = ?
  `, [headerId]);
  return (res.rows._array || []).map((item: any) => ({
    ...item,
    variant_label: item.variant_label ? item.variant_label.trim() : undefined,
  }));
}

export async function deleteSale(headerId: number): Promise<void> {
  const db = await getDb();
  const items = await getSaleItems(headerId);
  for (const item of items) {
    if (item.variant_id) {
      await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.variant_id]);
    } else {
      const vRes = await db.exec('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [item.product_id]);
      if (vRes.rows.length > 0) {
        await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [item.quantity, vRes.rows._array[0].id]);
      }
    }
  }
  await db.exec('DELETE FROM customer_ledger WHERE ref_type = ? AND ref_id = ?', ['sale', headerId]);
  await db.exec('DELETE FROM customer_ledger WHERE ref_type = ? AND ref_id = ?', ['payment', headerId]);
  await db.exec('DELETE FROM sale_items WHERE sale_header_id = ?', [headerId]);
  await db.exec('DELETE FROM sale_headers WHERE id = ?', [headerId]);
}

export async function getSalesByCustomer(customerId: number): Promise<SaleHeaderWithDetails[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM sale_headers WHERE customer_id = ? ORDER BY date DESC', [customerId]);
  const sales: SaleHeaderWithDetails[] = [];
  for (const h of (res.rows._array || [])) {
    const items = await getSaleItems(h.id);
    sales.push({ ...h, is_walkin: !!h.is_walkin, items });
  }
  return sales;
}

// ============================================================
// CUSTOMER LEDGER
// ============================================================

export interface CustomerLedgerEntry {
  id: number;
  customer_id: number;
  type: string;
  amount: number;
  date: number;
  note: string;
  payment_method: string;
  transaction_number: string;
  ref_type: string;
  ref_id: number;
}

export interface CustomerLedgerSummary {
  totalPurchase: number;
  totalPaid: number;
  outstandingBalance: number;
}

export async function getCustomerLedgerEntries(customerId: number): Promise<CustomerLedgerEntry[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY date DESC', [customerId]);
  return res.rows._array || [];
}

export async function getCustomerLedgerTotals(customerId: number): Promise<CustomerLedgerSummary> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customer_ledger WHERE customer_id = ?', [customerId]);
  const entries = res.rows._array || [];
  const totalPurchase = entries
    .filter((e: any) => e.type === 'sale' || e.type === 'opening')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalPaid = entries
    .filter((e: any) => e.type === 'payment')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const outstandingBalance = totalPurchase - totalPaid;
  return { totalPurchase, totalPaid, outstandingBalance };
}

export async function addCustomerPayment(
  customerId: number,
  amount: number,
  date: number,
  paymentMethod: PaymentMethod,
  transactionNumber: string,
  note: string
): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO customer_ledger (customer_id, type, amount, date, note, payment_method, transaction_number, ref_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [customerId, 'payment', amount, date, note || 'Payment', paymentMethod, transactionNumber || '', 'manual_payment']
  );
  return res.insertId!;
}

export async function deleteCustomerLedgerEntry(entryId: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM customer_ledger WHERE id = ?', [entryId]);
}

// ============================================================
// CUSTOMER PAYMENTS (multi-payment with proof images)
// ============================================================

export interface CustomerPayment {
  id?: number;
  customer_id: number | null;
  sale_header_id: number | null;
  amount: number;
  payment_date: number;
  payment_time: string;
  payment_mode: PaymentMethod;
  bank_account_id: number | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  upi_id: string;
  transaction_number: string;
  reference_number: string;
  note: string;
  created_at?: number;
}

export interface CustomerPaymentWithImages extends CustomerPayment {
  id: number;
  images: PaymentImage[];
}

export interface PaymentImage {
  id: number;
  customer_payment_id: number;
  image_path: string;
  caption: string;
  created_at: number;
}

export async function addCustomerPaymentFull(payment: CustomerPayment, images: string[] = []): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.exec(
    'INSERT INTO customer_payments (customer_id, sale_header_id, amount, payment_date, payment_time, payment_mode, bank_account_id, bank_name, account_name, account_number, upi_id, transaction_number, reference_number, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      payment.customer_id ?? null,
      payment.sale_header_id ?? null,
      payment.amount || 0,
      payment.payment_date || now,
      payment.payment_time || '',
      payment.payment_mode || 'Cash',
      payment.bank_account_id ?? null,
      payment.bank_name || '',
      payment.account_name || '',
      payment.account_number || '',
      payment.upi_id || '',
      payment.transaction_number || '',
      payment.reference_number || '',
      payment.note || '',
      now,
    ]
  );
  const paymentId = res.insertId!;
  for (const img of images) {
    await db.exec(
      'INSERT INTO customer_payment_images (customer_payment_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)',
      [paymentId, img, '', now]
    );
  }
  if (payment.customer_id) {
    await db.exec(
      'INSERT INTO customer_ledger (customer_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [payment.customer_id, 'payment', payment.amount, payment.payment_date || now, payment.note || 'Payment', payment.payment_mode, payment.transaction_number || '', 'customer_payment', paymentId]
    );
  }
  return paymentId;
}

export async function getCustomerPayments(customerId: number): Promise<CustomerPaymentWithImages[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY payment_date DESC', [customerId]);
  const payments: CustomerPaymentWithImages[] = [];
  for (const p of (res.rows._array || [])) {
    const imgRes = await db.exec('SELECT * FROM customer_payment_images WHERE customer_payment_id = ?', [p.id]);
    payments.push({ ...p, images: imgRes.rows._array || [] });
  }
  return payments;
}

export async function deleteCustomerPayment(paymentId: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM customer_payment_images WHERE customer_payment_id = ?', [paymentId]);
  await db.exec('DELETE FROM customer_ledger WHERE ref_type = ? AND ref_id = ?', ['customer_payment', paymentId]);
  await db.exec('DELETE FROM customer_payments WHERE id = ?', [paymentId]);
}

// ============================================================
// LEDGER WITH RUNNING BALANCE
// ============================================================

export interface CustomerLedgerEntryWithBalance extends CustomerLedgerEntry {
  running_balance: number;
}

export async function getCustomerLedgerWithRunningBalance(customerId: number): Promise<CustomerLedgerEntryWithBalance[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY date ASC, id ASC', [customerId]);
  let running = 0;
  return (res.rows._array || []).map((e: any) => {
    if (e.type === 'sale' || e.type === 'opening') {
      running += e.amount || 0;
    } else if (e.type === 'payment') {
      running -= e.amount || 0;
    }
    return { ...e, running_balance: running };
  }).reverse();
}

// ============================================================
// STOCK MOVEMENTS (audit log for all stock changes)
// ============================================================

export type StockMovementType = 'purchase' | 'sale' | 'return' | 'damage' | 'adjustment';

export interface StockMovement {
  id: number;
  product_id: number;
  variant_id?: number | null;
  type: StockMovementType;
  quantity: number;
  unit: Unit;
  reference_type: string;
  reference_id: number;
  note: string;
  date: number;
  product_name?: string;
}

export async function addStockMovement(
  productId: number,
  variantId: number | null,
  type: StockMovementType,
  quantity: number,
  unit: Unit,
  referenceType: string,
  referenceId: number,
  note: string
): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO stock_movements (product_id, variant_id, type, quantity, unit, reference_type, reference_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, variantId, type, quantity, unit, referenceType, referenceId, note, Date.now()]
  );
  return res.insertId!;
}

export async function getAllStockMovements(): Promise<StockMovement[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT sm.*, p.name AS product_name
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    ORDER BY sm.date DESC
  `);
  return res.rows._array || [];
}

export async function getStockMovementsByProduct(productId: number): Promise<StockMovement[]> {
  const db = await getDb();
  const res = await db.exec(`
    SELECT sm.*, p.name AS product_name
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    WHERE sm.product_id = ?
    ORDER BY sm.date DESC
  `, [productId]);
  return res.rows._array || [];
}

export async function adjustStock(
  productId: number,
  variantId: number | null,
  type: StockMovementType,
  quantity: number,
  unit: Unit,
  note: string
): Promise<void> {
  const db = await getDb();
  if (variantId) {
    if (type === 'purchase' || type === 'return' || type === 'adjustment') {
      await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [Math.abs(quantity), variantId]);
    } else {
      await db.exec('UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?', [Math.abs(quantity), variantId]);
    }
  } else {
    const vRes = await db.exec('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [productId]);
    if (vRes.rows.length > 0) {
      const vid = vRes.rows._array[0].id;
      if (type === 'purchase' || type === 'return' || type === 'adjustment') {
        await db.exec('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?', [Math.abs(quantity), vid]);
      } else {
        await db.exec('UPDATE product_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?', [Math.abs(quantity), vid]);
      }
    }
  }
  await addStockMovement(productId, variantId, type, quantity, unit, 'manual', 0, note);
}

// ============================================================
// PRODUCT SEARCH (multi-field)
// ============================================================

export async function searchProducts(query: string): Promise<ProductWithDetails[]> {
  const all = await getAllProducts();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.design_number || '').toLowerCase().includes(q) ||
    (p.barcode || '').toLowerCase().includes(q) ||
    (p.category_name || '').toLowerCase().includes(q) ||
    (p.color || '').toLowerCase().includes(q) ||
    (p.size || '').toLowerCase().includes(q)
  );
}

// ============================================================
// LOW STOCK HELPERS
// ============================================================

export async function getLowStockProducts(): Promise<ProductWithDetails[]> {
  const all = await getAllProducts();
  return all.filter(p => p.total_stock <= (p.min_stock || 0) && (p.min_stock || 0) > 0);
}

export async function getOutOfStockProducts(): Promise<ProductWithDetails[]> {
  const all = await getAllProducts();
  return all.filter(p => p.total_stock <= 0);
}

// ============================================================
// BANK ACCOUNTS MASTER
// ============================================================

export interface BankAccount {
  id?: number;
  name: string;
  type: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  upi_id: string;
  opening_balance: number;
  notes: string;
  created_at?: number;
}

export async function getAllBankAccounts(): Promise<BankAccount[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM bank_accounts ORDER BY name');
  return res.rows._array || [];
}

export async function getBankAccountById(id: number): Promise<BankAccount | null> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM bank_accounts WHERE id = ?', [id]);
  return res.rows.length > 0 ? res.rows._array[0] : null;
}

export async function addBankAccount(account: BankAccount): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    'INSERT INTO bank_accounts (name, type, bank_name, account_name, account_number, upi_id, opening_balance, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [account.name, account.type || 'Cash', account.bank_name || '', account.account_name || '', account.account_number || '', account.upi_id || '', account.opening_balance || 0, account.notes || '', Date.now()]
  );
  return res.insertId!;
}

export async function updateBankAccount(id: number, account: BankAccount): Promise<void> {
  const db = await getDb();
  await db.exec(
    'UPDATE bank_accounts SET name = ?, type = ?, bank_name = ?, account_name = ?, account_number = ?, upi_id = ?, opening_balance = ?, notes = ? WHERE id = ?',
    [account.name, account.type || 'Cash', account.bank_name || '', account.account_name || '', account.account_number || '', account.upi_id || '', account.opening_balance || 0, account.notes || '', id]
  );
}

export async function deleteBankAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM bank_accounts WHERE id = ?', [id]);
}

// ============================================================
// SUPPLIER PAYMENTS CRUD
// ============================================================

export async function getPaymentsByPurchase(purchaseHeaderId: number): Promise<SupplierPayment[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM supplier_payments WHERE purchase_header_id = ? ORDER BY payment_date DESC', [purchaseHeaderId]);
  const payments: SupplierPayment[] = [];
  for (const p of (res.rows._array || [])) {
    const imgs = await getPaymentProofImages(p.id);
    payments.push({ ...p, proof_images: imgs });
  }
  return payments;
}

export async function getPaymentsBySupplier(supplierId: number): Promise<SupplierPayment[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY payment_date DESC', [supplierId]);
  const payments: SupplierPayment[] = [];
  for (const p of (res.rows._array || [])) {
    const imgs = await getPaymentProofImages(p.id);
    payments.push({ ...p, proof_images: imgs });
  }
  return payments;
}

export async function getAllSupplierPayments(): Promise<SupplierPayment[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM supplier_payments ORDER BY payment_date DESC');
  const payments: SupplierPayment[] = [];
  for (const p of (res.rows._array || [])) {
    const imgs = await getPaymentProofImages(p.id);
    payments.push({ ...p, proof_images: imgs });
  }
  return payments;
}

export async function addStandaloneSupplierPayment(
  supplierId: number,
  payment: SupplierPaymentInput
): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.exec(
    `INSERT INTO supplier_payments (supplier_id, purchase_header_id, amount, payment_date, payment_time, payment_mode, bank_account_id, bank_name, account_name, account_number, upi_id, transaction_number, cheque_number, reference_number, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [supplierId, null, payment.amount, payment.payment_date, payment.payment_time || '', payment.payment_mode, payment.bank_account_id ?? null, payment.bank_name || '', payment.account_name || '', payment.account_number || '', payment.upi_id || '', payment.transaction_number || '', payment.cheque_number || '', payment.reference_number || '', payment.note || '', now]
  );
  const paymentId = res.insertId!;
  for (const imgPath of payment.proof_images || []) {
    await db.exec('INSERT INTO payment_proof_images (supplier_payment_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', [paymentId, imgPath, '', now]);
  }
  await db.exec(
    'INSERT INTO supplier_ledger (supplier_id, type, amount, date, note, payment_method, transaction_number, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [supplierId, 'payment', payment.amount, payment.payment_date, payment.note || 'Payment', payment.payment_mode, payment.transaction_number || '', 'manual_payment', paymentId]
  );
  return paymentId;
}

export async function deleteSupplierPayment(paymentId: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM payment_proof_images WHERE supplier_payment_id = ?', [paymentId]);
  await db.exec('DELETE FROM supplier_ledger WHERE ref_type = ? AND ref_id = ?', ['manual_payment', paymentId]);
  await db.exec('DELETE FROM supplier_payments WHERE id = ?', [paymentId]);
}

// ============================================================
// PAYMENT PROOF IMAGES
// ============================================================

export async function getPaymentProofImages(paymentId: number): Promise<PaymentProofImage[]> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM payment_proof_images WHERE supplier_payment_id = ?', [paymentId]);
  return res.rows._array || [];
}

export async function addPaymentProofImage(paymentId: number, imagePath: string, caption = ''): Promise<number> {
  const db = await getDb();
  const res = await db.exec('INSERT INTO payment_proof_images (supplier_payment_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', [paymentId, imagePath, caption, Date.now()]);
  return res.insertId!;
}

export async function deletePaymentProofImage(imageId: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM payment_proof_images WHERE id = ?', [imageId]);
}

// ============================================================
// SUPPLIER LEDGER - FILTERS, SEARCH, RUNNING BALANCE
// ============================================================

export interface LedgerFilter {
  startDate?: number;
  endDate?: number;
  month?: number;
  year?: number;
  supplierId?: number;
  paymentMode?: string;
  search?: string;
}

export async function getFilteredSupplierLedgerEntries(filter: LedgerFilter): Promise<(LedgerEntry & { supplier_name?: string; running_balance?: number })[]> {
  const db = await getDb();
  let query = `
    SELECT sl.*, s.name AS supplier_name
    FROM supplier_ledger sl
    LEFT JOIN suppliers s ON sl.supplier_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filter.supplierId) { query += ' AND sl.supplier_id = ?'; params.push(filter.supplierId); }
  if (filter.startDate) { query += ' AND sl.date >= ?'; params.push(filter.startDate); }
  if (filter.endDate) { query += ' AND sl.date <= ?'; params.push(filter.endDate); }
  if (filter.month) {
    const year = filter.year || new Date().getFullYear();
    const start = new Date(year, filter.month - 1, 1).getTime();
    const end = new Date(year, filter.month, 0, 23, 59, 59).getTime();
    query += ' AND sl.date >= ? AND sl.date <= ?';
    params.push(start, end);
  }
  if (filter.paymentMode) { query += ' AND sl.payment_method = ?'; params.push(filter.paymentMode); }
  if (filter.search) {
    query += ' AND (sl.note LIKE ? OR s.name LIKE ? OR sl.transaction_number LIKE ?)';
    const q = `%${filter.search}%`;
    params.push(q, q, q);
  }
  query += ' ORDER BY sl.date ASC';
  const res = await db.exec(query, params);
  let running = 0;
  return (res.rows._array || []).map((e: any) => {
    if (e.type === 'purchase' || e.type === 'opening') running += e.amount;
    else if (e.type === 'payment') running -= e.amount;
    return { ...e, running_balance: running };
  });
}

export async function getLatestSupplierTransaction(supplierId: number): Promise<LedgerEntry | null> {
  const db = await getDb();
  const res = await db.exec('SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC LIMIT 1', [supplierId]);
  return res.rows.length > 0 ? res.rows._array[0] : null;
}

// ============================================================
// REPORTS
// ============================================================

export interface SupplierOutstandingReport {
  supplier_id: number;
  supplier_name: string;
  total_purchase: number;
  total_paid: number;
  outstanding: number;
}

export async function getSupplierOutstandingReport(): Promise<SupplierOutstandingReport[]> {
  const suppliers = await getAllSuppliersFull();
  return suppliers.map(s => ({
    supplier_id: s.id,
    supplier_name: s.name,
    total_purchase: s.total_purchase,
    total_paid: s.total_paid,
    outstanding: s.remaining_balance,
  })).filter(r => r.outstanding > 0);
}

export async function getPurchaseReport(startDate?: number, endDate?: number): Promise<PurchaseHeaderWithDetails[]> {
  const all = await getAllPurchases();
  return all.filter(p => {
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });
}

export async function getPaymentReport(startDate?: number, endDate?: number): Promise<SupplierPayment[]> {
  const all = await getAllSupplierPayments();
  return all.filter(p => {
    if (startDate && p.payment_date < startDate) return false;
    if (endDate && p.payment_date > endDate) return false;
    return true;
  });
}

export async function getMonthlyPurchaseReport(year: number): Promise<{ month: number; total: number; count: number }[]> {
  const all = await getAllPurchases();
  const months: { month: number; total: number; count: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const monthPurchases = all.filter(p => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() === m;
    });
    months.push({
      month: m,
      total: monthPurchases.reduce((s, p) => s + (p.grand_total || p.subtotal || 0), 0),
      count: monthPurchases.length,
    });
  }
  return months;
}

// ============================================================
// SALES, PROFIT, CUSTOMER OUTSTANDING & STOCK REPORTS
// ============================================================

export interface SalesReportRow {
  id: number;
  invoice_number: string;
  customer_name: string;
  date: number;
  subtotal: number;
  discount: number;
  extra_charges: number;
  grand_total: number;
  amount_received: number;
  balance_due: number;
  payment_method: string;
  item_count: number;
}

export async function getSalesReport(startDate?: number, endDate?: number): Promise<SalesReportRow[]> {
  const all = await getAllSales();
  let filtered = all;
  if (startDate) filtered = filtered.filter(s => s.date >= startDate);
  if (endDate) filtered = filtered.filter(s => s.date <= endDate);
  return filtered.map(s => ({
    id: s.id, invoice_number: s.invoice_number, customer_name: s.customer_name, date: s.date,
    subtotal: s.subtotal, discount: s.discount, extra_charges: (s as any).extra_charges || 0,
    grand_total: s.grand_total, amount_received: s.amount_received, balance_due: s.balance_due,
    payment_method: s.payment_method, item_count: s.items?.length || 0,
  }));
}

export interface ProfitReportRow {
  date: number;
  invoice_number: string;
  customer_name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export async function getProfitReport(startDate?: number, endDate?: number): Promise<ProfitReportRow[]> {
  const all = await getAllSales();
  let filtered = all;
  if (startDate) filtered = filtered.filter(s => s.date >= startDate);
  if (endDate) filtered = filtered.filter(s => s.date <= endDate);
  const rows: ProfitReportRow[] = [];
  for (const s of filtered) {
    let cost = 0;
    for (const item of s.items || []) {
      const prod = await getProductById(item.product_id);
      cost += (prod?.cost_price || 0) * item.quantity;
    }
    const revenue = s.grand_total || 0;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    rows.push({ date: s.date, invoice_number: s.invoice_number, customer_name: s.customer_name, revenue, cost, profit, margin });
  }
  return rows;
}

export interface CustomerOutstandingReport {
  customer_id: number;
  customer_name: string;
  phone: string;
  total_purchase: number;
  total_paid: number;
  outstanding: number;
}

export async function getCustomerOutstandingReport(): Promise<CustomerOutstandingReport[]> {
  const all = await getAllCustomersFull();
  return all
    .filter(c => c.outstanding_balance > 0)
    .map(c => ({
      customer_id: c.id, customer_name: c.name, phone: c.phone || '',
      total_purchase: c.total_purchase, total_paid: c.total_paid, outstanding: c.outstanding_balance,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

export interface StockReportRow {
  id: number;
  name: string;
  design_number: string;
  category_name: string;
  unit: string;
  total_stock: number;
  min_stock: number;
  cost_price: number;
  stock_value: number;
  status: 'Out of Stock' | 'Low Stock' | 'In Stock';
}

export async function getStockReport(): Promise<StockReportRow[]> {
  const all = await getAllProducts();
  return all.map(p => {
    const status: 'Out of Stock' | 'Low Stock' | 'In Stock' =
      p.total_stock <= 0 ? 'Out of Stock' :
      (p.min_stock || 0) > 0 && p.total_stock <= (p.min_stock || 0) ? 'Low Stock' : 'In Stock';
    return {
      id: p.id, name: p.name, design_number: p.design_number || '', category_name: p.category_name || '',
      unit: p.unit, total_stock: p.total_stock || 0, min_stock: p.min_stock || 0,
      cost_price: p.cost_price || 0, stock_value: (p.total_stock || 0) * (p.cost_price || 0), status,
    };
  });
}

export interface DailySalesReport {
  date: number;
  total_sales: number;
  total_received: number;
  count: number;
}

export async function getDailySalesReport(startDate: number, endDate: number): Promise<DailySalesReport[]> {
  const all = await getAllSales();
  const filtered = all.filter(s => s.date >= startDate && s.date <= endDate);
  const byDay = new Map<number, { total_sales: number; total_received: number; count: number }>();
  for (const s of filtered) {
    const d = new Date(s.date);
    const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const ex = byDay.get(dayKey) || { total_sales: 0, total_received: 0, count: 0 };
    ex.total_sales += s.grand_total || 0;
    ex.total_received += s.amount_received || 0;
    ex.count += 1;
    byDay.set(dayKey, ex);
  }
  return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date - b.date);
}
