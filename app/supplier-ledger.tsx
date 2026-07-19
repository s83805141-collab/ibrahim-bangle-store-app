import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, TextInput, Share, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BookOpen, Plus, ArrowDownLeft, ArrowUpRight, Trash2, X, Truck, Wallet, Search, FileText, Filter, ChevronDown } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllSuppliersFull, getSupplierById, getSupplierLedgerEntries, getSupplierLedgerTotals,
  getPurchasesBySupplier, addSupplierPayment, deleteLedgerEntry,
  getFilteredSupplierLedgerEntries, getLatestSupplierTransaction,
  SupplierWithStats, LedgerEntry, PurchaseHeaderWithDetails, PAYMENT_METHODS,
} from '@/lib/db/repo';
import type { PaymentMethod } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';
import { WebView } from 'react-native-webview';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SupplierLedgerScreen() {
  const params = useLocalSearchParams<{ supplierId?: string }>();
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<(LedgerEntry & { running_balance?: number })[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'purchases'>('ledger');
  const [search, setSearch] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('');
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const webViewRef = useRef<any>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      const sups = await getAllSuppliersFull();
      setSuppliers(sups);
      if (params.supplierId) {
        const id = parseInt(params.supplierId);
        const s = sups.find(x => x.id === id);
        if (s) await selectSupplier(s);
      }
    } finally {
      setLoading(false);
    }
  }, [params.supplierId]);

  useFocusEffect(useCallback(() => { loadSuppliers(); }, [loadSuppliers]));

  const selectSupplier = async (s: SupplierWithStats) => {
    setSelectedSupplier(s);
    const [entries, purs] = await Promise.all([
      getFilteredSupplierLedgerEntries({ supplierId: s.id }),
      getPurchasesBySupplier(s.id),
    ]);
    setLedgerEntries(entries);
    setPurchases(purs);
  };

  const applyFilters = async () => {
    if (!selectedSupplier) return;
    const entries = await getFilteredSupplierLedgerEntries({
      supplierId: selectedSupplier.id,
      month: filterMonth ? filterMonth + 1 : undefined,
      year: filterYear ? parseInt(filterYear) : undefined,
      paymentMode: filterPaymentMode || undefined,
      search: search || undefined,
    });
    setLedgerEntries(entries);
    setFilterModalVisible(false);
  };

  const clearFilters = async () => {
    setFilterMonth(null); setFilterYear(''); setFilterPaymentMode(''); setSearch('');
    if (selectedSupplier) {
      const entries = await getFilteredSupplierLedgerEntries({ supplierId: selectedSupplier.id });
      setLedgerEntries(entries);
    }
    setFilterModalVisible(false);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleDeleteEntry = (entry: LedgerEntry) => {
    if (entry.ref_type !== 'manual_payment') {
      Alert.alert('Cannot Delete', 'This entry is linked to a purchase. Delete the purchase instead.');
      return;
    }
    Alert.alert('Delete Payment', 'Delete this payment entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteLedgerEntry(entry.id);
        if (selectedSupplier) await selectSupplier(selectedSupplier);
      }},
    ]);
  };

  const generateLedgerHTML = (): string => {
    if (!selectedSupplier) return '<html><body><h1>No supplier selected</h1></body></html>';
    const rows = ledgerEntries.map(e => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${formatDate(e.date)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${e.type === 'payment' ? 'Payment' : e.type === 'opening' ? 'Opening' : 'Purchase'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${e.note || ''}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${e.type === 'payment' ? '' : formatRs(e.amount)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">${e.type === 'payment' ? formatRs(e.amount) : ''}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right; font-weight:600;">${formatRs(e.running_balance || 0)}</td>
      </tr>
    `).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Supplier Ledger - ${selectedSupplier.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #1a1c1e; }
  .doc { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #006495, #00375F); color: #fff; padding: 24px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
  .body { padding: 24px; }
  .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
  .info-label { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f0f4f8; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #42474e; text-transform: uppercase; }
  th.right { text-align: right; }
  td { font-size: 13px; color: #1a1c1e; }
  .totals { margin-left: auto; width: 300px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.outstanding { border-top: 2px solid #006495; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
  .footer { background: #006495; color: #fff; text-align: center; padding: 16px; font-size: 14px; }
  @media print { body { background: #fff; padding: 0; } .doc { box-shadow: none; } }
</style></head><body>
  <div class="doc">
    <div class="header"><h1>Supplier Ledger Report</h1><p>${selectedSupplier.name}</p></div>
    <div class="body">
      <div class="info">
        <div><div class="info-label">Supplier</div><div>${selectedSupplier.name}</div></div>
        <div><div class="info-label">Phone</div><div>${selectedSupplier.phone || '-'}</div></div>
        <div><div class="info-label">Generated</div><div>${formatDate(Date.now())}</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Total Purchase</span><span>${formatRs(selectedSupplier.total_purchase)}</span></div>
        <div class="total-row"><span>Total Paid</span><span>${formatRs(selectedSupplier.total_paid)}</span></div>
        <div class="total-row outstanding"><span>Outstanding</span><span>${formatRs(selectedSupplier.remaining_balance)}</span></div>
      </div>
    </div>
    <div class="footer">Ibrahim Bangle Store - Supplier Ledger</div>
  </div>
</body></html>`;
  };

  if (!selectedSupplier) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Supplier Ledger" subtitle="Select a supplier to view ledger" />
        <FlatList
          data={suppliers}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSuppliers} />}
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title="No suppliers" subtitle="Add suppliers to view their ledger" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.supplierCard} onPress={() => selectSupplier(item)}>
              <View style={styles.supplierIcon}><Truck size={20} color={MD3Colors.secondary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supplierName}>{item.name}</Text>
                <Text style={styles.supplierMeta}>{formatRs(item.total_purchase)} purchased · {formatRs(item.remaining_balance)} balance</Text>
              </View>
              {item.remaining_balance > 0 ? (
                <View style={styles.dueBadge}><Text style={styles.dueText}>{formatRs(item.remaining_balance)}</Text></View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={selectedSupplier.name} subtitle="Supplier Ledger" />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: MD3Colors.primaryContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Purchase</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.primary }]}>{formatRs(selectedSupplier.total_purchase)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: MD3Colors.successContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Paid</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.success }]}>{formatRs(selectedSupplier.total_paid)}</Text>
        </View>
        <View style={[styles.summaryCard, selectedSupplier.remaining_balance > 0 ? { backgroundColor: MD3Colors.errorContainer } : { backgroundColor: MD3Colors.surfaceVariant }]}>
          <Text style={styles.summaryCardLabel}>Balance</Text>
          <Text style={[styles.summaryCardValue, selectedSupplier.remaining_balance > 0 ? { color: MD3Colors.error } : { color: MD3Colors.onSurface }]}>{formatRs(selectedSupplier.remaining_balance)}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ledger' && styles.tabActive]} onPress={() => setActiveTab('ledger')}>
          <Text style={[styles.tabText, activeTab === 'ledger' && styles.tabTextActive]}>Payment History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'purchases' && styles.tabActive]} onPress={() => setActiveTab('purchases')}>
          <Text style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>Purchase History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ledger' && (
        <View style={styles.filterBar}>
          <View style={styles.searchWrap}>
            <Search size={16} color={MD3Colors.outline} />
            <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={MD3Colors.outline} value={search} onChangeText={setSearch} onSubmitEditing={applyFilters} />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
            <Filter size={18} color={MD3Colors.primary} />
            {(filterMonth !== null || filterYear || filterPaymentMode) && <View style={styles.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setPdfModalVisible(true)}>
            <FileText size={18} color={MD3Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={(activeTab === 'ledger' ? ledgerEntries : purchases) as any[]}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => selectedSupplier && selectSupplier(selectedSupplier)} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title={activeTab === 'ledger' ? 'No ledger entries' : 'No purchases'} />}
        renderItem={({ item }) => activeTab === 'ledger' ? (
          <View style={styles.ledgerCard}>
            <View style={[styles.ledgerIcon, item.type === 'payment' ? { backgroundColor: MD3Colors.successContainer } : { backgroundColor: MD3Colors.errorContainer }]}>
              {item.type === 'payment' ? <ArrowUpRight size={18} color={MD3Colors.success} /> : <ArrowDownLeft size={18} color={MD3Colors.error} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ledgerNote}>{item.note || (item.type === 'payment' ? 'Payment' : 'Purchase/Opening')}</Text>
              <Text style={styles.ledgerDate}>{formatDate(item.date)}{item.payment_method ? ` · ${item.payment_method}` : ''}{item.transaction_number ? ` · ${item.transaction_number}` : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.ledgerAmount, item.type === 'payment' ? { color: MD3Colors.success } : { color: MD3Colors.error }]}>
                {item.type === 'payment' ? '-' : '+'}{formatRs(item.amount)}
              </Text>
              {item.running_balance !== undefined && (
                <Text style={styles.runningBalance}>Bal: {formatRs(item.running_balance)}</Text>
              )}
            </View>
            {item.ref_type === 'manual_payment' ? (
              <TouchableOpacity onPress={() => handleDeleteEntry(item)} style={styles.ledgerDelete}><Trash2 size={14} color={MD3Colors.error} /></TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.purchaseCard}>
            <View style={styles.purchaseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseInvoice}>{item.invoice_number || `Purchase #${item.id}`}</Text>
                <Text style={styles.purchaseDate}>{formatDate(item.date)} · {item.items.length} items</Text>
              </View>
              <Text style={styles.purchaseAmount}>{formatRs(item.grand_total || item.subtotal)}</Text>
            </View>
            <View style={styles.purchaseItems}>
              {item.items.map((pi: any, i: number) => (
                <Text key={i} style={styles.purchaseItemText}>• {pi.product_name} ({pi.quantity} {pi.unit} × {formatRs(pi.unit_price)})</Text>
              ))}
            </View>
            <View style={styles.purchaseFooter}>
              <Text style={styles.purchasePaidText}>Paid {formatRs(item.amount_paid)}</Text>
              {item.remaining_balance > 0 ? <Text style={styles.purchaseBalText}>Bal {formatRs(item.remaining_balance)}</Text> : null}
              {item.payments && item.payments.length > 0 && <Text style={styles.purchasePayText}>{item.payments.length} payments</Text>}
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setPaymentModalVisible(true)}>
        <Wallet size={26} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedSupplier(null); setLedgerEntries([]); setPurchases([]); }}>
        <Text style={styles.backText}>All Suppliers</Text>
      </TouchableOpacity>

      <PaymentModal
        visible={paymentModalVisible}
        supplierId={selectedSupplier.id}
        onClose={() => setPaymentModalVisible(false)}
        onSaved={() => { setPaymentModalVisible(false); selectSupplier(selectedSupplier); }}
      />

      <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Ledger</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.fieldLabel}>Month</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, filterMonth === null && styles.chipSelected]} onPress={() => setFilterMonth(null)}>
                  <Text style={[styles.chipText, filterMonth === null && styles.chipTextSelected]}>All</Text>
                </TouchableOpacity>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity key={i} style={[styles.chip, filterMonth === i && styles.chipSelected]} onPress={() => setFilterMonth(i)}>
                    <Text style={[styles.chipText, filterMonth === i && styles.chipTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Year" value={filterYear} onChangeText={setFilterYear} placeholder="e.g. 2026" keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Payment Mode</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, !filterPaymentMode && styles.chipSelected]} onPress={() => setFilterPaymentMode('')}>
                  <Text style={[styles.chipText, !filterPaymentMode && styles.chipTextSelected]}>All</Text>
                </TouchableOpacity>
                {PAYMENT_MODES.map(m => (
                  <TouchableOpacity key={m} style={[styles.chip, filterPaymentMode === m && styles.chipSelected]} onPress={() => setFilterPaymentMode(m)}>
                    <Text style={[styles.chipText, filterPaymentMode === m && styles.chipTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button title="Clear" variant="outlined" onPress={clearFilters} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Button title="Apply Filters" onPress={applyFilters} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={pdfModalVisible} animationType="slide" onRequestClose={() => setPdfModalVisible(false)}>
        <View style={styles.pdfContainer}>
          <View style={styles.pdfToolbar}>
            <Text style={styles.pdfTitle}>Ledger PDF - {selectedSupplier.name}</Text>
            <TouchableOpacity onPress={() => setPdfModalVisible(false)}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <View style={styles.pdfWebviewWrap}>
            <WebView ref={webViewRef} source={{ html: generateLedgerHTML() }} style={{ flex: 1 }} originWhitelist={['*']} />
          </View>
          <TouchableOpacity style={styles.pdfPrintBtn} onPress={() => webViewRef.current?.injectJavaScript('window.print();')}>
            <Text style={styles.pdfPrintText}>Print / Save as PDF</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function PaymentModal({ visible, supplierId, onClose, onSaved }: { visible: boolean; supplierId: number; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [txnNumber, setTxnNumber] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount(''); setDate(new Date().toISOString().split('T')[0]); setMethod('Cash'); setTxnNumber(''); setNote(''); setError('');
    }
  }, [visible]);

  const handleSave = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await addSupplierPayment(supplierId, amt, new Date(date).getTime(), method, txnNumber.trim(), note.trim());
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Payment</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Input label="Amount (Rs) *" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
            <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.chipRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, method === m && styles.chipSelected]} onPress={() => setMethod(m)}>
                  <Text style={[styles.chipText, method === m && styles.chipTextSelected]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Transaction Number" value={txnNumber} onChangeText={setTxnNumber} placeholder="Optional" />
            <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Save Payment" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  supplierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  supplierIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.secondaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  supplierName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  supplierMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  dueBadge: { backgroundColor: MD3Colors.errorContainer, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 4 },
  dueText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.error },
  summaryRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  summaryCard: { flex: 1, borderRadius: MD3Radius.md, padding: MD3Spacing.md, ...MD3Elevation.level1 },
  summaryCardLabel: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  summaryCardValue: { fontFamily: 'Roboto-Bold', fontSize: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm },
  tab: { flex: 1, paddingVertical: MD3Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: MD3Colors.primary },
  tabText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center' },
  tabTextActive: { color: MD3Colors.primary },
  filterBar: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, gap: MD3Spacing.sm },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, ...MD3Elevation.level1 },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.sm },
  filterBtn: { position: 'relative', width: 44, height: 44, borderRadius: MD3Radius.full, backgroundColor: MD3Colors.surface, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level1 },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: MD3Colors.error },
  ledgerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  ledgerIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  ledgerNote: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  ledgerDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  ledgerAmount: { fontFamily: 'Roboto-Bold', fontSize: 15 },
  runningBalance: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  ledgerDelete: { padding: MD3Spacing.xs, marginLeft: MD3Spacing.sm },
  purchaseCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1 },
  purchaseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.sm },
  purchaseInvoice: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  purchaseDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  purchaseAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  purchaseItems: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, padding: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  purchaseItemText: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  purchaseFooter: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm },
  purchasePayText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.primary },
  purchasePaidText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.success },
  purchaseBalText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  backBtn: { position: 'absolute', bottom: 20, left: 20, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.sm, ...MD3Elevation.level2 },
  backText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  pdfContainer: { flex: 1, backgroundColor: MD3Colors.background },
  pdfToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  pdfTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, flex: 1 },
  pdfWebviewWrap: { flex: 1, margin: MD3Spacing.sm, borderRadius: MD3Radius.md, overflow: 'hidden', ...MD3Elevation.level1 },
  pdfPrintBtn: { backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.md, paddingVertical: MD3Spacing.md, marginHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.lg, alignItems: 'center' },
  pdfPrintText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onPrimary },
});
