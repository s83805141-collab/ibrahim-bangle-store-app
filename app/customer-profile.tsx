import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, Phone, MapPin, ShoppingBag, Wallet, TrendingUp, FileText,
  MessageCircle, ChevronRight, Calendar,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getCustomerById, getSalesByCustomer, getCustomerLedgerWithRunningBalance,
  CustomerWithStats, SaleHeaderWithDetails, CustomerLedgerEntryWithBalance,
} from '@/lib/db/repo';
import { ScreenHeader, EmptyState, StatusBadge } from '@/components/ui';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [sales, setSales] = useState<SaleHeaderWithDetails[]>([]);
  const [ledger, setLedger] = useState<CustomerLedgerEntryWithBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!params.id) { setLoading(false); return; }
    try {
      const [c, s, l] = await Promise.all([
        getCustomerById(parseInt(params.id)),
        getSalesByCustomer(parseInt(params.id)),
        getCustomerLedgerWithRunningBalance(parseInt(params.id)),
      ]);
      setCustomer(c);
      setSales(s);
      setLedger(l);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Not Found</Text>
        </View>
        <EmptyState icon={<ShoppingBag size={48} color={MD3Colors.outline} />} title="Customer not found" subtitle="" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
          <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Customer Profile</Text>
      </View>

      <Animated.View entering={FadeIn.duration(300)}>
        <LinearGradient
          colors={[MD3Colors.primary, '#0D47A1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{customer.name}</Text>
          {customer.phone ? (
            <View style={styles.headerInfoRow}>
              <Phone size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.headerInfoText}>{customer.phone}</Text>
            </View>
          ) : null}
          {customer.address ? (
            <View style={styles.headerInfoRow}>
              <MapPin size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.headerInfoText}>{customer.address}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: MD3Colors.primaryContainer }]}>
            <ShoppingBag size={20} color={MD3Colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.statValue}>{formatRs(customer.total_purchase)}</Text>
          <Text style={styles.statLabel}>Total Purchase</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: MD3Colors.successContainer }]}>
            <Wallet size={20} color={MD3Colors.success} strokeWidth={2.2} />
          </View>
          <Text style={styles.statValue}>{formatRs(customer.total_paid)}</Text>
          <Text style={styles.statLabel}>Total Paid</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: customer.outstanding_balance > 0 ? MD3Colors.errorContainer : MD3Colors.successContainer }]}>
            <TrendingUp size={20} color={customer.outstanding_balance > 0 ? MD3Colors.error : MD3Colors.success} strokeWidth={2.2} />
          </View>
          <Text style={[styles.statValue, { color: customer.outstanding_balance > 0 ? MD3Colors.error : MD3Colors.success }]}>
            {formatRs(customer.outstanding_balance)}
          </Text>
          <Text style={styles.statLabel}>Due Amount</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Purchase History ({sales.length})</Text>
      {sales.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No purchases yet</Text>
        </View>
      ) : (
        sales.map((s, i) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => router.push({ pathname: '/invoice-details', params: { type: 'sale', id: String(s.id) } })}
          >
            <Animated.View entering={FadeInDown.duration(200).delay(i * 30)} style={styles.invoiceCard}>
              <View style={styles.invoiceTop}>
                <View style={[styles.invoiceIcon, { backgroundColor: MD3Colors.primaryContainer }]}>
                  <FileText size={18} color={MD3Colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{s.invoice_number}</Text>
                  <View style={styles.invoiceMetaRow}>
                    <Calendar size={11} color={MD3Colors.outline} strokeWidth={2} />
                    <Text style={styles.invoiceDate}>{formatDate(s.date)}</Text>
                  </View>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{formatRs(s.grand_total)}</Text>
                  {s.balance_due > 0 ? (
                    <StatusBadge label={`Due ${formatRs(s.balance_due)}`} color={MD3Colors.error} bg={MD3Colors.errorContainer} />
                  ) : (
                    <StatusBadge label="Paid" color={MD3Colors.success} bg={MD3Colors.successContainer} />
                  )}
                </View>
                <ChevronRight size={16} color={MD3Colors.outline} strokeWidth={2.2} />
              </View>
            </Animated.View>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>Ledger ({ledger.length})</Text>
      {ledger.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No ledger entries</Text>
        </View>
      ) : (
        <View style={styles.ledgerCard}>
          {ledger.map((entry, i) => {
            const isSale = entry.type === 'sale' || entry.type === 'opening';
            const isPayment = entry.type === 'payment';
            const color = isSale ? MD3Colors.error : MD3Colors.success;
            return (
              <View key={entry.id} style={[styles.ledgerRow, i < ledger.length - 1 && styles.ledgerRowBorder]}>
                <View style={styles.ledgerLeft}>
                  <View style={[styles.ledgerDot, { backgroundColor: color }]} />
                  <View>
                    <Text style={styles.ledgerNote}>{entry.note}</Text>
                    <Text style={styles.ledgerDate}>{formatDate(entry.date)}</Text>
                  </View>
                </View>
                <View style={styles.ledgerRight}>
                  <Text style={[styles.ledgerAmount, { color }]}>
                    {isSale ? '+' : '-'}{formatRs(entry.amount)}
                  </Text>
                  <Text style={styles.ledgerBalance}>Bal: {formatRs(entry.running_balance)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  toolbarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  toolbarTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginLeft: MD3Spacing.sm },
  headerCard: { margin: MD3Spacing.md, borderRadius: MD3Radius.xl, padding: MD3Spacing.lg, alignItems: 'center', ...MD3Elevation.level3 },
  headerAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: MD3Spacing.sm },
  headerAvatarText: { fontFamily: 'Roboto-Bold', fontSize: 28, color: '#FFFFFF' },
  headerName: { fontFamily: 'Roboto-Bold', fontSize: 22, color: '#FFFFFF', marginBottom: MD3Spacing.xs },
  headerInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerInfoText: { fontFamily: 'Roboto-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.md, gap: MD3Spacing.sm, marginBottom: MD3Spacing.md },
  statCard: { flex: 1, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.sm, alignItems: 'center', ...MD3Elevation.level2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: MD3Spacing.xs },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2, textAlign: 'center' },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant, textAlign: 'center' },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 17, color: MD3Colors.onSurface, paddingHorizontal: MD3Spacing.md, marginBottom: MD3Spacing.sm, marginTop: MD3Spacing.sm },
  emptyCard: { marginHorizontal: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.lg, alignItems: 'center', ...MD3Elevation.level1 },
  emptyText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  invoiceCard: { marginHorizontal: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level2 },
  invoiceTop: { flexDirection: 'row', alignItems: 'center' },
  invoiceIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  invoiceInfo: { flex: 1 },
  invoiceNumber: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  invoiceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  invoiceDate: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline },
  invoiceRight: { alignItems: 'flex-end', marginRight: MD3Spacing.xs },
  invoiceAmount: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: 2 },
  ledgerCard: { marginHorizontal: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, ...MD3Elevation.level2 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MD3Spacing.sm },
  ledgerRowBorder: { borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  ledgerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: MD3Spacing.sm },
  ledgerDot: { width: 8, height: 8, borderRadius: 4 },
  ledgerNote: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurface, marginBottom: 2 },
  ledgerDate: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline },
  ledgerRight: { alignItems: 'flex-end' },
  ledgerAmount: { fontFamily: 'Roboto-Bold', fontSize: 14, marginBottom: 2 },
  ledgerBalance: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.outline },
});
