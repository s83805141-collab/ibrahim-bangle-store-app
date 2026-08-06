import { getDb } from './database';

export interface TransportReceipt {
  id: number;
  driver_name: string;
  mobile_number: string;
  transport_date: number;
  amount: number;
  receipt_image: string;
  created_at: number;
  updated_at: number;
}

export interface TransportReceiptInput {
  driver_name: string;
  mobile_number: string;
  transport_date: number;
  amount: number;
  receipt_image: string;
}

function rowToReceipt(row: any): TransportReceipt {
  return {
    id: row.id,
    driver_name: row.driver_name,
    mobile_number: row.mobile_number || '',
    transport_date: row.transport_date,
    amount: row.amount,
    receipt_image: row.receipt_image || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function insertTransportReceipt(input: TransportReceiptInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.exec(
    `INSERT INTO transport_receipts
      (driver_name, mobile_number, transport_date, amount, receipt_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.driver_name,
      input.mobile_number || '',
      input.transport_date,
      input.amount,
      input.receipt_image || '',
      now,
      now,
    ]
  );
  return res.insertId ?? 0;
}

export async function updateTransportReceipt(id: number, input: TransportReceiptInput): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.exec(
    `UPDATE transport_receipts SET
      driver_name = ?,
      mobile_number = ?,
      transport_date = ?,
      amount = ?,
      receipt_image = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      input.driver_name,
      input.mobile_number || '',
      input.transport_date,
      input.amount,
      input.receipt_image || '',
      now,
      id,
    ]
  );
}

export async function deleteTransportReceipt(id: number): Promise<void> {
  const db = await getDb();
  await db.exec('DELETE FROM transport_receipts WHERE id = ?', [id]);
}

export async function getAllTransportReceipts(): Promise<TransportReceipt[]> {
  const db = await getDb();
  const res = await db.exec(
    `SELECT * FROM transport_receipts ORDER BY transport_date DESC, id DESC`
  );
  return res.rows._array.map(rowToReceipt);
}

export async function searchTransportReceipts(query: string): Promise<TransportReceipt[]> {
  const db = await getDb();
  const like = `%${query}%`;
  const res = await db.exec(
    `SELECT * FROM transport_receipts
     WHERE driver_name LIKE ? OR mobile_number LIKE ?
     ORDER BY transport_date DESC, id DESC`,
    [like, like]
  );
  return res.rows._array.map(rowToReceipt);
}

export async function getTransportReceiptById(id: number): Promise<TransportReceipt | null> {
  const db = await getDb();
  const res = await db.exec(
    `SELECT * FROM transport_receipts WHERE id = ?`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return rowToReceipt(res.rows._array[0]);
}

export async function getTotalTransportExpenses(): Promise<number> {
  const db = await getDb();
  const res = await db.exec(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transport_receipts`
  );
  return res.rows._array[0]?.total ?? 0;
}
