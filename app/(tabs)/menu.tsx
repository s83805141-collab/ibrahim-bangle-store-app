import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Tag, Users, Truck, ShoppingCart, Wallet, FileText, Boxes,
  BarChart3, DatabaseBackup, Settings, ClipboardList, BookOpen, Landmark,
} from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui';

const MENU_ITEMS = [
  { title: 'Categories', subtitle: 'Manage bangle categories', icon: Tag, color: MD3Colors.tertiary, bg: MD3Colors.tertiaryContainer, route: '/categories' },
  { title: 'Suppliers', subtitle: 'Manage suppliers', icon: Truck, color: MD3Colors.secondary, bg: MD3Colors.secondaryContainer, route: '/suppliers' },
  { title: 'Customers', subtitle: 'Manage customers', icon: Users, color: MD3Colors.error, bg: MD3Colors.errorContainer, route: '/customers' },
  { title: 'Purchase Management', subtitle: 'Record stock purchases', icon: ClipboardList, color: MD3Colors.accent, bg: '#B2DFDB', route: '/purchases' },
  { title: 'Supplier Ledger', subtitle: 'Supplier payments & dues', icon: BookOpen, color: MD3Colors.secondary, bg: MD3Colors.secondaryContainer, route: '/supplier-ledger' },
  { title: 'Bank Accounts', subtitle: 'Manage bank & UPI accounts', icon: Landmark, color: MD3Colors.primary, bg: MD3Colors.primaryContainer, route: '/bank-accounts' },
  { title: 'Customer Ledger', subtitle: 'Customer payments & dues', icon: BookOpen, color: MD3Colors.error, bg: MD3Colors.errorContainer, route: '/customer-ledger' },
  { title: 'Stock Management', subtitle: 'View & adjust inventory', icon: Boxes, color: MD3Colors.accent, bg: '#B2DFDB', route: '/stock' },
  { title: 'Reports', subtitle: 'Sales & stock reports', icon: BarChart3, color: MD3Colors.primary, bg: MD3Colors.primaryContainer, route: '/reports' },
  { title: 'PDF Invoice', subtitle: 'Generate invoices', icon: FileText, color: MD3Colors.tertiary, bg: MD3Colors.tertiaryContainer, route: '/invoice' },
  { title: 'Backup & Restore', subtitle: 'Export & import data', icon: DatabaseBackup, color: MD3Colors.success, bg: MD3Colors.successContainer, route: '/backup' },
  { title: 'Settings', subtitle: 'App preferences', icon: Settings, color: MD3Colors.onSurfaceVariant, bg: MD3Colors.surfaceVariant, route: '/settings' },
];

export default function MenuScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}>
      <ScreenHeader title="More" subtitle="All sections" />
      <View style={styles.grid}>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.title}
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Icon size={24} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  grid: { gap: MD3Spacing.sm },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, ...MD3Elevation.level1 },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  menuInfo: { flex: 1 },
  menuTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  menuSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant },
});
