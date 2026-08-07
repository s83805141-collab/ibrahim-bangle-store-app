import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, ArrowDownLeft, ArrowUpRight, ChevronRight, Calendar, SortDesc } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllSales, getAllPurchases, getCustomerById, getSupplierById,
  SaleHeaderWithDetails, PurchaseHeaderWithDetails,
} from '@/lib/db/repo';
import { ScreenHeader, EmptyState, StatusBadge } from '@/components/ui';

type SortMode = 'latest' | 'oldest' | 'highest' | 'lowest';

interface UnifiedInvoice {
  id: number;
  type: 'sale' | 'purchase';
  invoice_number: string;
  party_name: string;
  party_phone: string;
  date: number;
  amount: number;
  paid: number;
  due: number;
  raw: SaleHeaderWithDetails | PurchaseHeaderWithDetails;
}

export default function InvoiceHistoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sales, purchases] = await Promise.all([getAllSales(), getAllPurchases()]);
      const unified: UnifiedInvoice[] = [];

      for (const s of sales) {
        let phone = s.customer_phone || '';
        if (!phone && s.customer_id) {
          const cust = await getCustomerById(s.customer_id);
          phone = cust?.phone || '';
        }
        unified.push({
          id: s.id,
          type: 'sale',
          invoice_number: s.invoice_number,
          party_name: s.customer_name,
          party_phone: phone,
          date: s.date,
          amount: s.grand_total,
          paid: s.amount_received,
          due: s.balance_due,
          raw: s,
        });
      }

      for (const p of purchases) {
        let phone = '';
        const sup = await getSupplierById(p.supplier_id);
        phone = sup?.phone || '';
        unified.push({
          id: p.id,
          type: 'purchase',
          invoice_number: p.invoice_number || `PUR-${p.id}`,
          party_name: p.supplier_name,
          party_phone: phone,
          date: p.date,
          amount: p.grand_total || p.subtotal,
          paid: p.amount_paid,
          due: p.remaining_balance,
          raw: p,
        });
      }

      setInvoices(unified);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let result = invoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(inv =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.party_name.toLowerCase().includes(q) ||
        inv.party_phone.toLowerCase().includes(q) ||
        new Date(inv.date).toLocaleDateString('en-GB').includes(q)
      );
    }
    const sorted = [...result];
    switch (sortMode) {
      case 'latest': sorted.sort((a, b) => b.date - a.date); break;
      case 'oldest': sorted.sort((a, b) => a.date - b.date); break;
      case 'highest': sorted.sort((a, b) => b.amount - a.amount); break;
      case 'lowest': sorted.sort((a, b) => a.amount - b.amount); break;
    }
    return sorted;
  }, [invoices, search, sortMode]);

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const sortLabels: Record<SortMode, string> = {
    latest: 'Latest First',
    oldest: 'Oldest First',
    highest: 'Highest Amount',
    lowest: 'Lowest Amount',
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Invoice History" subtitle="All sales & purchase invoices" />

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={MD3Colors.outline} strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice, customer, supplier, phone, date..."
            placeholderTextColor={MD3Colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <SortDesc size={18} color={MD3Colors.primary} strokeWidth={2.2} />
          <Text style={styles.sortBtnText} numberOfLines={1}>{sortLabels[sortMode]}</Text>
        </TouchableOpacity>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {(['latest', 'oldest', 'highest', 'lowest'] as SortMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortMenuItem, sortMode === mode && styles.sortMenuItemActive]}
              onPress={() => { setSortMode(mode); setShowSortMenu(false); }}
            >
              <Text style={[styles.sortMenuText, sortMode === mode && styles.sortMenuTextActive]}>{sortLabels[mode]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={{ padding: MD3Spacing.md, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Search size={48} color={MD3Colors.outline} />}
            title="No invoices found"
            subtitle="Try a different search or sort option"
          />
        }
        renderItem={({ item, index }) => {
          const isSale = item.type === 'sale';
          const Icon = isSale ? ArrowUpRight : ArrowDownLeft;
          const color = isSale ? MD3Colors.primary : MD3Colors.secondary;
          const bg = isSale ? MD3Colors.primaryContainer : MD3Colors.secondaryContainer;
          return (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/invoice-details',
                params: { type: item.type, id: String(item.id) },
              })}
            >
              <Animated.View entering={FadeInDown.duration(200).delay(index * 30)} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: bg }]}>
                    <Icon size={20} color={color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardInvoice} numberOfLines={1}>{item.invoice_number}</Text>
                    <Text style={styles.cardParty} numberOfLines={1}>{item.party_name}</Text>
                    <View style={styles.cardMetaRow}>
                      <Calendar size={11} color={MD3Colors.outline} strokeWidth={2} />
                      <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                      {item.party_phone ? <Text style={styles.cardPhone}> · {item.party_phone}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardAmount, { color }]}>{formatRs(item.amount)}</Text>
                    {item.due > 0 ? (
                      <StatusBadge label={`Due ${formatRs(item.due)}`} color={MD3Colors.error} bg={MD3Colors.errorContainer} />
                    ) : (
                      <StatusBadge label="Paid" color={MD3Colors.success} bg={MD3Colors.successContainer} />
                    )}
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <View style={[styles.typeBadge, { backgroundColor: isSale ? MD3Colors.primaryContainer : MD3Colors.secondaryContainer }]}>
                    <Text style={[styles.typeBadgeText, { color: isSale ? MD3Colors.primary : MD3Colors.secondary }]}>
                      {isSale ? 'SALE' : 'PURCHASE'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={MD3Colors.outline} strokeWidth={2.2} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  searchRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.md, paddingBottom: MD3Spacing.sm, gap: MD3Spacing.sm },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.sm, ...MD3Elevation.level1 },
  searchIcon: { marginRight: MD3Spacing.xs },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.sm },
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.primaryContainer, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, gap: 4 },
  sortBtnText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.primary, fontWeight: '600' },
  sortMenu: { marginHorizontal: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level3, overflow: 'hidden' },
  sortMenuItem: { paddingVertical: MD3Spacing.sm + 2, paddingHorizontal: MD3Spacing.md, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  sortMenuItemActive: { backgroundColor: MD3Colors.primaryContainer },
  sortMenuText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  sortMenuTextActive: { color: MD3Colors.primary, fontWeight: '700' },
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  cardInfo: { flex: 1 },
  cardInvoice: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: 2 },
  cardParty: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardDate: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline },
  cardPhone: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, marginBottom: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: MD3Spacing.sm, paddingTop: MD3Spacing.sm, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  typeBadge: { paddingHorizontal: MD3Spacing.sm, paddingVertical: 3, borderRadius: MD3Radius.sm },
  typeBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 10, fontWeight: '700' },
});
