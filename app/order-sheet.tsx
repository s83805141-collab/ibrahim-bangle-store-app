import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Printer, Share2 } from 'lucide-react-native';
import { getOrderById, OrderWithItems } from '../lib/db/repo';

const formatDate = (value: number) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export default function OrderSheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID nahi mila.');
      router.back();
      return;
    }

    try {
      const data = await getOrderById(orderId);

      if (!data) {
        Alert.alert('Error', 'Order nahi mila.');
        router.back();
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Order load nahi ho saka.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading Order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} />
        </Pressable>

        <Text style={styles.topTitle}>Order Sheet</Text>

        <View style={styles.topActions}>
          <Pressable style={styles.actionButton}>
            <Share2 size={18} />
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Printer size={18} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheet}>
          <Text style={styles.storeName}>IBRAHIM BANGLE STORE</Text>
          <Text style={styles.sheetTitle}>ORDER SHEET</Text>

          <View style={styles.line} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ORDER NO.</Text>
              <Text style={styles.infoValue}>{order.header.order_number}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoValue}>
                {formatDate(order.header.order_date)}
              </Text>
            </View>
          </View>

          <View style={styles.partyBox}>
            <Text style={styles.infoLabel}>PARTY NAME</Text>
            <Text style={styles.partyName}>
              {order.header.party_name}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>PRODUCT DETAILS</Text>

          {order.items.map((item, itemIndex) => (
            <View style={styles.productSection} key={item.id ?? itemIndex}>
              <View style={styles.productHeader}>
                <Text style={styles.productNumber}>
                  {itemIndex + 1}
                </Text>
                <Text style={styles.productName}>
                  {item.product_name}
                </Text>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.colourCell]}>COLOUR</Text>
                <Text style={[styles.cell, styles.smallCell]}>G</Text>
                <Text style={[styles.cell, styles.smallCell]}>B/G</Text>
                <Text style={[styles.cell, styles.qtyCell]}>2</Text>
                <Text style={[styles.cell, styles.qtyCell]}>22</Text>
                <Text style={[styles.cell, styles.qtyCell]}>24</Text>
                <Text style={[styles.cell, styles.qtyCell]}>26</Text>
                <Text style={[styles.cell, styles.qtyCell]}>28</Text>
              </View>

              {item.colours.map((colour, colourIndex) => (
                <View style={styles.tableRow} key={colour.id ?? colourIndex}>
                  <Text style={[styles.cell, styles.colourCell]}>
                    {colour.colour_name || '-'}
                  </Text>

                  <Text style={[styles.cell, styles.smallCell]}>
                    {colour.gaddi || 0}
                  </Text>

                  <Text style={[styles.cell, styles.smallCell]}>
                    {colour.boxes_per_gaddi || 0}
                  </Text>

                  <Text style={[styles.cell, styles.qtyCell]}>
                    {colour.qty_2 || 0}
                  </Text>

                  <Text style={[styles.cell, styles.qtyCell]}>
                    {colour.qty_22 || 0}
                  </Text>

                  <Text style={[styles.cell, styles.qtyCell]}>
                    {colour.qty_24 || 0}
                  </Text>

                  <Text style={[styles.cell, styles.qtyCell]}>
                    {colour.qty_26 || 0}
                  </Text>

                  <Text style={[styles.cell, styles.qtyCell]}>
                    {colour.qty_28 || 0}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {order.header.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.infoLabel}>NOTE</Text>
              <Text style={styles.noteText}>{order.header.note}</Text>
            </View>
          ) : null}

          <View style={styles.bottomLine} />

          <Text style={styles.thankYou}>THANK YOU</Text>
          <Text style={styles.storeFooter}>IBRAHIM BANGLE STORE</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontWeight: '600',
  },
  topBar: {
    height: 58,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  topActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    padding: 12,
    paddingBottom: 30,
  },
  sheet: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 4,
    minHeight: 700,
  },
  storeName: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sheetTitle: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  line: {
    height: 1,
    backgroundColor: '#222222',
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 9,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#777777',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  partyBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 10,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '900',
  },
  productSection: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f4f4f4',
  },
  productNumber: {
    width: 24,
    fontWeight: '900',
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cccccc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eeeeee',
    minHeight: 32,
    alignItems: 'center',
  },
  cell: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  colourCell: {
    flex: 2,
    textAlign: 'left',
    paddingLeft: 6,
  },
  smallCell: {
    width: 42,
  },
  qtyCell: {
    width: 31,
  },
  noteBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 10,
    minHeight: 55,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomLine: {
    height: 1,
    backgroundColor: '#222222',
    marginTop: 22,
  },
  thankYou: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1,
  },
  storeFooter: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
  },
});
