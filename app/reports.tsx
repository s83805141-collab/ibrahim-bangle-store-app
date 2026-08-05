import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Share, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BarChart3, Truck, Wallet, ClipboardList, Calendar, X, FileText, TrendingUp, AlertCircle, Package } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';
import {
  getSupplierOutstandingReport, getPurchaseReport, getPaymentReport, getMonthlyPurchaseReport,
  getSalesReport, getProfitReport, getCustomerOutstandingReport, getStockReport,
  SupplierOutstandingReport, PurchaseHeaderWithDetails, SupplierPayment,
  SalesReportRow, ProfitReportRow, CustomerOutstandingReport, StockReportRow,
} from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader, StatusBadge, PremiumModal } from '@/components/ui';
import { WebView } from 'react-native-webview';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type ReportTab = 'outstanding' | 'purchases' | 'payments' | 'monthly' | 'sales' | 'profit' | 'custOutstanding' | 'stock';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TABS: { key: ReportTab; label: string; icon: any; gradient: string[] }[] = [
  { key: 'outstanding', label: 'Sup Due', icon: AlertCircle, gradient: MD3Gradients.delete },
  { key: 'purchases', label: 'Purchases', icon: ClipboardList, gradient: MD3Gradients.update },
  { key: 'payments', label: 'Payments', icon: Wallet, gradient: MD3Gradients.payment },
  { key: 'monthly', label: 'Monthly', icon: BarChart3, gradient: MD3Gradients.primary },
  { key: 'sales', label: 'Sales', icon: TrendingUp, gradient: MD3Gradients.update },
  { key: 'profit', label: 'Profit', icon: BarChart3, gradient: MD3Gradients.save },
  { key: 'custOutstanding', label: 'Cust Due', icon: AlertCircle, gradient: MD3Gradients.view },
  { key: 'stock', label: 'Stock', icon: Package, gradient: MD3Gradients.purple },
];

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

  const currentTab = TABS.find(t => t.key === tab)!;
  const summaryLabel = tab === 'outstanding' ? 'Total Outstanding' : tab === 'purchases' ? `Total Purchases (${purchases.length})` : tab === 'payments' ? `Total Payments (${payments.length})` : tab === 'monthly' ? `Yearly Total (${year})` : tab === 'sales' ? `Total Sales (${sales.length})` : tab === 'profit' ? `Total Profit (${profit.length})` : tab === 'custOutstanding' ? 'Total Customer Due' : 'Total Stock Value';
  const summaryValue = tab === 'outstanding' ? totalOutstanding : tab === 'purchases' ? totalPurchases : tab === 'payments' ? totalPayments : tab === 'monthly' ? monthlyTotal : tab === 'sales' ? totalSales : tab === 'profit' ? totalProfit : tab === 'custOutstanding' ? totalCustOutstanding : totalStockValue;
  const summaryGradient = currentTab.gradient;
  const hasDateFilter = tab === 'purchases' || tab === 'payments' || tab === 'sales' || tab === 'profit';

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
    } else if (tab === 'sales') {
      title = 'Sales Report';
      bodyRows = sales.map(s => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDate(s.date)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.invoice_number || `#${s.id}`}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.customer_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(s.grand_total)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(s.amount_received)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row"><span>Total Sales</span><span>${formatRs(totalSales)}</span></div><div class="total-row"><span>Total Received</span><span>${formatRs(totalReceived)}</span></div>`;
    } else if (tab === 'profit') {
      title = 'Profit Report';
      bodyRows = profit.map(p => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDate(p.date)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.invoice_number || 'Sale'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${p.customer_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(p.revenue)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(p.cost)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${p.profit >= 0 ? '#2E7D32' : '#C62828'};">${formatRs(p.profit)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Profit</span><span>${formatRs(totalProfit)}</span></div>`;
    } else if (tab === 'custOutstanding') {
      title = 'Customer Outstanding Report';
      bodyRows = custOutstanding.map(c => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${c.customer_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(c.total_purchase)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(c.total_paid)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#C62828;">${formatRs(c.outstanding)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Outstanding</span><span>${formatRs(totalCustOutstanding)}</span></div>`;
    } else if (tab === 'stock') {
      title = 'Stock Report';
      bodyRows = stockReport.map(s => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.category_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${s.total_stock} ${s.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.status}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatRs(s.stock_value)}</td></tr>
      `).join('');
      summaryRows = `<div class="total-row outstanding"><span>Total Stock Value</span><span>${formatRs(totalStockValue)}</span></div>`;
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
      : tab === 'sales' ? '<tr><th>Date</th><th>Invoice</th><th>Customer</th><th class="right">Total</th><th class="right">Received</th></tr>'
      : tab === 'profit' ? '<tr><th>Date</th><th>Invoice</th><th>Customer</th><th class="right">Revenue</th><th class="right">Cost</th><th class="right">Profit</th></tr>'
      : tab === 'custOutstanding' ? '<tr><th>Customer</th><th class="right">Purchase</th><th class="right">Paid</th><th class="right">Outstanding</th></tr>'
      : tab === 'stock' ? '<tr><th>Product</th><th>Category</th><th class="center">Stock</th><th>Status</th><th class="right">Value</th></tr>'
      : '<tr><th>Month</th><th class="center">Count</th><th class="right">Total</th></tr>';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #1a1c1e; }
  .doc { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1565C0, #0D47A1); color: #fff; padding: 24px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
  .body { padding: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f0f4f8; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #42474e; text-transform: uppercase; }
  th.right { text-align: right; } th.center { text-align: center; }
  td { font-size: 13px; color: #1a1c1e; }
  .totals { margin-left: auto; width: 300px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.outstanding { border-top: 2px solid #1565C0; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 16px; font-size: 14px; }
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

  const renderReportCard = (icon: any, iconColor: string, iconBg: string, title: string, meta: string, amount?: string, amountColor?: string, extraMeta?: string, index: number = 0) => {
    const Icon = icon;
    return (
      <Animated.View key={index} entering={FadeInDown.duration(300).delay(index * 40)}>
        <View style={styles.reportCard}>
          <View style={[styles.reportIconWrap, { backgroundColor: iconBg }]}><Icon size={18} color={iconColor} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.reportMeta}>{meta}</Text>
            {extraMeta ? <Text style={styles.reportMeta}>{extraMeta}</Text> : null}
          </View>
          {amount ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.reportAmount, amountColor ? { color: amountColor } : null]}>{amount}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reports" subtitle="Supplier & purchase analytics" />

      {/* Tab chips - horizontally scrollable */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MD3Spacing.lg, gap: MD3Spacing.xs, marginBottom: MD3Spacing.sm }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Icon size={15} color={active ? MD3Colors.primary : MD3Colors.onSurfaceVariant} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {hasDateFilter && (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Calendar size={16} color={MD3Colors.primary} />
            <Text style={styles.filterBtnText}>{startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'Date Filter'}</Text>
            {(startDate || endDate) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        )}
        {tab === 'monthly' && (
          <View style={styles.yearWrap}>
            <TextInput style={styles.yearInput} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="Year" placeholderTextColor={MD3Colors.outline} />
          </View>
        )}
        <TouchableOpacity style={styles.pdfBtn} onPress={() => setPdfModal(true)}>
          <FileText size={16} color={MD3Colors.onPrimary} />
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        {/* Gradient summary banner */}
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient colors={summaryGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryBanner}>
            <View style={styles.summaryBannerContent}>
              <Text style={styles.summaryLabel}>{summaryLabel}</Text>
              <Text style={styles.summaryValue}>{formatRs(summaryValue)}</Text>
            </View>
            <View style={styles.summaryBannerIcon}>
              {(() => { const I = currentTab.icon; return <I size={28} color="#FFFFFF" strokeWidth={1.8} />; })()}
            </View>
          </LinearGradient>
        </Animated.View>

        {tab === 'sales' && (
          <Animated.View entering={FadeIn.duration(400).delay(100)}>
            <View style={styles.subSummaryCard}>
              <Text style={styles.subSummaryLabel}>Amount Received</Text>
              <Text style={[styles.subSummaryValue, { color: MD3Colors.success }]}>{formatRs(totalReceived)}</Text>
            </View>
          </Animated.View>
        )}

        {tab === 'outstanding' && (
          outstanding.length === 0 ? (
            <EmptyState icon={<Truck size={48} color={MD3Colors.outline} />} title="No Outstanding" subtitle="All suppliers are settled" />
          ) : (
            outstanding.map((r, i) => renderReportCard(Truck, MD3Colors.secondary, MD3Colors.secondaryContainer, r.supplier_name, `Purchase: ${formatRs(r.total_purchase)} · Paid: ${formatRs(r.total_paid)}`, formatRs(r.outstanding), MD3Colors.error, undefined, i))
          )
        )}

        {tab === 'purchases' && (
          purchases.length === 0 ? (
            <EmptyState icon={<ClipboardList size={48} color={MD3Colors.outline} />} title="No Purchases" subtitle="No purchases in this period" />
          ) : (
            purchases.map((p, i) => renderReportCard(ClipboardList, MD3Colors.primary, MD3Colors.primaryContainer, p.supplier_name, `${formatDate(p.date)} · ${p.invoice_number || `#${p.id}`}`, formatRs(p.grand_total || p.subtotal), undefined, undefined, i))
          )
        )}

        {tab === 'payments' && (
          payments.length === 0 ? (
            <EmptyState icon={<Wallet size={48} color={MD3Colors.outline} />} title="No Payments" subtitle="No payments in this period" />
          ) : (
            payments.map((p, i) => renderReportCard(Wallet, MD3Colors.success, MD3Colors.successContainer, `${formatRs(p.amount)} · ${p.payment_mode}`, `${formatDate(p.payment_date)}${p.transaction_number ? ` · ${p.transaction_number}` : ''}${p.cheque_number ? ` · Cheque: ${p.cheque_number}` : ''}`, undefined, undefined, undefined, i))
          )
        )}

        {tab === 'monthly' && (
          monthly.filter(m => m.count > 0).length === 0 ? (
            <EmptyState icon={<BarChart3 size={48} color={MD3Colors.outline} />} title="No Data" subtitle={`No purchases in ${year}`} />
          ) : (
            monthly.filter(m => m.count > 0).map((m, i) => renderReportCard(TrendingUp, MD3Colors.tertiary, MD3Colors.tertiaryContainer, `${MONTHS[m.month]} ${year}`, `${m.count} purchases`, formatRs(m.total), undefined, undefined, i))
          )
        )}

        {tab === 'sales' && (
          sales.length === 0 ? (
            <EmptyState icon={<TrendingUp size={48} color={MD3Colors.outline} />} title="No Sales" subtitle="No sales in this period" />
          ) : (
            sales.map((s, i) => renderReportCard(TrendingUp, MD3Colors.primary, MD3Colors.primaryContainer, s.invoice_number || `#${s.id}`, `${s.customer_name} · ${formatDate(s.date)} · ${s.item_count} items`, formatRs(s.grand_total), undefined, undefined, i))
          )
        )}

        {tab === 'profit' && (
          profit.length === 0 ? (
            <EmptyState icon={<BarChart3 size={48} color={MD3Colors.outline} />} title="No Data" subtitle="No sales in this period" />
          ) : (
            profit.map((p, i) => renderReportCard(BarChart3, MD3Colors.success, MD3Colors.successContainer, p.invoice_number || 'Sale', `${p.customer_name} · ${formatDate(p.date)}`, formatRs(p.profit), p.profit >= 0 ? MD3Colors.success : MD3Colors.error, `Revenue: ${formatRs(p.revenue)} · Cost: ${formatRs(p.cost)} · ${p.margin.toFixed(1)}% margin`, i))
          )
        )}

        {tab === 'custOutstanding' && (
          custOutstanding.length === 0 ? (
            <EmptyState icon={<AlertCircle size={48} color={MD3Colors.outline} />} title="No Outstanding" subtitle="No outstanding customer balances" />
          ) : (
            custOutstanding.map((c, i) => renderReportCard(AlertCircle, MD3Colors.error, MD3Colors.errorContainer, c.customer_name, `${c.phone || 'No phone'} · Purchase: ${formatRs(c.total_purchase)} · Paid: ${formatRs(c.total_paid)}`, formatRs(c.outstanding), MD3Colors.error, undefined, i))
          )
        )}

        {tab === 'stock' && (
          stockReport.length === 0 ? (
            <EmptyState icon={<Package size={48} color={MD3Colors.outline} />} title="No Products" subtitle="No products found" />
          ) : (
            stockReport.map((s, i) => {
              const statusColor = s.status === 'Out of Stock' ? MD3Colors.error : s.status === 'Low Stock' ? MD3Colors.warning : MD3Colors.success;
              const statusBg = s.status === 'Out of Stock' ? MD3Colors.errorContainer : s.status === 'Low Stock' ? MD3Colors.warningContainer : MD3Colors.successContainer;
              return (
                <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 40)}>
                  <View style={styles.reportCard}>
                    <View style={[styles.reportIconWrap, { backgroundColor: MD3Colors.primaryContainer }]}><Package size={18} color={MD3Colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportTitle}>{s.name}</Text>
                      <Text style={styles.reportMeta}>{s.category_name}{s.design_number ? ` · ${s.design_number}` : ''} · {s.total_stock} {s.unit}</Text>
                      <View style={{ marginTop: 4 }}><StatusBadge label={s.status} color={statusColor} bg={statusBg} /></View>
                    </View>
                    <Text style={styles.reportAmount}>{formatRs(s.stock_value)}</Text>
                  </View>
                </Animated.View>
              );
            })
          )
        )}
      </ScrollView>

      {/* Date Filter Modal */}
      <PremiumModal
        visible={filterModal}
        onClose={() => setFilterModal(false)}
        title="Date Filter"
        footer={
          <>
            <Button title="Clear" intent="cancel" variant="outlined" onPress={() => { setStartDate(''); setEndDate(''); }} style={{ flex: 1 }} />
            <Button title="Apply" intent="primary" onPress={() => { setFilterModal(false); load(); }} style={{ flex: 1 }} />
          </>
        }
      >
        <Input label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label="End Date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
      </PremiumModal>

      {/* PDF Modal */}
      <Modal visible={pdfModal} animationType="slide" onRequestClose={() => setPdfModal(false)}>
        <View style={styles.pdfContainer}>
          <View style={styles.pdfToolbar}>
            <Text style={styles.pdfTitle}>Report PDF</Text>
            <TouchableOpacity onPress={() => setPdfModal(false)} style={styles.pdfCloseBtn}><X size={22} color={MD3Colors.onSurface} /></TouchableOpacity>
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
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.md,
    borderRadius: MD3Radius.full,
    backgroundColor: MD3Colors.surface,
    ...MD3Elevation.level1,
  },
  tabActive: { backgroundColor: MD3Colors.primaryContainer },
  tabText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  tabTextActive: { color: MD3Colors.primary },
  actionBar: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, gap: MD3Spacing.sm },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative',
    backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm,
    ...MD3Elevation.level1,
  },
  filterBtnText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.primary },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: MD3Colors.error },
  yearWrap: { flex: 1 },
  yearInput: {
    borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md,
    paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm,
    fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface,
    backgroundColor: MD3Colors.surface, width: 120,
  },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto',
    backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm,
    ...MD3Elevation.level2,
  },
  pdfBtnText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onPrimary },
  summaryBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: MD3Radius.lg, padding: MD3Spacing.lg, marginBottom: MD3Spacing.md,
    ...MD3Elevation.level3,
  },
  summaryBannerContent: { flex: 1 },
  summaryLabel: { fontFamily: 'Roboto-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  summaryValue: { fontFamily: 'Roboto-Bold', fontSize: 24, color: '#FFFFFF' },
  summaryBannerIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  subSummaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md, marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  subSummaryLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  subSummaryValue: { fontFamily: 'Roboto-Bold', fontSize: 16 },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md, marginBottom: MD3Spacing.sm,
    ...MD3Elevation.level2,
  },
  reportIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md,
  },
  reportTitle: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 3 },
  reportMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 1 },
  reportAmount: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  pdfContainer: { flex: 1, backgroundColor: MD3Colors.background },
  pdfToolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md,
    backgroundColor: MD3Colors.surface,
    borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant,
  },
  pdfTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, flex: 1 },
  pdfCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  pdfWebviewWrap: { flex: 1, margin: MD3Spacing.sm, borderRadius: MD3Radius.lg, overflow: 'hidden', ...MD3Elevation.level2 },
  pdfPrintBtn: {
    backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.lg,
    paddingVertical: MD3Spacing.md, marginHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.lg,
    alignItems: 'center', ...MD3Elevation.level2,
  },
  pdfPrintText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onPrimary },
});
