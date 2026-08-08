import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, FileText, MessageCircle, MessageSquare, Share2, Printer,
  Trash2, Eye, Download, RotateCcw, Phone, MapPin, Calendar, Wallet,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getSaleById, getPurchaseById, getSettings, deleteSale, deletePurchase,
  SaleHeaderWithDetails, PurchaseHeaderWithDetails, ShopSettings,
} from '@/lib/db/repo';
import {
  shareOnWhatsApp, sendSMS, shareInvoice, generateInvoiceHTML,
  formatRs, formatDate,
} from '@/lib/invoiceUtils';

export default function InvoiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const [sale, setSale] = useState<SaleHeaderWithDetails | null>(null);
  const [purchase, setPurchase] = useState<PurchaseHeaderWithDetails | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!params.id || !params.type) { setLoading(false); return; }
    try {
      const sett = await getSettings();
      setSettings(sett);
      if (params.type === 'sale') {
        const s = await getSaleById(parseInt(params.id));
        setSale(s);
      } else {
        const p = await getPurchaseById(parseInt(params.id));
console.log('PURCHASE DATA:', p);
console.log('BILL PHOTO:', p?.payment_screenshot);
setPurchase(p);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, params.type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isSale = params.type === 'sale';
  const invoice = isSale ? sale : purchase;

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete this ${isSale ? 'sale' : 'purchase'} invoice? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSale && sale) await deleteSale(sale.id);
              if (!isSale && purchase) await deletePurchase(purchase.id);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  const handleWhatsApp = async () => {
    if (isSale && sale && settings) {
      await shareOnWhatsApp(sale, settings, sale.customer_phone);
    }
  };

  const handleSMS = async () => {
    if (isSale && sale && settings) {
      await sendSMS(sale, settings, sale.customer_phone);
    }
  };

  const handleShare = async () => {
    if (isSale && sale && settings) {
      await shareInvoice(sale, settings);
    } else if (!isSale && purchase) {
      const text = `Purchase Invoice ${purchase.invoice_number}\nSupplier: ${purchase.supplier_name}\nDate: ${formatDate(purchase.date)}\nTotal: ${formatRs(purchase.grand_total || purchase.subtotal)}\nPaid: ${formatRs(purchase.amount_paid)}\nDue: ${formatRs(purchase.remaining_balance)}`;
      try { await Share.share({ message: text }); } catch (e) {}
    }
  };

  const handlePrint = () => {
    webViewRef.current?.injectJavaScript('window.print();');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Loading...</Text>
        </View>
        <View style={styles.center}><Text style={styles.loadingText}>Loading invoice...</Text></View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Invoice Not Found</Text>
        </View>
        <View style={styles.center}><Text style={styles.loadingText}>This invoice could not be found.</Text></View>
      </View>
    );
  }

  const invoiceNumber = isSale ? (sale as SaleHeaderWithDetails).invoice_number : (purchase as PurchaseHeaderWithDetails).invoice_number || `PUR-${purchase!.id}`;
  const partyName = isSale ? (sale as SaleHeaderWithDetails).customer_name : (purchase as PurchaseHeaderWithDetails).supplier_name;
  const partyPhone = isSale ? (sale as SaleHeaderWithDetails).customer_phone || '' : '';
  const date = isSale ? (sale as SaleHeaderWithDetails).date : (purchase as PurchaseHeaderWithDetails).date;
  const grandTotal = isSale ? (sale as SaleHeaderWithDetails).grand_total : (purchase as PurchaseHeaderWithDetails).grand_total || (purchase as PurchaseHeaderWithDetails).subtotal;
  const paid = isSale ? (sale as SaleHeaderWithDetails).amount_received : (purchase as PurchaseHeaderWithDetails).amount_paid;
  const due = isSale ? (sale as SaleHeaderWithDetails).balance_due : (purchase as PurchaseHeaderWithDetails).remaining_balance;
  const paymentMethod = isSale ? (sale as SaleHeaderWithDetails).payment_method : (purchase as PurchaseHeaderWithDetails).payment_method;
  const note = isSale ? (sale as SaleHeaderWithDetails).note || '' : (purchase as PurchaseHeaderWithDetails).note || '';
  const items = isSale ? (sale as SaleHeaderWithDetails).items : (purchase as PurchaseHeaderWithDetails).items;
  const discount = isSale ? (sale as SaleHeaderWithDetails).discount : (purchase as PurchaseHeaderWithDetails).discount || 0;
  const extraCharges = isSale ? (sale as SaleHeaderWithDetails).extra_charges || 0 : ((purchase as PurchaseHeaderWithDetails).transport_charges || 0) + ((purchase as PurchaseHeaderWithDetails).other_charges || 0);
  const subtotal = isSale ? (sale as SaleHeaderWithDetails).subtotal : (purchase as PurchaseHeaderWithDetails).subtotal;

  const html = isSale && sale && settings ? generateInvoiceHTML(sale, settings) : '';

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
          <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.toolbarTitleWrap}>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{invoiceNumber}</Text>
          <Text style={styles.toolbarSubtitle}>{isSale ? 'Sale Invoice' : 'Purchase Invoice'}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.toolbarBtn}>
          <Trash2 size={20} color={MD3Colors.error} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Animated.View entering={FadeIn.duration(300)}>
          <LinearGradient
            colors={isSale ? [MD3Colors.primary, '#0D47A1'] : [MD3Colors.secondary, '#37474F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerLabel}>{isSale ? 'Customer' : 'Supplier'}</Text>
                <Text style={styles.headerParty}>{partyName}</Text>
                {partyPhone ? (
                  <View style={styles.headerPhoneRow}>
                    <Phone size={12} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.headerPhone}>{partyPhone}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerAmount}>{formatRs(grandTotal)}</Text>
                <Text style={styles.headerDate}>{formatDate(date)}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Subtotal</Text>
            <Text style={styles.statValue}>{formatRs(subtotal)}</Text>
          </View>
          {discount > 0 ? (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Discount</Text>
              <Text style={[styles.statValue, { color: MD3Colors.error }]}>-{formatRs(discount)}</Text>
            </View>
          ) : null}
          {extraCharges > 0 ? (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Extra</Text>
              <Text style={[styles.statValue, { color: MD3Colors.warning }]}>+{formatRs(extraCharges)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          {items.map((item: any, i: number) => (
            <View key={i} style={[styles.itemRow, i < items.length - 1 && styles.itemRowBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                {item.variant_label ? <Text style={styles.itemVariant}>{item.variant_label}</Text> : null}
                <Text style={styles.itemQty}>{item.quantity} {item.unit} x {formatRs(item.unit_price)}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatRs(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Grand Total</Text>
            <Text style={styles.payValue}>{formatRs(grandTotal)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Paid Amount</Text>
            <Text style={[styles.payValue, { color: MD3Colors.success }]}>{formatRs(paid)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>{isSale ? 'Due Amount' : 'Remaining Balance'}</Text>
            <Text style={[styles.payValue, { color: due > 0 ? MD3Colors.error : MD3Colors.success }]}>
              {formatRs(due)}
            </Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Payment Method</Text>
            <Text style={styles.payValue}>{paymentMethod}</Text>
          </View>
          {note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Note</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}
        </View>
        {!isSale && purchase?.payment_screenshot ? (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Bill Photo</Text>

    <Image
      source={{ uri: purchase.payment_screenshot }}
      style={styles.billPhoto}
      resizeMode="contain"
    />
  </View>
) : null}

        {/* Hidden WebView for PDF/Print support */}
        {isSale && sale && settings ? (
          <View style={styles.hiddenWebview}>
            <WebView
              ref={webViewRef}
              source={{ html }}
              style={{ height: 1, width: 1 }}
              originWhitelist={['*']}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Premium action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push({ pathname: '/invoice', params: { saleId: params.id } })} disabled={!isSale}>
          <View style={[styles.actionIcon, { backgroundColor: MD3Colors.warning, opacity: isSale ? 1 : 0.4 }]}>
            <FileText size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp} disabled={!isSale}>
          <View style={[styles.actionIcon, { backgroundColor: '#25D366', opacity: isSale ? 1 : 0.4 }]}>
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleSMS} disabled={!isSale}>
          <View style={[styles.actionIcon, { backgroundColor: MD3Colors.primary, opacity: isSale ? 1 : 0.4 }]}>
            <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
          <View style={[styles.actionIcon, { backgroundColor: '#3949AB' }]}>
            <Share2 size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handlePrint} disabled={!isSale}>
          <View style={[styles.actionIcon, { backgroundColor: '#0D47A1', opacity: isSale ? 1 : 0.4 }]}>
            <Printer size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push({ pathname: '/invoice', params: { saleId: params.id } })} disabled={!isSale}>
          <View style={[styles.actionIcon, { backgroundColor: MD3Colors.tertiary, opacity: isSale ? 1 : 0.4 }]}>
            <RotateCcw size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionText}>Reprint</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant, ...MD3Elevation.level1 },
  toolbarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  toolbarTitleWrap: { flex: 1, marginLeft: MD3Spacing.sm },
  toolbarTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  toolbarSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Roboto-Regular', fontSize: 15, color: MD3Colors.onSurfaceVariant },
  headerCard: { margin: MD3Spacing.md, borderRadius: MD3Radius.xl, padding: MD3Spacing.lg, ...MD3Elevation.level3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { fontFamily: 'Roboto-Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  headerParty: { fontFamily: 'Roboto-Bold', fontSize: 20, color: '#FFFFFF', marginBottom: 4 },
  headerPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerPhone: { fontFamily: 'Roboto-Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  headerRight: { alignItems: 'flex-end' },
  headerAmount: { fontFamily: 'Roboto-Bold', fontSize: 24, color: '#FFFFFF', marginBottom: 4 },
  headerDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.md, gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  statBox: { flex: 1, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.sm, ...MD3Elevation.level1 },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  sectionCard: { marginHorizontal: MD3Spacing.md, backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level2 },
  billPhoto: {
  width: '100%',
  height: 300,
  borderRadius: MD3Radius.md,
  backgroundColor: MD3Colors.surfaceVariant,
},
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: MD3Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MD3Spacing.sm },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  itemVariant: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  itemQty: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.outline },
  itemTotal: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  payLabel: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  payValue: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  noteBox: { marginTop: MD3Spacing.sm, padding: MD3Spacing.sm, backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm },
  noteLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  noteText: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurface },
  hiddenWebview: { position: 'absolute', width: 1, height: 1, opacity: 0, top: -1000 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: MD3Colors.surface, paddingVertical: MD3Spacing.sm + 2, paddingHorizontal: MD3Spacing.xs, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant, ...MD3Elevation.level3 },
  actionItem: { alignItems: 'center', gap: 3, flex: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level2 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 10, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
});
