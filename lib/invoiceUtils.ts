import { Platform, Share, Linking, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { ShopSettings, SaleHeaderWithDetails } from '@/lib/db/repo';

export function formatRs(n: number): string {
  return 'Rs ' + (n || 0).toLocaleString('en-PK');
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateInvoiceText(sale: SaleHeaderWithDetails, settings: ShopSettings): string {
  const items = sale.items.map((item: any) =>
    `• ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''} — ${item.quantity} ${item.unit} × ${formatRs(item.unit_price)} = ${formatRs(item.total)}`
  ).join('\n');

  return `*${settings.shop_name}*
${settings.shop_address}
${settings.shop_phone ? 'Phone: ' + settings.shop_phone : ''}

━━━━━━━━━━━━━━━━━
*INVOICE ${sale.invoice_number}*
Date: ${formatDate(sale.date)}
━━━━━━━━━━━━━━━━━

*Customer:* ${sale.customer_name}${sale.is_walkin ? ' (Walk-in)' : ''}
${sale.customer_phone ? `*Mobile:* ${sale.customer_phone}` : ''}

*Items:*
${items}

━━━━━━━━━━━━━━━━━
Subtotal: ${formatRs(sale.subtotal)}
${sale.discount > 0 ? `Discount${sale.discount_percent ? ` (${sale.discount_percent}%)` : ''}: -${formatRs(sale.discount)}\n` : ''}${sale.extra_charges > 0 ? `Extra Charges: +${formatRs(sale.extra_charges)}\n` : ''}*Grand Total: ${formatRs(sale.grand_total)}*
Paid: ${formatRs(sale.amount_received)}
${sale.balance_due > 0 ? `*Balance Due: ${formatRs(sale.balance_due)}*` : 'Status: Fully Paid'}
Payment Mode: ${sale.payment_method}
${sale.transaction_number ? `Txn #: ${sale.transaction_number}` : ''}
━━━━━━━━━━━━━━━━━

${settings.shop_footer}`;
}

export async function shareOnWhatsApp(sale: SaleHeaderWithDetails, settings: ShopSettings, phone?: string): Promise<void> {
  const text = generateInvoiceText(sale, settings);
  const encoded = encodeURIComponent(text);

  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    try {
      await Linking.openURL(whatsappUrl);
      return;
    } catch (e) {
      // Fallback to share dialog
    }
  }

  try {
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
  } catch (e) {
    // Fallback to Android share dialog
    try {
      await Share.share({ message: text });
    } catch (e2) {}
  }
}

export async function sendSMS(sale: SaleHeaderWithDetails, settings: ShopSettings, phone?: string): Promise<void> {
  const text = generateInvoiceText(sale, settings);

  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const smsUrl = Platform.OS === 'ios' ? `sms:${cleanPhone}&body=${encodeURIComponent(text)}` : `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(smsUrl);
      return;
    } catch (e) {
      // Fallback
    }
  }

  try {
    await Share.share({ message: text });
  } catch (e) {}
}

export async function shareInvoice(sale: SaleHeaderWithDetails, settings: ShopSettings): Promise<void> {
  const text = generateInvoiceText(sale, settings);
  try {
    await Share.share({ message: text });
  } catch (e) {}
}

export async function printInvoice(html: string, webViewRef: any): Promise<void> {
  if (webViewRef.current) {
    webViewRef.current.injectJavaScript('window.print();');
  }
}

