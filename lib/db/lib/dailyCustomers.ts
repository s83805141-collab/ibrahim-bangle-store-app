import { getDb } from "./database";

export async function addDailyCustomer(data: {
  customer_name: string;
  mobile: string;
  bill_no: string;
  bill_amount: number;
  paid_amount: number;
}) {
  const db = await getDb();

  await db.exec(
    `INSERT INTO daily_customer_entries
    (
      customer_name,
      mobile,
      bill_no,
      bill_amount,
      paid_amount,
      balance_amount,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer_name,
      data.mobile,
      data.bill_no,
      data.bill_amount,
      data.paid_amount,
      data.bill_amount - data.paid_amount,
      Date.now(),
      Date.now(),
    ]
  );
}
