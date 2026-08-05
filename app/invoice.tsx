import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Share2, ArrowLeft, Printer, MessageCircle, MessageSquare, Download } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getSaleById, getSettings, SaleHeaderWithDetails, ShopSettings } from '@/lib/db/repo';
import { ScreenHeader, EmptyState } from '@/components/ui';
import { WebView } from 'react-native-webview';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { generateInvoiceHTML, shareOnWhatsApp, sendSMS, shareInvoice } from '@/lib/invoiceUtils';

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const [sale, setSale] = useState<SaleHeaderWithDetails | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!params.saleId) { setLoading(false); return; }
    try {
      const [s, sett] = await Promise.all([getSaleById(parseInt(params.saleId)), getSettings()]);
      setSale(s);
      setSettings(sett);
    } finally {
      setLoading(false);
    }
  }, [params.saleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');

  const handlePrint = () => {
    webViewRef.current?.injectJavaScript('window.print();');
  };

  const handleShare = async () => {
    if (sale && settings) await shareInvoice(sale, settings);
  };

  const handleWhatsApp = async () => {
    if (sale && settings) await shareOnWhatsApp(sale, settings, sale.customer_phone);
  };

  const handleSMS = async () => {
    if (sale && settings) await sendSMS(sale, settings, sale.customer_phone);
  };

  if (!params.saleId || (!loading && !sale)) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="PDF Invoice" subtitle="Generate invoices" />
        <EmptyState
          icon={<FileText size={48} color={MD3Colors.outline} />}
          title="No sale selected"
          subtitle="Go to Sales and tap the Invoice button on a sale to generate a PDF invoice"
        />
      </View>
    );
  }

  if (loading || !sale || !settings) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="PDF Invoice" subtitle="Loading..." />
        <View style={styles.loadingWrap}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
            <Text style={styles.loadingText}>Generating invoice...</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBackBtn}>
          <ArrowLeft size={22} color={MD3Colors.onSurface} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Invoice {sale.invoice_number}</Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={handlePrint} style={styles.toolbarActionBtn}>
            <Printer size={20} color={MD3Colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.toolbarActionBtn}>
            <Share2 size={20} color={MD3Colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View entering={FadeIn.duration(300)} style={styles.webviewWrap}>
        <WebView
          ref={webViewRef}
          source={{ html: generateInvoiceHTML(sale, settings) }}
          style={styles.webview}
          originWhitelist={['*']}
        />
      </Animated.View>

      {/* Premium action bar with WhatsApp/SMS/Share/Print */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBarItem} onPress={handleWhatsApp}>
          <View style={[styles.actionBarIcon, { backgroundColor: '#25D366' }]}>
            <MessageCircle size={22} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionBarText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBarItem} onPress={handleSMS}>
          <View style={[styles.actionBarIcon, { backgroundColor: MD3Colors.primary }]}>
            <MessageSquare size={22} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionBarText}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBarItem} onPress={handleShare}>
          <View style={[styles.actionBarIcon, { backgroundColor: MD3Colors.secondary }]}>
            <Share2 size={22} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionBarText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBarItem} onPress={handlePrint}>
          <View style={[styles.actionBarIcon, { backgroundColor: '#0D47A1' }]}>
            <Printer size={22} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={styles.actionBarText}>Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: MD3Spacing.sm,
    backgroundColor: MD3Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: MD3Colors.outlineVariant,
    ...MD3Elevation.level1,
  },
  toolbarBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MD3Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarTitle: {
    flex: 1,
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: MD3Colors.onSurface,
    marginLeft: MD3Spacing.sm,
  },
  toolbarActions: { flexDirection: 'row', gap: MD3Spacing.xs },
  toolbarActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewWrap: {
    flex: 1,
    margin: MD3Spacing.sm,
    borderRadius: MD3Radius.lg,
    overflow: 'hidden',
    ...MD3Elevation.level2,
  },
  webview: { flex: 1, backgroundColor: '#f5f5f5' },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: MD3Colors.surface,
    paddingVertical: MD3Spacing.sm + 4,
    paddingHorizontal: MD3Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: MD3Colors.outlineVariant,
    ...MD3Elevation.level3,
  },
  actionBarItem: { alignItems: 'center', gap: 4 },
  actionBarIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...MD3Elevation.level2,
  },
  actionBarText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: MD3Spacing.lg },
  loadingCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.xl,
    ...MD3Elevation.level2,
  },
  loadingText: { fontFamily: 'Roboto-Regular', fontSize: 15, color: MD3Colors.onSurfaceVariant },
});
