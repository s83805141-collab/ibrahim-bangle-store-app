import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenHeader, Button } from '@/components/ui';
import {
  addQuickBill,
  getAllProducts,
  getQuickBillById,
  getQuickBills,
} from '@/lib/db/repo';
import type { QuickBillItem } from '@/lib/db/repo';
import { MD3Colors, MD3Radius, MD3Spacing } from '@/lib/theme';

type Line = QuickBillItem & { key: string };

const emptyLine = (): Line => ({
  key: `line-${Date.now()}-${Math.random()}`,
  product_id: null,
  product_name: '',
  quantity: 1,
  unit_price: 0,
  line_total: 0,
});

export default function QuickBillScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
    loadHistory();
  }, []);

  async function loadProducts() {
    try {
      setProducts(await getAllProducts());
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    }
  }

  async function loadHistory() {
    try {
      setHistory(await getQuickBills(25));
    } catch (e: any) {
      Alert.alert('History Error', String(e?.message || e));
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.design_number || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const grandTotal = useMemo(
    () => lines.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    [lines]
  );

  function getPrice(product: any) {
    return Number(
      product.sale_price ??
      product.selling_price ??
      product.price ??
      product.cost_price ??
      0
    );
  }

  function selectProduct(product: any) {
    const price = getPrice(product);

    setLines((current) => {
      const existing = current.findIndex(
        (item) => item.product_id === product.id
      );

      if (existing >= 0) {
        const next = [...current];
        const item = next[existing];
        const quantity = Number(item.quantity || 0) + 1;

        next[existing] = {
          ...item,
          quantity,
          unit_price: price,
          line_total: quantity * price,
        };

        return next;
      }

      const blankIndex = current.findIndex(
        (item) => !item.product_id && !item.product_name
      );

      const newItem: Line = {
        key: `line-${Date.now()}-${product.id}`,
        product_id: product.id,
        product_name: String(product.name || 'Item'),
        quantity: 1,
        unit_price: price,
        line_total: price,
      };

      if (blankIndex >= 0) {
        const next = [...current];
        next[blankIndex] = newItem;
        return next;
      }

      return [...current, newItem];
    });

    setSearch('');
    setPickerVisible(false);
  }

  function updateLine(
    key: string,
    field: 'quantity' | 'unit_price',
    text: string
  ) {
    const value = Number(text.replace(/[^0-9.]/g, '')) || 0;

    setLines((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        const quantity =
          field === 'quantity' ? value : Number(item.quantity || 0);
        const price =
          field === 'unit_price' ? value : Number(item.unit_price || 0);

        return {
          ...item,
          [field]: value,
          line_total: quantity * price,
        };
      })
    );
  }

  function changeQty(key: string, amount: number) {
    setLines((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        const quantity = Math.max(
          0,
          Number(item.quantity || 0) + amount
        );

        return {
          ...item,
          quantity,
          line_total: quantity * Number(item.unit_price || 0),
        };
      })
    );
  }

  function removeLine(key: string) {
    setLines((current) => {
      const next = current.filter((item) => item.key !== key);
      return next.length ? next : [emptyLine()];
    });
  }

  async function saveBill() {
    const items: QuickBillItem[] = lines
      .filter(
        (item) =>
          item.product_name.trim() &&
          Number(item.line_total || 0) > 0
      )
      .map((item) => ({
        product_id: item.product_id ?? null,
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0),
      }));

    if (!items.length) {
      Alert.alert(
        'Quick Bill',
        'Please add at least one product with price.'
      );
      return;
    }

    setSaving(true);

    try {
      const result = await addQuickBill(
        {
          total_amount: grandTotal,
          item_count: items.length,
        },
        items
      );

      Alert.alert(
        'Bill Saved',
        `${result.bill_number}\nTotal: Rs ${grandTotal.toLocaleString('en-IN')}`
      );

      setLines([emptyLine()]);
      await loadHistory();
    } catch (e: any) {
      Alert.alert('Save Failed', String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(id: number) {
    try {
      const result = await getQuickBillById(id);

      if (result) {
        setDetail(result);
        setDetailVisible(true);
      }
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Calculator / Quick Bill" />

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.total}>
          Rs {grandTotal.toLocaleString('en-IN')}
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
      >
        {lines.map((item, index) => (
          <View key={item.key} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.productName}>
                {item.product_name || `Product ${index + 1}`}
              </Text>

              <Pressable onPress={() => removeLine(item.key)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>

            <View style={styles.controls}>
              <View>
                <Text style={styles.label}>Qty</Text>

                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => changeQty(item.key, -1)}
                  >
                    <Text style={styles.qtyText}>−</Text>
                  </Pressable>

                  <TextInput
                    style={styles.qtyInput}
                    value={String(item.quantity)}
                    keyboardType="decimal-pad"
                    onChangeText={(text) =>
                      updateLine(item.key, 'quantity', text)
                    }
                  />

                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => changeQty(item.key, 1)}
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.priceBox}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(item.unit_price)}
                  keyboardType="decimal-pad"
                  onChangeText={(text) =>
                    updateLine(item.key, 'unit_price', text)
                  }
                />
              </View>

              <View style={styles.lineAmount}>
                <Text style={styles.label}>Total</Text>
                <Text style={styles.lineTotal}>
                  Rs {Number(item.line_total || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <Button
          title="+ Add Product"
          onPress={() => setPickerVisible(true)}
        />

        <View style={styles.space} />

        <Button
          title={saving ? 'Saving...' : 'Save Quick Bill'}
          disabled={saving}
          onPress={saveBill}
        />

        <View style={styles.spaceSmall} />

        <Button
          title="Bill History"
          onPress={() => setHistoryVisible(true)}
        />
      </ScrollView>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>Select Product</Text>

            <Pressable onPress={() => setPickerVisible(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search product or design"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <Text style={styles.empty}>No products found</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.productRow}
                onPress={() => selectProduct(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.productRowName}>
                    {String(item.name || 'Unnamed')}
                  </Text>

                  {!!item.design_number && (
                    <Text style={styles.subText}>
                      Design: {item.design_number}
                    </Text>
                  )}
                </View>

                <Text style={styles.productPrice}>
                  Rs {getPrice(item).toLocaleString('en-IN')}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={historyVisible}
        animationType="slide"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>Bill History</Text>

            <Pressable onPress={() => setHistoryVisible(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={history}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <Text style={styles.empty}>No saved bills yet</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.historyRow}
                onPress={() => openDetail(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyBill}>
                    {item.bill_number}
                  </Text>
                  <Text style={styles.subText}>
                    {new Date(item.created_at).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text>{item.item_count} items</Text>
                  <Text style={styles.historyAmount}>
                    Rs {Number(item.total_amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={detailVisible}
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>
              {detail?.header?.bill_number || 'Bill Details'}
            </Text>

            <Pressable onPress={() => setDetailVisible(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView>
            {detail?.items?.map((item: any) => (
              <View style={styles.detailRow} key={String(item.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productRowName}>
                    {item.product_name}
                  </Text>

                  <Text style={styles.subText}>
                    {item.quantity} × Rs{' '}
                    {Number(item.unit_price || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <Text style={styles.productPrice}>
                  Rs {Number(item.line_total || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}

            <View style={styles.detailTotal}>
              <Text style={styles.detailLabel}>TOTAL</Text>
              <Text style={styles.detailValue}>
                Rs{' '}
                {Number(detail?.header?.total_amount || 0).toLocaleString(
                  'en-IN'
                )}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MD3Colors.background,
  },
  totalCard: {
    margin: MD3Spacing.md,
    padding: MD3Spacing.lg,
    borderRadius: MD3Radius.lg,
    backgroundColor: MD3Colors.primaryContainer,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MD3Colors.onPrimaryContainer,
  },
  total: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
    color: MD3Colors.onPrimaryContainer,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: MD3Spacing.md,
    paddingBottom: 40,
  },
  card: {
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.sm,
    borderRadius: MD3Radius.md,
    backgroundColor: MD3Colors.surface,
    borderWidth: 1,
    borderColor: MD3Colors.outlineVariant,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: MD3Colors.onSurface,
  },
  delete: {
    color: MD3Colors.error,
    fontWeight: '700',
    paddingLeft: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: MD3Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MD3Colors.outlineVariant,
  },
  qtyText: {
    fontSize: 22,
    fontWeight: '700',
  },
  qtyInput: {
    width: 48,
    height: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: MD3Colors.outlineVariant,
  },
  priceBox: {
    marginLeft: 8,
  },
  priceInput: {
    width: 90,
    height: 40,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: MD3Colors.outlineVariant,
    borderRadius: 6,
  },
  lineAmount: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: MD3Colors.primary,
  },
  space: {
    height: 10,
  },
  spaceSmall: {
    height: 6,
  },
  modal: {
    flex: 1,
    padding: MD3Spacing.md,
    backgroundColor: MD3Colors.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MD3Colors.onSurface,
  },
  close: {
    color: MD3Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: MD3Colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: MD3Colors.surface,
    marginVertical: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3Colors.outlineVariant,
  },
  productRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: MD3Colors.onSurface,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: MD3Colors.primary,
  },
  subText: {
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 3,
  },
  empty: {
    textAlign: 'center',
    padding: 30,
    color: MD3Colors.onSurfaceVariant,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3Colors.outlineVariant,
  },
  historyBill: {
    fontSize: 15,
    fontWeight: '800',
    color: MD3Colors.onSurface,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: MD3Colors.primary,
    marginTop: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3Colors.outlineVariant,
  },
  detailTotal: {
    marginTop: 16,
    padding: 16,
    borderRadius: MD3Radius.md,
    backgroundColor: MD3Colors.primaryContainer,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: '800',
    color: MD3Colors.onPrimaryContainer,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '900',
    color: MD3Colors.onPrimaryContainer,
  },
});
