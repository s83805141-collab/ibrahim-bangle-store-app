import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BookOpen, Plus, ArrowDownLeft, ArrowUpRight, Trash2, X, Users, Wallet, ShoppingCart } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllCustomersFull, getCustomerById, getCustomerLedgerEntries, getCustomerLedgerTotals,
  getCustomerLedgerWithRunningBalance,
  getSalesByCustomer, addCustomerPayment, deleteCustomerLedgerEntry,
  CustomerWithStats, CustomerLedgerEntry, CustomerLedgerEntryWithBalance, SaleHeaderWithDetails, PAYMENT_METHODS,
} from '@/lib/db/repo';
import type { PaymentMethod } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

export default function CustomerLedgerScreen() {
  const params = useLocalSearchParams<{ customerId?: string }>();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntryWithBalance[]>([]);
  const [sales, setSales] = useState<SaleHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales'>('ledger');

  const loadCustomers = useCallback(async () => {
    try {
      const custs = await getAllCustomersFull();
      setCustomers(custs);
      if (params.customerId) {
        const id = parseInt(params.customerId);
        const c = custs.find(x => x.id === id);
        if (c) await selectCustomer(c);
      }
    } finally {
      setLoading(false);
    }
  }, [params.customerId]);

  useFocusEffect(useCallback(() => { loadCustomers(); }, [loadCustomers]));

  const selectCustomer = async (c: CustomerWithStats) => {
    setSelectedCustomer(c);
    const [entries, sals] = await Promise.all([
      getCustomerLedgerWithRunningBalance(c.id),
      getSalesByCustomer(c.id),
    ]);
    setLedgerEntries(entries);
    setSales(sals);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleDeleteEntry = (entry: CustomerLedgerEntry) => {
    if (entry.ref_type !== 'manual_payment') {
      Alert.alert('Cannot Delete', 'This entry is linked to a sale. Delete the sale instead.');
      return;
    }
    Alert.alert('Delete Payment', 'Delete this payment entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteCustomerLedgerEntry(entry.id);
        if (selectedCustomer) await selectCustomer(selectedCustomer);
      }},
    ]);
  };

  if (!selectedCustomer) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Customer Ledger" subtitle="Select a customer to view ledger" />
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCustomers} />}
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title="No customers" subtitle="Add customers to view their ledger" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.customerCard} onPress={() => selectCustomer(item)}>
              <View style={styles.customerIcon}><Users size={20} color={MD3Colors.error} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerMeta}>{formatRs(item.total_purchase)} purchased · {formatRs(item.outstanding_balance)} outstanding</Text>
              </View>
              {item.outstanding_balance > 0 ? (
                <View style={styles.dueBadge}><Text style={styles.dueText}>{formatRs(item.outstanding_balance)}</Text></View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={selectedCustomer.name} subtitle="Customer Ledger" />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: MD3Colors.primaryContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Purchase</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.primary }]}>{formatRs(selectedCustomer.total_purchase)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: MD3Colors.successContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Paid</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.success }]}>{formatRs(selectedCustomer.total_paid)}</Text>
        </View>
        <View style={[styles.summaryCard, selectedCustomer.outstanding_balance > 0 ? { backgroundColor: MD3Colors.errorContainer } : { backgroundColor: MD3Colors.surfaceVariant }]}>
          <Text style={styles.summaryCardLabel}>Outstanding</Text>
          <Text style={[styles.summaryCardValue, selectedCustomer.outstanding_balance > 0 ? { color: MD3Colors.error } : { color: MD3Colors.onSurface }]}>{formatRs(selectedCustomer.outstanding_balance)}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ledger' && styles.tabActive]} onPress={() => setActiveTab('ledger')}>
          <Text style={[styles.tabText, activeTab === 'ledger' && styles.tabTextActive]}>Payment History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'sales' && styles.tabActive]} onPress={() => setActiveTab('sales')}>
          <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>Sales History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={(activeTab === 'ledger' ? ledgerEntries : sales) as any[]}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => selectedCustomer && selectCustomer(selectedCustomer)} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title={activeTab === 'ledger' ? 'No ledger entries' : 'No sales'} />}
        renderItem={({ item }: { item: any }) => activeTab === 'ledger' ? (
          <View style={styles.ledgerCard}>
            <View style={[styles.ledgerIcon, item.type === 'payment' ? { backgroundColor: MD3Colors.successContainer } : { backgroundColor: MD3Colors.errorContainer }]}>
              {item.type === 'payment' ? <ArrowUpRight size={18} color={MD3Colors.success} /> : <ArrowDownLeft size={18} color={MD3Colors.error} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ledgerNote}>{item.note || (item.type === 'payment' ? 'Payment' : 'Sale/Opening')}</Text>
              <Text style={styles.ledgerDate}>{formatDate(item.date)}{item.payment_method ? ` · ${item.payment_method}` : ''}{item.transaction_number ? ` · ${item.transaction_number}` : ''}</Text>
            </View>
            <Text style={[styles.ledgerAmount, item.type === 'payment' ? { color: MD3Colors.success } : { color: MD3Colors.error }]}>
              {item.type === 'payment' ? '-' : '+'}{formatRs(item.amount)}
            </Text>
            <Text style={styles.ledgerRunning}>Bal: {formatRs(item.running_balance || 0)}</Text>
            {item.ref_type === 'manual_payment' ? (
              <TouchableOpacity onPress={() => handleDeleteEntry(item)} style={styles.ledgerDelete}><Trash2 size={14} color={MD3Colors.error} /></TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.saleCard}>
            <View style={styles.saleHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleInvoice}>{item.invoice_number}</Text>
                <Text style={styles.saleDate}>{formatDate(item.date)} · {item.items.length} items</Text>
              </View>
              <Text style={styles.saleAmount}>{formatRs(item.grand_total)}</Text>
            </View>
            <View style={styles.saleItems}>
              {item.items.map((si: any, i: number) => (
                <Text key={i} style={styles.saleItemText}>• {si.product_name} ({si.quantity} {si.unit} × {formatRs(si.unit_price)})</Text>
              ))}
            </View>
            <View style={styles.saleFooter}>
              <View style={styles.salePayBadge}><Text style={styles.salePayText}>{item.payment_method}</Text></View>
              <Text style={styles.salePaidText}>Received {formatRs(item.amount_received)}</Text>
              {item.balance_due > 0 ? <Text style={styles.saleBalText}>Due {formatRs(item.balance_due)}</Text> : null}
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setPaymentModalVisible(true)}>
        <Wallet size={26} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedCustomer(null); setLedgerEntries([]); setSales([]); }}>
        <Text style={styles.backText}>All Customers</Text>
      </TouchableOpacity>

      <PaymentModal
        visible={paymentModalVisible}
        customerId={selectedCustomer.id}
        onClose={() => setPaymentModalVisible(false)}
        onSaved={() => { setPaymentModalVisible(false); selectCustomer(selectedCustomer); }}
      />
    </View>
  );
}

function PaymentModal({ visible, customerId, onClose, onSaved }: { visible: boolean; customerId: number; onClose: () => void; onSaved: () => void }) {
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
      await addCustomerPayment(customerId, amt, new Date(date).getTime(), method, txnNumber.trim(), note.trim());
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
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  customerIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.errorContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  customerName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  customerMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
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
  ledgerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  ledgerIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  ledgerNote: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  ledgerDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  ledgerAmount: { fontFamily: 'Roboto-Bold', fontSize: 15, marginHorizontal: MD3Spacing.sm },
  ledgerRunning: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginHorizontal: MD3Spacing.sm, marginTop: 2 },
  ledgerDelete: { padding: MD3Spacing.xs },
  saleCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1 },
  saleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.sm },
  saleInvoice: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  saleDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  saleAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  saleItems: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, padding: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  saleItemText: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  saleFooter: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm },
  salePayBadge: { backgroundColor: MD3Colors.primaryContainer, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 3 },
  salePayText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.primary },
  salePaidText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.success },
  saleBalText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
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
});
