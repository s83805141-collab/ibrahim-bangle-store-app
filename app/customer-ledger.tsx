import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, Linking } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BookOpen, ArrowDownLeft, ArrowUpRight, Trash2, Users, Wallet, ShoppingCart, ChevronLeft } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';
import {
  getAllCustomersFull, getCustomerLedgerWithRunningBalance,
  getSalesByCustomer, addCustomerPayment, deleteCustomerLedgerEntry,
  CustomerWithStats, CustomerLedgerEntry, CustomerLedgerEntryWithBalance, SaleHeaderWithDetails, PAYMENT_METHODS,
} from '@/lib/db/repo';
import type { PaymentMethod } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader, FAB, PremiumModal, StatusBadge } from '@/components/ui';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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

  const sendBalanceOnWhatsApp = async () => {
    if (!selectedCustomer) return;

    const phone = String(
      selectedCustomer.whatsapp || selectedCustomer.phone || ''
    ).replace(/\D/g, '');

    if (!phone) {
      Alert.alert(
        'WhatsApp Number Missing',
        'Customer ka WhatsApp number save nahi hai.'
      );
      return;
    }

    const balance = Number(selectedCustomer.outstanding_balance) || 0;

    if (balance <= 0) {
      Alert.alert(
        'No Balance',
        'Customer ka koi outstanding balance nahi hai.'
      );
      return;
    }

    const message =
      `Ibrahim Bangle Store\n\n` +
      `Dear ${selectedCustomer.name},\n\n` +
      `Aapka outstanding balance ₹${balance.toFixed(2)} hai.\n` +
      `Kripya pending amount clear kar dein.\n\n` +
      `Thank you.`;

    try {
      const url =
        `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
    } catch (error) {
      console.error('WhatsApp open failed:', error);
      Alert.alert('Error', 'WhatsApp open nahi ho saka.');
    }
  };

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
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 140 }}
          ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title="No customers" subtitle="Add customers to view their ledger" />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
              <TouchableOpacity style={styles.customerCard} onPress={() => selectCustomer(item)} activeOpacity={0.85}>
                <View style={styles.customerIcon}><Users size={20} color={MD3Colors.error} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerMeta}>{formatRs(item.total_purchase)} purchased · {formatRs(item.outstanding_balance)} outstanding</Text>
                </View>
                {item.outstanding_balance > 0 ? (
                  <StatusBadge label={formatRs(item.outstanding_balance)} color={MD3Colors.error} bg={MD3Colors.errorContainer} />
                ) : (
                  <StatusBadge label="Settled" color={MD3Colors.success} bg={MD3Colors.successContainer} />
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={selectedCustomer.name} subtitle="Customer Ledger" />

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <Animated.View entering={FadeIn.duration(300)} style={[styles.summaryCard, { backgroundColor: MD3Colors.primaryContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Purchase</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.primary }]}>{formatRs(selectedCustomer.total_purchase)}</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(300).delay(80)} style={[styles.summaryCard, { backgroundColor: MD3Colors.successContainer }]}>
          <Text style={styles.summaryCardLabel}>Total Paid</Text>
          <Text style={[styles.summaryCardValue, { color: MD3Colors.success }]}>{formatRs(selectedCustomer.total_paid)}</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(300).delay(160)} style={[styles.summaryCard, selectedCustomer.outstanding_balance > 0 ? { backgroundColor: MD3Colors.errorContainer } : { backgroundColor: MD3Colors.surfaceVariant }]}>
          <Text style={styles.summaryCardLabel}>Outstanding</Text>
          <Text style={[styles.summaryCardValue, selectedCustomer.outstanding_balance > 0 ? { color: MD3Colors.error } : { color: MD3Colors.onSurface }]}>{formatRs(selectedCustomer.outstanding_balance)}</Text>
        </Animated.View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ledger' && styles.tabActive]} onPress={() => setActiveTab('ledger')}>
          <Wallet size={16} color={activeTab === 'ledger' ? MD3Colors.primary : MD3Colors.onSurfaceVariant} />
          <Text style={[styles.tabText, activeTab === 'ledger' && styles.tabTextActive]}>Payment History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'sales' && styles.tabActive]} onPress={() => setActiveTab('sales')}>
          <ShoppingCart size={16} color={activeTab === 'sales' ? MD3Colors.primary : MD3Colors.onSurfaceVariant} />
          <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>Sales History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={(activeTab === 'ledger' ? ledgerEntries : sales) as any[]}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => selectedCustomer && selectCustomer(selectedCustomer)} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState icon={<BookOpen size={48} color={MD3Colors.outline} />} title={activeTab === 'ledger' ? 'No ledger entries' : 'No sales'} />}
        renderItem={({ item, index }: { item: any; index: number }) => activeTab === 'ledger' ? (
          <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
            <View style={styles.ledgerCard}>
              <View style={[styles.ledgerIcon, item.type === 'payment' ? { backgroundColor: MD3Colors.successContainer } : { backgroundColor: MD3Colors.errorContainer }]}>
                {item.type === 'payment' ? <ArrowUpRight size={18} color={MD3Colors.success} /> : <ArrowDownLeft size={18} color={MD3Colors.error} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerNote}>{item.note || (item.type === 'payment' ? 'Payment' : 'Sale/Opening')}</Text>
                <Text style={styles.ledgerDate}>{formatDate(item.date)}{item.payment_method ? ` · ${item.payment_method}` : ''}{item.transaction_number ? ` · ${item.transaction_number}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.ledgerAmount, item.type === 'payment' ? { color: MD3Colors.success } : { color: MD3Colors.error }]}>
                  {item.type === 'payment' ? '-' : '+'}{formatRs(item.amount)}
                </Text>
                {item.running_balance !== undefined && (
                  <Text style={styles.ledgerRunning}>Bal: {formatRs(item.running_balance)}</Text>
                )}
              </View>
              {item.ref_type === 'manual_payment' ? (
                <TouchableOpacity onPress={() => handleDeleteEntry(item)} style={styles.ledgerDelete}>
                  <Trash2 size={16} color={MD3Colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
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
                <StatusBadge label={item.payment_method} color={MD3Colors.primary} bg={MD3Colors.primaryContainer} />
                <Text style={styles.salePaidText}>Received {formatRs(item.amount_received)}</Text>
                {item.balance_due > 0 ? <Text style={styles.saleBalText}>Due {formatRs(item.balance_due)}</Text> : null}
              </View>
            </View>
          </Animated.View>
        )}
      />

      <FAB onPress={() => setPaymentModalVisible(true)} icon={Wallet} intent="payment" />

      <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedCustomer(null); setLedgerEntries([]); setSales([]); }}>
        <ChevronLeft size={18} color={MD3Colors.primary} strokeWidth={2.2} />
        <Text style={styles.backText}>All Customers</Text>
      </TouchableOpacity>

      {selectedCustomer.outstanding_balance > 0 ? (
      <TouchableOpacity
        style={styles.whatsappBalanceButton}
        onPress={sendBalanceOnWhatsApp}
        activeOpacity={0.85}
      >
        <Text style={styles.whatsappBalanceText}>
          Send Balance on WhatsApp
        </Text>
      </TouchableOpacity>
    ) : null}

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
    <PremiumModal
      visible={visible}
      onClose={onClose}
      title="Add Payment"
      footer={
        <>
          <Button title="Cancel" intent="cancel" variant="outlined" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save Payment" intent="save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
        </>
      }
    >
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
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  customerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.sm,
    ...MD3Elevation.level2,
  },
  customerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: MD3Colors.errorContainer,
    justifyContent: 'center', alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  customerName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 3 },
  customerMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  summaryRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, gap: MD3Spacing.sm, marginBottom: MD3Spacing.md },
  summaryCard: { flex: 1, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, ...MD3Elevation.level2 },
  summaryCardLabel: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  summaryCardValue: { fontFamily: 'Roboto-Bold', fontSize: 15 },
  tabRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, gap: MD3Spacing.xs },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: MD3Spacing.sm,
    borderRadius: MD3Radius.lg,
    backgroundColor: MD3Colors.surface,
    ...MD3Elevation.level1,
  },
  tabActive: { backgroundColor: MD3Colors.primaryContainer },
  tabText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  tabTextActive: { color: MD3Colors.primary },
  ledgerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.sm,
    ...MD3Elevation.level2,
  },
  ledgerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  ledgerNote: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  ledgerDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  ledgerAmount: { fontFamily: 'Roboto-Bold', fontSize: 15 },
  ledgerRunning: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  ledgerDelete: { padding: MD3Spacing.sm, marginLeft: MD3Spacing.xs },
  saleCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  saleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.sm },
  saleInvoice: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  saleDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  saleAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  saleItems: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  saleItemText: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  saleFooter: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  salePaidText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.success },
  saleBalText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
  whatsappBalanceButton: {
    marginHorizontal: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    paddingVertical: MD3Spacing.md,
    borderRadius: MD3Radius.lg,
    backgroundColor: MD3Colors.primary,
    alignItems: 'center',
    ...MD3Elevation.level1,
  },
  whatsappBalanceText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: MD3Colors.onPrimary,
  },
  backBtn: {
    position: 'absolute', bottom: 24, left: 24,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.lg,
    paddingVertical: MD3Spacing.sm + 2,
    ...MD3Elevation.level2,
  },
  backText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.md },
  chip: {
    paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm,
    borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline,
    backgroundColor: MD3Colors.surface,
  },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
});
