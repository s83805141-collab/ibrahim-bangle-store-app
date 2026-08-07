import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Wallet,
  Users,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Eye,
  EyeOff,
  UserRound,
  Lock,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getDashboardStats } from '@/lib/db/repo';
import { ScreenHeader, Button } from '@/components/ui';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAmounts, setShowAmounts] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const APP_PIN = '1234';

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
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <ScreenHeader title="Ibrahim Bangle Store" subtitle="Wholesale & Retail Inventory" />

        <View style={styles.visibilityRow}>
          <Pressable
            style={styles.visibilityBtn}
            onPress={() => {
              if (showAmounts) {
                setShowAmounts(false);
              } else {
                setPin('');
                setPinError('');
                setShowPinModal(true);
              }
            }}
          >
            {showAmounts ? <Eye size={22} color={MD3Colors.primary} /> : <EyeOff size={22} color={MD3Colors.onSurfaceVariant} />}
            <Text style={styles.visibilityText}>{showAmounts ? 'Hide' : 'Show'} Amounts</Text>
          </Pressable>
        </View>

        {/* Welcome hero card */}
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={[MD3Colors.primary, '#0D47A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeTextWrap}>
              <Text style={styles.welcomeTitle}>Assalamu Alaikum!</Text>
              <Text style={styles.welcomeSubtitle}>Here's your store overview</Text>
            </View>
            <View style={styles.welcomeIconWrap}>
              <TrendingUp size={32} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.statsGrid}>
          <StatCard delay={0} icon={<Package size={24} color={MD3Colors.primary} strokeWidth={2.2} />} label="Total Products" value={stats?.productCount ?? 0} color={MD3Colors.primaryContainer} onPress={() => router.push('/(tabs)/products')} />
          <StatCard delay={60} icon={<Boxes size={24} color={MD3Colors.accent} strokeWidth={2.2} />} label="Total Stock Qty" value={stats?.totalStock ?? 0} color={MD3Colors.accentContainer} onPress={() => router.push('/stock')} />
          <StatCard delay={120} icon={<Truck size={24} color={MD3Colors.secondary} strokeWidth={2.2} />} label="Today's Purchase" value={showAmounts ? formatCurrency(stats?.todayPurchase ?? 0) : "Rs ****"} color={MD3Colors.secondaryContainer} small onPress={() => router.push('/purchases')} />
          <StatCard delay={180} icon={<ShoppingCart size={24} color={MD3Colors.primary} strokeWidth={2.2} />} label="Today's Sales" value={showAmounts ? formatCurrency(stats?.todaySales ?? 0) : "Rs ****"} color={MD3Colors.primaryContainer} small onPress={() => router.push('/(tabs)/sales')} />
          <StatCard delay={240} icon={<AlertTriangle size={24} color={MD3Colors.warning} strokeWidth={2.2} />} label="Low Stock Items" value={stats?.lowStockCount ?? 0} color={MD3Colors.warningContainer} onPress={() => router.push('/stock')} />
          <StatCard delay={300} icon={<Wallet size={24} color={MD3Colors.error} strokeWidth={2.2} />} label="Pending Supplier" value={showAmounts ? formatCurrency(stats?.pendingSupplierBalance ?? 0) : "Rs ****"} color={MD3Colors.errorContainer} small onPress={() => router.push('/supplier-ledger')} />
          <StatCard delay={360} icon={<Users size={24} color={MD3Colors.tertiary} strokeWidth={2.2} />} label="Pending Customer" value={showAmounts ? formatCurrency(stats?.pendingCustomerBalance ?? 0) : "Rs ****"} color={MD3Colors.tertiaryContainer} small onPress={() => router.push('/customer-ledger')} />
          <StatCard delay={420} icon={<Receipt size={24} color={MD3Colors.success} strokeWidth={2.2} />} label="New Sale" value="Sell" color={MD3Colors.successContainer} onPress={() => router.push('/(tabs)/sales')} />
          <StatCard delay={480} icon={<UserRound size={24} color={MD3Colors.primary} strokeWidth={2.2} />} label="Daily Customer" value="Open" color={MD3Colors.primaryContainer} onPress={() => router.push('/daily-customers')} />
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Animated.View entering={FadeInDown.duration(300).delay(500)}>
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
                      <Icon size={18} color={color} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
                      <Text style={styles.txTime}>{formatTime(tx.date)}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color }]}>
                      {showAmounts
                        ? `${isPurchase ? '-' : '+'}${formatCurrency(tx.amount)}`
                        : "Rs ****"}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <View style={styles.pinIconWrap}>
              <Lock size={28} color={MD3Colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.pinTitle}>Enter PIN</Text>
            <Text style={styles.pinSubtitle}>Enter 4-digit PIN to view amounts</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="• • • •"
              placeholderTextColor={MD3Colors.outline}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.pinInput}
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <View style={styles.pinActions}>
              <Button title="Cancel" intent="cancel" variant="outlined" onPress={() => { setShowPinModal(false); setPin(''); setPinError(''); }} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Button title="OK" intent="primary" onPress={() => {
                if (pin === APP_PIN) {
                  setShowAmounts(true);
                  setShowPinModal(false);
                  setPin('');
                  setPinError('');
                } else {
                  setPinError('Wrong PIN');
                }
              }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatCard({ icon, label, value, color, small, onPress, delay }: { icon: React.ReactNode; label: string; value: any; color: string; small?: boolean; onPress?: () => void; delay?: number }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.statCardOuter}>
      <Animated.View entering={FadeInDown.duration(300).delay(delay || 0)} style={styles.statCard}>
        <View style={[styles.statIconWrap, { backgroundColor: color }]}>{icon}</View>
        <Text style={styles.statValue} numberOfLines={small ? 2 : 1} adjustsFontSizeToFit={small} minimumFontScale={0.65}>{small ? value : String(value)}</Text>
        <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  content: { padding: MD3Spacing.lg, paddingBottom: MD3Spacing.xxl },
  visibilityRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: MD3Spacing.sm },
  visibilityBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, backgroundColor: MD3Colors.surface, ...MD3Elevation.level1 },
  visibilityText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: MD3Radius.xl,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.lg,
    ...MD3Elevation.level3,
  },
  welcomeTextWrap: { flex: 1 },
  welcomeTitle: { fontFamily: 'Roboto-Bold', fontSize: 24, color: '#FFFFFF', marginBottom: 4 },
  welcomeSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  welcomeIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCardOuter: { width: '48.5%', marginBottom: MD3Spacing.sm },
  statCard: {
    flex: 1,
    minHeight: 140,
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.sm + 2,
    justifyContent: 'space-between',
    ...MD3Elevation.level2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: MD3Spacing.xs },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: 2, flexShrink: 1, flex: 1 },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, lineHeight: 14, flexShrink: 1 },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface, marginTop: MD3Spacing.md, marginBottom: MD3Spacing.sm },
  transactionsCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, ...MD3Elevation.level2 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: MD3Spacing.sm + 2 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  txLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2, fontWeight: '600' },
  txTime: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  txAmount: { fontFamily: 'Roboto-Bold', fontSize: 15, fontWeight: '700' },
  emptyText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: MD3Spacing.lg },
  pinOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  pinCard: { width: '85%', backgroundColor: '#fff', borderRadius: MD3Radius.xl, padding: MD3Spacing.lg, ...MD3Elevation.level5 },
  pinIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: MD3Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: MD3Spacing.md },
  pinTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface, textAlign: 'center', marginBottom: 4 },
  pinSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, textAlign: 'center', marginBottom: MD3Spacing.lg },
  pinInput: { borderWidth: 2, borderColor: MD3Colors.primary, borderRadius: MD3Radius.md, padding: MD3Spacing.md, fontSize: 20, fontFamily: 'Roboto-Bold', color: MD3Colors.onSurface, textAlign: 'center', letterSpacing: 8, backgroundColor: MD3Colors.primaryContainer },
  pinError: { color: MD3Colors.error, marginTop: MD3Spacing.sm, fontFamily: 'Roboto-Medium', fontSize: 13, textAlign: 'center' },
  pinActions: { flexDirection: 'row', marginTop: MD3Spacing.lg },
});
