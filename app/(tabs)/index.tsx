import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Package, Boxes, ShoppingCart, Truck, AlertTriangle, Wallet, Users, TrendingUp, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getDashboardStats } from '@/lib/db/repo';
import { ScreenHeader } from '@/components/ui';

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await getDashboardStats();
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatCurrency = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatTime = (ts: number) => new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <ScreenHeader title="Ibrahim Bangle Store" subtitle="Wholesale & Retail Inventory" />

      <View style={styles.welcomeCard}>
        <View style={styles.welcomeTextWrap}>
          <Text style={styles.welcomeTitle}>Assalamu Alaikum!</Text>
          <Text style={styles.welcomeSubtitle}>Here's your store overview</Text>
        </View>
        <View style={styles.welcomeIconWrap}>
          <TrendingUp size={32} color={MD3Colors.onPrimary} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<Package size={24} color={MD3Colors.primary} />}
          label="Total Products"
          value={stats?.productCount ?? 0}
          color={MD3Colors.primaryContainer}
          onPress={() => router.push('/(tabs)/products')}
        />
        <StatCard
          icon={<Boxes size={24} color={MD3Colors.accent} />}
          label="Total Stock Qty"
          value={stats?.totalStock ?? 0}
          color="#B2DFDB"
          onPress={() => router.push('/stock')}
        />
        <StatCard
          icon={<Truck size={24} color={MD3Colors.secondary} />}
          label="Today's Purchase"
          value={formatCurrency(stats?.todayPurchase ?? 0)}
          color={MD3Colors.secondaryContainer}
          small
          onPress={() => router.push('/purchases')}
        />
        <StatCard
          icon={<ShoppingCart size={24} color={MD3Colors.primary} />}
          label="Today's Sales"
          value={formatCurrency(stats?.todaySales ?? 0)}
          color={MD3Colors.primaryContainer}
          small
          onPress={() => router.push('/(tabs)/sales')}
        />
        <StatCard
          icon={<AlertTriangle size={24} color={MD3Colors.warning} />}
          label="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          color={MD3Colors.warningContainer}
          onPress={() => router.push('/stock')}
        />
        <StatCard
          icon={<Wallet size={24} color={MD3Colors.error} />}
          label="Pending Supplier"
          value={formatCurrency(stats?.pendingSupplierBalance ?? 0)}
          color={MD3Colors.errorContainer}
          small
          onPress={() => router.push('/supplier-ledger')}
        />
        <StatCard
          icon={<Users size={24} color={MD3Colors.tertiary} />}
          label="Pending Customer"
          value={formatCurrency(stats?.pendingCustomerBalance ?? 0)}
          color={MD3Colors.tertiaryContainer}
          small
          onPress={() => router.push('/customer-ledger')}
        />
        <StatCard
          icon={<Receipt size={24} color={MD3Colors.success} />}
          label="New Sale"
          value="Sell"
          color={MD3Colors.successContainer}
          onPress={() => router.push('/(tabs)/sales')}
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <View style={styles.transactionsCard}>
        {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
          <Text style={styles.emptyText}>No recent transactions</Text>
        ) : (
          stats.recentTransactions.map((tx: any, i: number) => {
            const isPurchase = tx.type === 'purchase';
            const Icon = isPurchase ? ArrowDownLeft : ArrowUpRight;
            const color = isPurchase ? MD3Colors.secondary : MD3Colors.primary;
            const bg = isPurchase ? MD3Colors.secondaryContainer : MD3Colors.primaryContainer;
            return (
              <View key={i} style={[styles.txRow, i < stats.recentTransactions.length - 1 && styles.txRowBorder]}>
                <View style={[styles.txIcon, { backgroundColor: bg }]}>
                  <Icon size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
                  <Text style={styles.txTime}>{formatTime(tx.date)}</Text>
                </View>
                <Text style={[styles.txAmount, { color }]}>{isPurchase ? '-' : '+'}{formatCurrency(tx.amount)}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color, small, onPress }: { icon: React.ReactNode; label: string; value: any; color: string; small?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.statCard} disabled={!onPress}>
      <View style={[styles.statIconWrap, { backgroundColor: color }]}>{icon}</View>
      <Text style={styles.statValue} numberOfLines={small ? 2 : 1}>{small ? value : String(value)}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  content: { padding: MD3Spacing.lg, paddingBottom: MD3Spacing.xxl },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: MD3Colors.primary,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.lg,
    ...MD3Elevation.level2,
  },
  welcomeTextWrap: { flex: 1 },
  welcomeTitle: { fontFamily: 'Roboto-Bold', fontSize: 22, color: MD3Colors.onPrimary, marginBottom: 2 },
  welcomeSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onPrimary, opacity: 0.85 },
  welcomeIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1 },
  statIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: MD3Spacing.sm },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 22, color: MD3Colors.onSurface, marginBottom: 2 },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface, marginTop: MD3Spacing.sm, marginBottom: MD3Spacing.md },
  transactionsCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, ...MD3Elevation.level1 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: MD3Spacing.sm },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  txLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  txTime: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  txAmount: { fontFamily: 'Roboto-Bold', fontSize: 15 },
  emptyText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: MD3Spacing.lg },
});
