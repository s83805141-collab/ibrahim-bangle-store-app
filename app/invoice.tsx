import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Share2, ArrowLeft, Printer, X } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getSaleById, getSettings, SaleHeaderWithDetails, ShopSettings } from '@/lib/db/repo';
import { ScreenHeader, EmptyState } from '@/components/ui';
import { WebView } from 'react-native-webview';

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const [sale, setSale] = useState<SaleHeaderWithDetails | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!params.saleId) { setLoading(false); return; }
    try {
      const [s, sett] = await Promise.all([getSaleById(parseInt(params.saleId)), getSettings()]);
      setSale(s);
      setSettings(sett);
    } finally {
      setLoading(false);
    }
  }, [params.saleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const generateHTML = (): string => {
    if (!sale || !settings) return '<html><body><h1>No sale selected</h1></body></html>';
    const rows = sale.items.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.product_name}${item.variant_label ? '<br><span style="font-size:11px;color:#666">' + item.variant_label + '</span>' : ''}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:center;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:center;">${item.unit}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${formatRs(item.unit_price)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${formatRs(item.total)}</td>
      </tr>
    `).join('');

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
  .shop-name { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
  .shop-addr { font-size: 13px; opacity: 0.9; margin: 0; }
  .shop-phone { font-size: 13px; opacity: 0.9; margin: 4px 0 0; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 28px; margin: 0; font-weight: 300; }
  .invoice-title p { font-size: 13px; margin: 4px 0 0; opacity: 0.9; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
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
  .totals { margin-left: auto; width: 250px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.grand { border-top: 2px solid #1565C0; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .total-label { color: #42474e; }
  .total-value { font-weight: 600; color: #1a1c1e; }
  .total-row.discount .total-value { color: #C62828; }
  .total-row.balance .total-value { color: #C62828; }
  .payment-box { background: #f0f4f8; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .payment-row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 16px; font-size: 14px; font-weight: 500; }
  @media print { body { background: #fff; padding: 0; } .invoice { box-shadow: none; max-width: 100%; } }
</style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-row">
        <div>
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
            <th class="center">Unit</th>
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
        <div class="total-row"><span class="total-label">Amount Received</span><span class="total-value">${formatRs(sale.amount_received)}</span></div>
        ${sale.balance_due > 0 ? '<div class="total-row balance"><span class="total-label">Balance Due</span><span class="total-value">' + formatRs(sale.balance_due) + '</span></div>' : ''}
      </div>
      <div class="payment-box">
        <div class="payment-row"><span style="font-weight:600;color:#42474e;">Payment Mode:</span><span>${sale.payment_method}</span></div>
        ${sale.transaction_number ? '<div class="payment-row"><span style="font-weight:600;color:#42474e;">Transaction #:</span><span>' + sale.transaction_number + '</span></div>' : ''}
      </div>
      ${sale.note ? '<div style="font-size:12px;color:#666;margin-top:8px;font-style:italic;">Note: ' + sale.note + '</div>' : ''}
    </div>
    <div class="footer">${settings.shop_footer}</div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    webViewRef.current?.injectJavaScript('window.print();');
  };

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      // On web, open print dialog
      handlePrint();
    } else {
      try {
        await Share.share({ message: `Invoice ${sale?.invoice_number} from ${settings?.shop_name} - Total: ${formatRs(sale?.grand_total || 0)}` });
      } catch (e) {}
    }
  };

  if (!params.saleId || (!loading && !sale)) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="PDF Invoice" subtitle="Generate invoices" />
        <EmptyState
          icon={<FileText size={48} color={MD3Colors.outline} />}
          title="No sale selected"
          subtitle="Go to Sales and tap the Invoice button on a sale to generate a PDF invoice"
        />
      </View>
    );
  }

  if (loading || !sale || !settings) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="PDF Invoice" subtitle="Loading..." />
        <View style={styles.loading}><Text style={styles.loadingText}>Generating invoice...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
          <ArrowLeft size={20} color={MD3Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Invoice {sale.invoice_number}</Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={handlePrint} style={styles.toolbarBtn}>
            <Printer size={20} color={MD3Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.toolbarBtn}>
            <Share2 size={20} color={MD3Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.webviewWrap}>
        <WebView
          ref={webViewRef}
          source={{ html: generateHTML() }}
          style={styles.webview}
          originWhitelist={['*']}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  toolbarBtn: { padding: MD3Spacing.sm },
  toolbarTitle: { flex: 1, fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginLeft: MD3Spacing.sm },
  toolbarActions: { flexDirection: 'row', gap: MD3Spacing.xs },
  webviewWrap: { flex: 1, margin: MD3Spacing.sm, borderRadius: MD3Radius.md, overflow: 'hidden', ...MD3Elevation.level1 },
  webview: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant },
});
