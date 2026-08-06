import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, Package, Users, Truck, FileText, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllProducts, getAllCustomersFull, getAllSuppliersFull, getAllSales, getAllPurchases,
  ProductWithDetails, CustomerWithStats, SupplierWithStats,
  SaleHeaderWithDetails, PurchaseHeaderWithDetails,
} from '@/lib/db/repo';
import { ScreenHeader, EmptyState } from '@/components/ui';

interface SearchResult {
  id: number;
  type: 'product' | 'customer' | 'supplier' | 'sale' | 'purchase';
  title: string;
  subtitle: string;
  meta: string;
  route: string;
  routeParams?: Record<string, string>;
}

export default function GlobalSearchScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [sales, setSales] = useState<SaleHeaderWithDetails[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, c, s, sa, pu] = await Promise.all([
        getAllProducts(), getAllCustomersFull(), getAllSuppliersFull(),
        getAllSales(), getAllPurchases(),
      ]);
      setProducts(p);
      setCustomers(c);
      setSuppliers(s);
      setSales(sa);
      setPurchases(pu);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const results = useMemo<SearchResult[]>(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const results: SearchResult[] = [];

    for (const p of products) {
      if (p.name.toLowerCase().includes(q) || (p.design_number || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q)) {
        results.push({
          id: p.id,
          type: 'product',
          title: p.name,
          subtitle: p.design_number || p.category_name || '',
          meta: `Stock: ${p.total_stock} ${p.unit}`,
          route: '/stock',
        });
      }
    }

    for (const c of customers) {
      if (c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          type: 'customer',
          title: c.name,
          subtitle: c.phone || '',
          meta: c.outstanding_balance > 0 ? `Due: Rs ${c.outstanding_balance.toLocaleString('en-PK')}` : 'No due',
          route: '/customer-profile',
          routeParams: { id: String(c.id) },
        });
      }
    }

    for (const s of suppliers) {
      if (s.name.toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q)) {
        results.push({
          id: s.id,
          type: 'supplier',
          title: s.name,
          subtitle: s.phone || '',
          meta: s.remaining_balance > 0 ? `Due: Rs ${s.remaining_balance.toLocaleString('en-PK')}` : 'No due',
          route: '/supplier-profile',
          routeParams: { id: String(s.id) },
        });
      }
    }

    for (const sa of sales) {
      if (sa.invoice_number.toLowerCase().includes(q) || sa.customer_name.toLowerCase().includes(q)) {
        results.push({
          id: sa.id,
          type: 'sale',
          title: sa.invoice_number,
          subtitle: sa.customer_name,
          meta: `Rs ${sa.grand_total.toLocaleString('en-PK')}`,
          route: '/invoice-details',
          routeParams: { type: 'sale', id: String(sa.id) },
        });
      }
    }

    for (const pu of purchases) {
      const invNum = pu.invoice_number || `PUR-${pu.id}`;
      if (invNum.toLowerCase().includes(q) || pu.supplier_name.toLowerCase().includes(q)) {
        results.push({
          id: pu.id,
          type: 'purchase',
          title: invNum,
          subtitle: pu.supplier_name,
          meta: `Rs ${(pu.grand_total || pu.subtotal).toLocaleString('en-PK')}`,
          route: '/invoice-details',
          routeParams: { type: 'purchase', id: String(pu.id) },
        });
      }
    }

    return results.slice(0, 50);
  }, [search, products, customers, suppliers, sales, purchases]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return <Package size={20} color={MD3Colors.accent} strokeWidth={2.2} />;
      case 'customer': return <Users size={20} color={MD3Colors.error} strokeWidth={2.2} />;
      case 'supplier': return <Truck size={20} color={MD3Colors.secondary} strokeWidth={2.2} />;
      case 'sale': return <FileText size={20} color={MD3Colors.primary} strokeWidth={2.2} />;
      case 'purchase': return <FileText size={20} color={MD3Colors.secondary} strokeWidth={2.2} />;
    }
  };

  const getIconBg = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return MD3Colors.accentContainer;
      case 'customer': return MD3Colors.errorContainer;
      case 'supplier': return MD3Colors.secondaryContainer;
      case 'sale': return MD3Colors.primaryContainer;
      case 'purchase': return MD3Colors.secondaryContainer;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return 'PRODUCT';
      case 'customer': return 'CUSTOMER';
      case 'supplier': return 'SUPPLIER';
      case 'sale': return 'SALE INVOICE';
      case 'purchase': return 'PURCHASE INVOICE';
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Global Search" subtitle="Search everything" />

      <View style={styles.searchWrap}>
        <Search size={20} color={MD3Colors.outline} strokeWidth={2.2} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, customers, suppliers, invoices..."
          placeholderTextColor={MD3Colors.outline}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {results.length === 0 && search.trim() ? (
        <EmptyState
          icon={<Search size={48} color={MD3Colors.outline} />}
          title="No results found"
          subtitle={`No matches for "${search}"`}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search size={48} color={MD3Colors.outline} />}
          title="Start typing to search"
          subtitle="Search across products, customers, suppliers, and invoices"
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ padding: MD3Spacing.md, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: item.route as any,
                params: item.routeParams || {},
              })}
            >
              <Animated.View entering={FadeInDown.duration(150).delay(index * 20)} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: getIconBg(item.type) }]}>
                  {getIcon(item.type)}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTypeRow}>
                    <Text style={styles.cardType}>{getTypeLabel(item.type)}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
                  <Text style={styles.cardMeta}>{item.meta}</Text>
                </View>
                <ChevronRight size={18} color={MD3Colors.outline} strokeWidth={2.2} />
              </Animated.View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, margin: MD3Spacing.md, paddingHorizontal: MD3Spacing.md, ...MD3Elevation.level2 },
  searchIcon: { marginRight: MD3Spacing.sm },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 15, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level2 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  cardInfo: { flex: 1 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardType: { fontFamily: 'Roboto-Bold', fontSize: 9, color: MD3Colors.outline, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: 2 },
  cardSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.outline, fontWeight: '600' },
});
