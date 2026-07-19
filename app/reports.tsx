import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, FlatList, Share, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BarChart3, Truck, Wallet, ClipboardList, Calendar, X, FileText, TrendingUp, AlertCircle } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getSupplierOutstandingReport, getPurchaseReport, getPaymentReport, getMonthlyPurchaseReport,
  getSalesReport, getProfitReport, getCustomerOutstandingReport, getStockReport,
  SupplierOutstandingReport, PurchaseHeaderWithDetails, SupplierPayment,
  SalesReportRow, ProfitReportRow, CustomerOutstandingReport, StockReportRow,
} from '@/lib/db/repo';
import { Button, Input, ScreenHeader } from '@/components/ui';
import { WebView } from 'react-native-webview';

type ReportTab = 'outstanding' | 'purchases' | 'payments' | 'monthly' | 'sales' | 'profit' | 'custOutstanding' | 'stock';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsScreen() {
  const [tab, setTab] = useState<ReportTab>('outstanding');
  const [outstanding, setOutstanding] = useState<SupplierOutstandingReport[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHeaderWithDetails[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [monthly, setMonthly] = useState<{ month: number; total: number; count: number }[]>([]);
  const [sales, setSales] = useState<SalesReportRow[]>([]);
  const [profit, setProfit] = useState<ProfitReportRow[]>([]);
  const [custOutstanding, setCustOutstanding] = useState<CustomerOutstandingReport[]>([]);
  const [stockReport, setStockReport] = useState<StockReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModal, setFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [pdfModal, setPdfModal] = useState(false);
  const webViewRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const [out, purs, pays, mon, sal, prof, custOut, stockRep] = await Promise.all([
        getSupplierOutstandingReport(),
        getPurchaseReport(startDate ? new Date(startDate).getTime() : undefined, endDate ? new Date(endDate).getTime() + 86400000 : undefined),
        getPaymentReport(startDate ? new Date(startDate).getTime() : undefined, endDate ? new Date(endDate).getTime() + 86400000 : undefined),
        getMonthlyPurchaseReport(parseInt(year) || new Date().getFullYear()),
        getSalesReport(startDate ? new Date(startDate).getTime() : undefined, endDate ? new Date(endDate).getTime() + 86400000 : undefined),
        getProfitReport(startDate ? new Date(startDate).getTime() : undefined, endDate ? new Date(endDate).getTime() + 86400000 : undefined),
        getCustomerOutstandingReport(),
        getStockReport(),
      ]);
      setOutstanding(out); setPurchases(purs); setPayments(pays); setMonthly(mon);
      setSales(sal); setProfit(prof); setCustOutstanding(custOut); setStockReport(stockRep);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, year]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const totalOutstanding = outstanding.reduce((s, r) => s + r.outstanding, 0);
  const totalPurchases = purchases.reduce((s, p) => s + (p.grand_total || p.subtotal || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const monthlyTotal = monthly.reduce((s, m) => s + m.total, 0);
  const totalSales = sales.reduce((s, r) => s + r.grand_total, 0);
  const totalReceived = sales.reduce((s, r) => s + r.amount_received, 0);
  const totalProfit = profit.reduce((s, r) => s + r.profit, 0);
  const totalCustOutstanding = custOutstanding.reduce((s, r) => s + r.outstanding, 0);
  const totalStockValue = stockReport.reduce((s, r) => s + r.stock_value, 0);

  const generateReportHTML = (): string => {
    let title = '';
    let bodyRows = '';
    let summaryRows = '';
    if (tab === 'outstanding') {
      title = 'Supplier Outstanding Report';
      bodyRows = outstanding.map(r => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${r.supplier_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(r.total_purchase)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(r.total_paid)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#C62828;">${formatRs(r.outstanding)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Outstanding</span><span>${formatRs(totalOutstanding)}</span></div>`;
    } else if (tab === 'purchases') {
      title = 'Purchase Report';
      bodyRows = purchases.map(p => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDate(p.date)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.supplier_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.invoice_number || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(p.grand_total || p.subtotal)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Purchases</span><span>${formatRs(totalPurchases)}</span></div>`;
    } else if (tab === 'payments') {
      title = 'Payment Report';
      bodyRows = payments.map(p => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDate(p.payment_date)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.payment_mode}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.transaction_number || p.cheque_number || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(p.amount)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Payments</span><span>${formatRs(totalPayments)}</span></div>`;
    } else {
      title = `Monthly Purchase Report - ${year}`;
      bodyRows = monthly.filter(m => m.count > 0).map(m => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${MONTHS[m.month]}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${m.count}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(m.total)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Yearly Total</span><span>${formatRs(monthlyTotal)}</span></div>`;
    }
    const headers = tab === 'outstanding' ? '<tr><th>Supplier</th><th class="right">Purchase</th><th class="right">Paid</th><th class="right">Outstanding</th></tr>'
      : tab === 'purchases' ? '<tr><th>Date</th><th>Supplier</th><th>Invoice</th><th class="right">Amount</th></tr>'
      : tab === 'payments' ? '<tr><th>Date</th><th>Mode</th><th>Reference</th><th class="right">Amount</th></tr>'
      : '<tr><th>Month</th><th class="center">Count</th><th class="right">Total</th></tr>';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #1a1c1e; }
  .doc { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #006495, #00375F); color: #fff; padding: 24px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
  .body { padding: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f0f4f8; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #42474e; text-transform: uppercase; }
  th.right { text-align: right; } th.center { text-align: center; }
  td { font-size: 13px; color: #1a1c1e; }
  .totals { margin-left: auto; width: 300px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.outstanding { border-top: 2px solid #006495; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .footer { background: #006495; color: #fff; text-align: center; padding: 16px; font-size: 14px; }
  @media print { body { background: #fff; padding: 0; } .doc { box-shadow: none; } }
</style></head><body>
  <div class="doc">
    <div class="header"><h1>${title}</h1><p>Ibrahim Bangle Store</p></div>
    <div class="body">
      <table><thead>${headers}</thead><tbody>${bodyRows}</tbody></table>
      <div class="totals">${summaryRows}</div>
    </div>
    <div class="footer">Generated on ${formatDate(Date.now())}</div>
  </div>
</body></html>`;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reports" subtitle="Supplier & purchase analytics" />

      <View style={styles.tabRow}>
        {([
          { key: 'outstanding', label: 'Sup Due', icon: AlertCircle },
          { key: 'purchases', label: 'Purchases', icon: ClipboardList },
          { key: 'payments', label: 'Payments', icon: Wallet },
          { key: 'monthly', label: 'Monthly', icon: BarChart3 },
          { key: 'sales', label: 'Sales', icon: TrendingUp },
          { key: 'profit', label: 'Profit', icon: BarChart3 },
          { key: 'custOutstanding', label: 'Cust Due', icon: AlertCircle },
          { key: 'stock', label: 'Stock', icon: ClipboardList },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Icon size={16} color={tab === t.key ? MD3Colors.primary : MD3Colors.onSurfaceVariant} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionBar}>
        {(tab === 'purchases' || tab === 'payments' || tab === 'sales' || tab === 'profit') && (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Calendar size={16} color={MD3Colors.primary} />
            <Text style={styles.filterBtnText}>{startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'Date Filter'}</Text>
          </TouchableOpacity>
        )}
        {tab === 'monthly' && (
          <>
            <View style={styles.yearWrap}>
              <TextInput style={styles.yearInput} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="Year" placeholderTextColor={MD3Colors.outline} />
            </View>
          </>
        )}
        <TouchableOpacity style={styles.pdfBtn} onPress={() => setPdfModal(true)}>
          <FileText size={16} color={MD3Colors.onPrimary} />
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        {tab === 'outstanding' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Outstanding</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.error }]}>{formatRs(totalOutstanding)}</Text>
            </View>
            {outstanding.length === 0 ? (
              <Text style={styles.emptyText}>No outstanding balances. All suppliers are settled.</Text>
            ) : (
              outstanding.map((r, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><Truck size={18} color={MD3Colors.secondary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{r.supplier_name}</Text>
                    <Text style={styles.reportMeta}>Purchase: {formatRs(r.total_purchase)} · Paid: {formatRs(r.total_paid)}</Text>
                  </View>
                  <Text style={[styles.reportAmount, { color: MD3Colors.error }]}>{formatRs(r.outstanding)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'purchases' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Purchases ({purchases.length})</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.primary }]}>{formatRs(totalPurchases)}</Text>
            </View>
            {purchases.length === 0 ? <Text style={styles.emptyText}>No purchases in this period.</Text> : (
              purchases.map((p, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><ClipboardList size={18} color={MD3Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{p.supplier_name}</Text>
                    <Text style={styles.reportMeta}>{formatDate(p.date)} · {p.invoice_number || `#${p.id}`}</Text>
                  </View>
                  <Text style={styles.reportAmount}>{formatRs(p.grand_total || p.subtotal)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'payments' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Payments ({payments.length})</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.success }]}>{formatRs(totalPayments)}</Text>
            </View>
            {payments.length === 0 ? <Text style={styles.emptyText}>No payments in this period.</Text> : (
              payments.map((p, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><Wallet size={18} color={MD3Colors.success} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{formatRs(p.amount)} · {p.payment_mode}</Text>
                    <Text style={styles.reportMeta}>{formatDate(p.payment_date)}{p.transaction_number ? ` · ${p.transaction_number}` : ''}{p.cheque_number ? ` · Cheque: ${p.cheque_number}` : ''}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'monthly' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Yearly Total ({year})</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.primary }]}>{formatRs(monthlyTotal)}</Text>
            </View>
            {monthly.filter(m => m.count > 0).length === 0 ? <Text style={styles.emptyText}>No purchases in {year}.</Text> : (
              monthly.filter(m => m.count > 0).map((m, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><TrendingUp size={18} color={MD3Colors.tertiary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{MONTHS[m.month]} {year}</Text>
                    <Text style={styles.reportMeta}>{m.count} purchases</Text>
                  </View>
                  <Text style={styles.reportAmount}>{formatRs(m.total)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'sales' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Sales ({sales.length})</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.primary }]}>{formatRs(totalSales)}</Text>
            </View>
            <Text style={styles.subSummary}>Received: {formatRs(totalReceived)}</Text>
            {sales.length === 0 ? <Text style={styles.emptyText}>No sales in this period.</Text> : (
              sales.map((s, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><TrendingUp size={18} color={MD3Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{s.invoice_number || `#${s.id}`}</Text>
                    <Text style={styles.reportMeta}>{s.customer_name} · {formatDate(s.date)} · {s.item_count} items</Text>
                  </View>
                  <Text style={styles.reportAmount}>{formatRs(s.grand_total)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'profit' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Profit ({profit.length})</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.success }]}>{formatRs(totalProfit)}</Text>
            </View>
            {profit.length === 0 ? <Text style={styles.emptyText}>No sales in this period.</Text> : (
              profit.map((p, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><BarChart3 size={18} color={MD3Colors.success} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{p.invoice_number || 'Sale'}</Text>
                    <Text style={styles.reportMeta}>{p.customer_name} · {formatDate(p.date)}</Text>
                    <Text style={styles.reportMeta}>Revenue: {formatRs(p.revenue)} · Cost: {formatRs(p.cost)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.reportAmount, p.profit >= 0 ? { color: MD3Colors.success } : { color: MD3Colors.error }]}>{formatRs(p.profit)}</Text>
                    <Text style={styles.reportMeta}>{p.margin.toFixed(1)}% margin</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'custOutstanding' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Customer Due</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.error }]}>{formatRs(totalCustOutstanding)}</Text>
            </View>
            {custOutstanding.length === 0 ? <Text style={styles.emptyText}>No outstanding customer balances.</Text> : (
              custOutstanding.map((c, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><AlertCircle size={18} color={MD3Colors.error} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{c.customer_name}</Text>
                    <Text style={styles.reportMeta}>{c.phone || 'No phone'} · Purchase: {formatRs(c.total_purchase)} · Paid: {formatRs(c.total_paid)}</Text>
                  </View>
                  <Text style={[styles.reportAmount, { color: MD3Colors.error }]}>{formatRs(c.outstanding)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'stock' && (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Total Stock Value</Text>
              <Text style={[styles.summaryValue, { color: MD3Colors.primary }]}>{formatRs(totalStockValue)}</Text>
            </View>
            {stockReport.length === 0 ? <Text style={styles.emptyText}>No products found.</Text> : (
              stockReport.map((s, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}><ClipboardList size={18} color={MD3Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{s.name}</Text>
                    <Text style={styles.reportMeta}>{s.category_name}{s.design_number ? ` · ${s.design_number}` : ''} · {s.total_stock} {s.unit}</Text>
                    <Text style={[styles.reportMeta, { color: s.status === 'Out of Stock' ? MD3Colors.error : s.status === 'Low Stock' ? MD3Colors.warning : MD3Colors.success }]}>{s.status}</Text>
                  </View>
                  <Text style={styles.reportAmount}>{formatRs(s.stock_value)}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={filterModal} animationType="slide" transparent onRequestClose={() => setFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Date Filter</Text>
              <TouchableOpacity onPress={() => setFilterModal(false)}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Input label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
              <Input label="End Date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
              <View style={{ flexDirection: 'row', marginTop: MD3Spacing.sm }}>
                <Button title="Clear" variant="outlined" onPress={() => { setStartDate(''); setEndDate(''); }} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                <Button title="Apply" onPress={() => { setFilterModal(false); load(); }} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={pdfModal} animationType="slide" onRequestClose={() => setPdfModal(false)}>
        <View style={styles.pdfContainer}>
          <View style={styles.pdfToolbar}>
            <Text style={styles.pdfTitle}>Report PDF</Text>
            <TouchableOpacity onPress={() => setPdfModal(false)}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <View style={styles.pdfWebviewWrap}>
            <WebView ref={webViewRef} source={{ html: generateReportHTML() }} style={{ flex: 1 }} originWhitelist={['*']} />
          </View>
          <TouchableOpacity style={styles.pdfPrintBtn} onPress={() => webViewRef.current?.injectJavaScript('window.print();')}>
            <Text style={styles.pdfPrintText}>Print / Save as PDF</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, gap: MD3Spacing.xs },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.sm, backgroundColor: MD3Colors.surface, ...MD3Elevation.level1 },
  tabActive: { backgroundColor: MD3Colors.primaryContainer },
  tabText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  tabTextActive: { color: MD3Colors.primary },
  actionBar: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, gap: MD3Spacing.sm },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, ...MD3Elevation.level1 },
  filterBtnText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.primary },
  yearWrap: { flex: 1 },
  yearInput: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface, backgroundColor: MD3Colors.surface, width: 100 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, marginLeft: 'auto' },
  pdfBtnText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onPrimary },
  summaryBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md },
  summaryLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  summaryValue: { fontFamily: 'Roboto-Bold', fontSize: 18 },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  reportIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  reportTitle: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  reportMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  reportAmount: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  emptyText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center', padding: MD3Spacing.xl },
  subSummary: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.md, marginLeft: MD3Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  pdfContainer: { flex: 1, backgroundColor: MD3Colors.background },
  pdfToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  pdfTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, flex: 1 },
  pdfWebviewWrap: { flex: 1, margin: MD3Spacing.sm, borderRadius: MD3Radius.md, overflow: 'hidden', ...MD3Elevation.level1 },
  pdfPrintBtn: { backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.md, paddingVertical: MD3Spacing.md, marginHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.lg, alignItems: 'center' },
  pdfPrintText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onPrimary },
});