export function generateInvoiceHTML(sale: SaleHeaderWithDetails, settings: ShopSettings): string {
  const rows = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.product_name}${item.variant_label ? '<br><span style="font-size:11px;color:#666">' + item.variant_label + '</span>' : ''}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${formatRs(item.unit_price)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${formatRs(item.total)}</td>
    </tr>
  `).join('');

  const qrData = `INV:${sale.invoice_number}|TOTAL:${sale.grand_total}|DATE:${formatDate(sale.date)}`;
  const barcodeData = sale.invoice_number;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${sale.invoice_number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #1a1c1e; }
  .invoice { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1565C0, #0D47A1); color: #fff; padding: 24px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .shop-logo { width: 56px; height: 56px; background: rgba(255,255,255,0.18); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .shop-name { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
  .shop-addr { font-size: 13px; opacity: 0.9; margin: 0; }
  .shop-phone { font-size: 13px; opacity: 0.9; margin: 4px 0 0; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 28px; margin: 0; font-weight: 300; }
  .invoice-title p { font-size: 13px; margin: 4px 0 0; opacity: 0.9; }
  .body { padding: 24px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .info-block { font-size: 13px; }
  .info-label { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
  .info-value { font-size: 14px; color: #1a1c1e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f0f4f8; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #42474e; text-transform: uppercase; }
  th.center { text-align: center; }
  th.right { text-align: right; }
  td { font-size: 13px; color: #1a1c1e; }
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.grand { border-top: 2px solid #1565C0; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .total-label { color: #42474e; }
  .total-value { font-weight: 600; color: #1a1c1e; }
  .total-row.discount .total-value { color: #C62828; }
  .total-row.balance .total-value { color: #C62828; }
  .payment-box { background: #f0f4f8; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .payment-row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
  .qr-barcode-section { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; }
  .qr-block { text-align: center; }
  .qr-block img { width: 100px; height: 100px; }
  .qr-label { font-size: 11px; color: #666; margin-top: 4px; }
  .barcode-block { text-align: center; flex: 1; margin-left: 20px; }
  .barcode-block img { width: 100%; height: 50px; }
  .barcode-label { font-size: 11px; color: #666; margin-top: 4px; font-family: monospace; }
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 16px; font-size: 14px; font-weight: 500; }
  @media print { body { background: #fff; padding: 0; } .invoice { box-shadow: none; max-width: 100%; } }
</style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-row">
        <div>
          <div class="shop-logo">IBS</div>
          <h1 class="shop-name">${settings.shop_name}</h1>
          <p class="shop-addr">${settings.shop_address}</p>
          ${settings.shop_phone ? '<p class="shop-phone">Phone: ' + settings.shop_phone + '</p>' : ''}
        </div>
        <div class="invoice-title">
          <h2>INVOICE</h2>
          <p>${sale.invoice_number}</p>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="info-row">
        <div class="info-block">
          <div class="info-label">Bill To</div>
          <div class="info-value">${sale.customer_name}${sale.is_walkin ? ' (Walk-in)' : ''}</div>
          ${sale.customer_phone ? '<div style="font-size:13px;color:#666;margin-top:2px;">Mobile: ' + sale.customer_phone + '</div>' : ''}
        </div>
        <div class="info-block" style="text-align:right;">
          <div class="info-label">Date</div>
          <div class="info-value">${formatDate(sale.date)}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="center">Qty</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span class="total-label">Subtotal</span><span class="total-value">${formatRs(sale.subtotal)}</span></div>
        ${sale.discount > 0 ? '<div class="total-row discount"><span class="total-label">Discount' + (sale.discount_percent ? ' (' + sale.discount_percent + '%)' : '') + '</span><span class="total-value">- ' + formatRs(sale.discount) + '</span></div>' : ''}
        ${sale.extra_charges > 0 ? '<div class="total-row"><span class="total-label">Extra Charges</span><span class="total-value">+ ' + formatRs(sale.extra_charges) + '</span></div>' : ''}
        <div class="total-row grand"><span class="total-label">Grand Total</span><span class="total-value">${formatRs(sale.grand_total)}</span></div>
        <div class="total-row"><span class="total-label">Paid Amount</span><span class="total-value">${formatRs(sale.amount_received)}</span></div>
        ${sale.balance_due > 0 ? '<div class="total-row balance"><span class="total-label">Due Amount</span><span class="total-value">' + formatRs(sale.balance_due) + '</span></div>' : ''}
      </div>
      <div class="payment-box">
        <div class="payment-row"><span style="font-weight:600;color:#42474e;">Payment Method:</span><span>${sale.payment_method}</span></div>
        ${sale.transaction_number ? '<div class="payment-row"><span style="font-weight:600;color:#42474e;">Transaction #:</span><span>' + sale.transaction_number + '</span></div>' : ''}
      </div>
      <div class="qr-barcode-section">
        <div class="qr-block">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}" alt="QR Code" />
          <div class="qr-label">Scan for Invoice Info</div>
        </div>
        <div class="barcode-block">
          <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=Code128" alt="Barcode" />
          <div class="barcode-label">${sale.invoice_number}</div>
        </div>
      </div>
      ${sale.note ? '<div style="font-size:12px;color:#666;margin-top:12px;font-style:italic;">Note: ' + sale.note + '</div>' : ''}
    </div>
    <div class="footer">${settings.shop_footer}</div>
  </div>
</body>
</html>`;
}
