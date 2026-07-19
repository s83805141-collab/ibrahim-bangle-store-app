import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, TextInput, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Trash2, ShoppingCart, X, Search, AlertTriangle, FileText, ChevronDown, ChevronUp, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllSales, getAllCustomersFull, getAllProducts, addSale, deleteSale, generateInvoiceNumber,
  UNITS, PAYMENT_METHODS,
  CustomerWithStats, ProductWithDetails, SaleHeaderWithDetails, SaleItemInput, SaleHeader,
} from '@/lib/db/repo';
import type { Unit, PaymentMethod } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

const LOW_STOCK_THRESHOLD = 5;

export default function SalesScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailSale, setDetailSale] = useState<SaleHeaderWithDetails | null>(null);

  const load = useCallback(async () => {
    try {
      setSales(await getAllSales());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (s: SaleHeaderWithDetails) => {
    Alert.alert('Delete Sale', `Delete sale "${s.invoice_number}"? Stock will be restored.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSale(s.id); load(); } },
    ]);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Sales & Billing" subtitle={`${sales.length} sales`} />
      <FlatList
        data={sales}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<ShoppingCart size={48} color={MD3Colors.outline} />} title="No sales yet" subtitle="Tap + to create a new sale" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => setDetailSale(item)}>
              <View style={styles.cardIconWrap}><ShoppingCart size={20} color={MD3Colors.primary} /></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.invoice_number}</Text>
                <Text style={styles.cardMeta}>{item.customer_name} · {formatDate(item.date)}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.items.length} items</Text></View>
                  <View style={[styles.badge, { backgroundColor: MD3Colors.primaryContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.primary }]}>{item.payment_method}</Text></View>
                  {item.balance_due > 0 ? (
                    <View style={[styles.badge, { backgroundColor: MD3Colors.errorContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.error }]}>Due {formatRs(item.balance_due)}</Text></View>
                  ) : <View style={[styles.badge, { backgroundColor: MD3Colors.successContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.success }]}>Paid</Text></View>}
                </View>
              </View>
              <Text style={styles.cardAmount}>{formatRs(item.grand_total)}</Text>
            </TouchableOpacity>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/invoice', params: { saleId: String(item.id) } })}>
                <FileText size={16} color={MD3Colors.primary} /><Text style={[styles.actionText, { color: MD3Colors.primary }]}>Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setDetailSale(item)}>
                <Text style={styles.actionText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Trash2 size={16} color={MD3Colors.error} /><Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={28} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <SaleFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={() => { setModalVisible(false); load(); }} />
      <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} formatRs={formatRs} formatDate={formatDate} />
    </View>
  );
}

// ============================================================
// SALE FORM MODAL
// ============================================================
function SaleFormModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isWalkin, setIsWalkin] = useState(true);
  const [walkinName, setWalkinName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [note, setNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().slice(0, 5));
  const [upiId, setUpiId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);

  interface LineItem { productId: number | null; variantId: number | null; productName: string; quantity: string; unit: Unit; unitPrice: string; }

  useEffect(() => {
    if (visible) {
      loadOptions();
      generateInvoiceNumber().then(setInvoiceNumber);
      setDate(new Date().toISOString().split('T')[0]);
      setCustomerId(null); setIsWalkin(true); setWalkinName(''); setSearchQuery('');
      setLineItems([]); setDiscount(''); setDiscountPercent(''); setExtraCharges(''); setAmountReceived(''); setPaymentMethod('Cash');
      setTransactionNumber(''); setNote(''); setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentTime(new Date().toTimeString().slice(0, 5)); setUpiId(''); setReferenceNumber('');
      setPaymentScreenshot(''); setError(''); setShowProductPicker(null);
    }
  }, [visible]);

  const loadOptions = async () => {
    const [custs, prods] = await Promise.all([getAllCustomersFull(), getAllProducts()]);
    setCustomers(custs); setProducts(prods);
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q);
  });

  const updateLineItem = (i: number, field: keyof LineItem, val: any) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: val } : li));
  };
  const addLineItem = () => setLineItems(prev => [...prev, { productId: null, variantId: null, productName: '', quantity: '', unit: 'Piece' as Unit, unitPrice: '' }]);
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const lineTotal = (li: LineItem) => (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0);
  const subtotal = lineItems.reduce((s, li) => s + lineTotal(li), 0);
  const discountPercentVal = parseFloat(discountPercent) || 0;
  const discountFromPercent = (subtotal * discountPercentVal) / 100;
  const discountAmount = discountFromPercent > 0 ? discountFromPercent : (parseFloat(discount) || 0);
  const extraChargesAmount = parseFloat(extraCharges) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + extraChargesAmount);
  const received = parseFloat(amountReceived) || 0;
  const balanceDue = Math.max(0, grandTotal - received);

  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Permission required to access photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.uri) setPaymentScreenshot(result.assets[0].uri);
  };

  const getStockForLineItem = (li: LineItem): number | null => {
    if (!li.productId) return null;
    const product = products.find(p => p.id === li.productId);
    if (!product) return null;
    if (li.variantId) {
      const v = product.variants?.find((vv: any) => vv.id === li.variantId);
      return v ? v.quantity : null;
    }
    return product.total_stock ?? null;
  };

  const handleSave = async () => {
    const validItems = lineItems.filter(li => li.productId && parseFloat(li.quantity) > 0);
    if (validItems.length === 0) { setError('Add at least one product with quantity'); return; }
    if (!isWalkin && !customerId) { setError('Select a customer or use walk-in'); return; }
    if (isWalkin && !walkinName.trim() && !customerId) { setError('Enter walk-in customer name'); return; }

    for (const li of validItems) {
      const stock = getStockForLineItem(li);
      if (stock !== null && stock < parseInt(li.quantity)) {
        setError(`Insufficient stock for ${li.productName}. Available: ${stock}`);
        return;
      }
    }

    setSaving(true);
    try {
      const dateTs = new Date(date).getTime();
      const customerName = isWalkin ? (walkinName.trim() || 'Walk-in Customer') : (customers.find(c => c.id === customerId)?.name || 'Customer');
      const items: SaleItemInput[] = validItems.map(li => ({
        product_id: li.productId!,
        variant_id: li.variantId,
        product_name: li.productName,
        quantity: parseInt(li.quantity),
        unit: li.unit,
        unit_price: parseFloat(li.unitPrice) || 0,
        total: lineTotal(li),
      }));
      const paymentTs = new Date(`${paymentDate}T${paymentTime || '00:00'}`).getTime() || dateTs;
      const header: SaleHeader = {
        invoice_number: invoiceNumber,
        customer_id: isWalkin ? null : customerId,
        customer_name: customerName,
        is_walkin: isWalkin,
        date: dateTs,
        subtotal,
        discount: discountAmount,
        discount_percent: discountPercentVal,
        extra_charges: extraChargesAmount,
        grand_total: grandTotal,
        amount_received: received,
        balance_due: balanceDue,
        payment_method: paymentMethod,
        transaction_number: transactionNumber.trim(),
        note: note.trim(),
        payment_date: paymentTs,
        payment_time: paymentTime,
        upi_id: upiId.trim(),
        bank_account_id: null,
        reference_number: referenceNumber.trim(),
        payment_screenshot: paymentScreenshot,
      };
      await addSale(header, items);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Sale</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Invoice info */}
            <View style={styles.rowInputs}>
              <Input label="Invoice #" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Auto" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            </View>

            {/* Customer type */}
            <Text style={styles.fieldLabel}>Customer Type</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, isWalkin && styles.chipSelected]} onPress={() => { setIsWalkin(true); setCustomerId(null); }}>
                <Text style={[styles.chipText, isWalkin && styles.chipTextSelected]}>Walk-in Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, !isWalkin && styles.chipSelected]} onPress={() => setIsWalkin(false)}>
                <Text style={[styles.chipText, !isWalkin && styles.chipTextSelected]}>Select Customer</Text>
              </TouchableOpacity>
            </View>

            {isWalkin ? (
              <Input label="Walk-in Customer Name" value={walkinName} onChangeText={setWalkinName} placeholder="Optional" />
            ) : (
              <>
                <Text style={styles.fieldLabel}>Select Customer</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerScroll}>
                  {customers.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.chip, customerId === c.id && styles.chipSelected]} onPress={() => setCustomerId(c.id)}>
                      <Text style={[styles.chipText, customerId === c.id && styles.chipTextSelected]} numberOfLines={1}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Product search */}
            <Text style={styles.fieldLabel}>Search Product (Name or Design #)</Text>
            <View style={styles.searchWrap}>
              <Search size={18} color={MD3Colors.onSurfaceVariant} style={{ marginLeft: MD3Spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search products..."
                placeholderTextColor={MD3Colors.outline}
              />
            </View>

            {/* Line items */}
            <View style={styles.itemsHeader}>
              <Text style={styles.fieldLabel}>Products</Text>
              <TouchableOpacity onPress={addLineItem}><Plus size={20} color={MD3Colors.primary} /></TouchableOpacity>
            </View>

            {lineItems.map((li, i) => {
              const stock = getStockForLineItem(li);
              const isLowStock = stock !== null && stock <= LOW_STOCK_THRESHOLD;
              return (
                <View key={i} style={styles.lineItemCard}>
                  <View style={styles.lineItemTop}>
                    <Text style={styles.lineItemTitle}>Item {i + 1}</Text>
                    {lineItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeLineItem(i)}><Trash2 size={16} color={MD3Colors.error} /></TouchableOpacity>
                    )}
                  </View>

                  {/* Product picker toggle */}
                  <TouchableOpacity style={styles.productPickerBtn} onPress={() => setShowProductPicker(showProductPicker === i ? null : i)}>
                    <Text style={li.productId ? styles.productPickerText : styles.productPickerPlaceholder}>
                      {li.productId ? li.productName : 'Select a product...'}
                    </Text>
                    {showProductPicker === i ? <ChevronUp size={18} color={MD3Colors.onSurfaceVariant} /> : <ChevronDown size={18} color={MD3Colors.onSurfaceVariant} />}
                  </TouchableOpacity>

                  {showProductPicker === i && (
                    <View style={styles.productDropdown}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {filteredProducts.map(p => {
                          const pStock = p.total_stock ?? 0;
                          const pLowStock = pStock <= LOW_STOCK_THRESHOLD;
                          return (
                            <TouchableOpacity key={p.id} style={styles.productOption} onPress={() => {
                              updateLineItem(i, 'productId', p.id);
                              updateLineItem(i, 'productName', p.name);
                              updateLineItem(i, 'variantId', null);
                              updateLineItem(i, 'unitPrice', String(p.sale_price || ''));
                              setShowProductPicker(null);
                            }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.productOptionName}>{p.name}</Text>
                              </View>
                              <View style={styles.productOptionRight}>
                                <Text style={styles.productOptionPrice}>Rs {p.sale_price || 0}</Text>
                                <Text style={[styles.productOptionStock, pLowStock && { color: MD3Colors.warning }]}>Stock: {pStock}</Text>
                                {pLowStock ? <AlertTriangle size={12} color={MD3Colors.warning} /> : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Variant selector */}
                  {li.productId && (() => {
                    const product = products.find(p => p.id === li.productId);
                    if (!product || !product.variants || product.variants.length === 0) return null;
                    return (
                      <View style={styles.variantRow}>
                        {product.variants.map((v: any) => (
                          <TouchableOpacity key={v.id} style={[styles.miniChip, li.variantId === v.id && styles.miniChipSelected]} onPress={() => updateLineItem(i, 'variantId', li.variantId === v.id ? null : v.id)}>
                            <Text style={[styles.miniChipText, li.variantId === v.id && styles.miniChipTextSelected]}>{v.size || '-'} {v.color || ''}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}

                  {/* Stock warning */}
                  {li.productId && stock !== null && isLowStock && (
                    <View style={styles.stockWarning}>
                      <AlertTriangle size={14} color={MD3Colors.warning} />
                      <Text style={styles.stockWarningText}>Low stock: {stock} remaining</Text>
                    </View>
                  )}

                  {/* Inputs */}
                  <View style={styles.lineItemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Qty</Text>
                      <TextInput style={styles.lineInput} value={li.quantity} onChangeText={t => updateLineItem(i, 'quantity', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Unit</Text>
                      <View style={styles.unitRow}>
                        {UNITS.map(u => (
                          <TouchableOpacity key={u} style={[styles.unitChip, li.unit === u && styles.unitChipSelected]} onPress={() => updateLineItem(i, 'unit', u)}>
                            <Text style={[styles.unitChipText, li.unit === u && styles.unitChipTextSelected]}>{u[0]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price</Text>
                      <TextInput style={styles.lineInput} value={li.unitPrice} onChangeText={t => updateLineItem(i, 'unitPrice', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Total</Text>
                      <Text style={styles.lineTotalText}>{lineTotal(li).toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatRs(subtotal)}</Text></View>
              <View style={styles.rowInputs}>
                <Input label="Discount %" value={discountPercent} onChangeText={setDiscountPercent} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                <Input label="Discount (Rs)" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" style={{ flex: 1 }} />
              </View>
              <Input label="Extra Charges (Rs)" value={extraCharges} onChangeText={setExtraCharges} keyboardType="numeric" placeholder="0" />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Grand Total</Text><Text style={[styles.summaryValue, { fontSize: 18 }]}>{formatRs(grandTotal)}</Text></View>

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[styles.chip, paymentMethod === m && styles.chipSelected]} onPress={() => setPaymentMethod(m)}>
                    <Text style={[styles.chipText, paymentMethod === m && styles.chipTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rowInputs}>
                <Input label="Payment Date" value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                <Input label="Payment Time" value={paymentTime} onChangeText={setPaymentTime} placeholder="HH:MM" style={{ flex: 1 }} />
              </View>
              <View style={styles.rowInputs}>
                <Input label="Amount Received (Rs)" value={amountReceived} onChangeText={setAmountReceived} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                <Input label="Transaction / UTR #" value={transactionNumber} onChangeText={setTransactionNumber} placeholder="Optional" style={{ flex: 1 }} />
              </View>
              {paymentMethod === 'UPI' && (
                <Input label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="Optional" />
              )}
              <Input label="Reference Number" value={referenceNumber} onChangeText={setReferenceNumber} placeholder="Optional" />
              <Text style={styles.fieldLabel}>Payment Screenshot</Text>
              <TouchableOpacity style={styles.screenshotBtn} onPress={pickScreenshot}>
                {paymentScreenshot ? (
                  <Image source={{ uri: paymentScreenshot }} style={styles.screenshotImg} />
                ) : (
                  <View style={styles.screenshotPlaceholder}>
                    <Camera size={22} color={MD3Colors.onSurfaceVariant} />
                    <Text style={styles.screenshotText}>Upload Screenshot</Text>
                  </View>
                )}
              </TouchableOpacity>
              {paymentScreenshot ? (
                <TouchableOpacity onPress={() => setPaymentScreenshot('')} style={styles.screenshotRemove}>
                  <Text style={styles.screenshotRemoveText}>Remove Screenshot</Text>
                </TouchableOpacity>
              ) : null}
              <View style={[styles.summaryRow, balanceDue > 0 && { backgroundColor: MD3Colors.errorContainer, borderRadius: MD3Radius.sm, padding: MD3Spacing.sm }]}>
                <Text style={styles.summaryLabel}>Balance Due</Text>
                <Text style={[styles.summaryValue, balanceDue > 0 && { color: MD3Colors.error }]}>{formatRs(balanceDue)}</Text>
              </View>
            </View>

            <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Save Sale" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// SALE DETAIL MODAL
// ============================================================
function SaleDetailModal({ sale, onClose, formatRs, formatDate }: { sale: SaleHeaderWithDetails | null; onClose: () => void; formatRs: (n: number) => string; formatDate: (ts: number) => string }) {
  if (!sale) return null;
  return (
    <Modal visible={!!sale} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sale Details</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Invoice #</Text><Text style={styles.detailValue}>{sale.invoice_number}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Customer</Text><Text style={styles.detailValue}>{sale.customer_name}{sale.is_walkin ? ' (Walk-in)' : ''}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDate(sale.date)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment</Text><Text style={styles.detailValue}>{sale.payment_method}</Text></View>
            {sale.transaction_number ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Txn #</Text><Text style={styles.detailValue}>{sale.transaction_number}</Text></View> : null}

            <Text style={styles.sectionTitle}>Items ({sale.items.length})</Text>
            {sale.items.map((item, i) => (
              <View key={i} style={styles.detailItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailItemName}>{item.product_name}</Text>
                  {item.variant_label ? <Text style={styles.detailItemMeta}>{item.variant_label}</Text> : null}
                  <Text style={styles.detailItemMeta}>{item.quantity} {item.unit} × {formatRs(item.unit_price)}</Text>
                </View>
                <Text style={styles.detailItemTotal}>{formatRs(item.total)}</Text>
              </View>
            ))}

            <View style={styles.detailSummary}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Subtotal</Text><Text style={styles.detailValueBold}>{formatRs(sale.subtotal)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Discount</Text><Text style={[styles.detailValueBold, { color: MD3Colors.error }]}>- {formatRs(sale.discount)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Grand Total</Text><Text style={[styles.detailValueBold, { fontSize: 18 }]}>{formatRs(sale.grand_total)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Received</Text><Text style={[styles.detailValueBold, { color: MD3Colors.success }]}>{formatRs(sale.amount_received)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Balance Due</Text><Text style={[styles.detailValueBold, sale.balance_due > 0 && { color: MD3Colors.error }]}>{formatRs(sale.balance_due)}</Text></View>
            </View>
            {sale.note ? <Text style={styles.detailNote}>{sale.note}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatRs(n: number) { return 'Rs ' + (n || 0).toLocaleString('en-PK'); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: MD3Spacing.md },
  cardIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  badge: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 4 },
  badgeText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  cardAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginTop: 2 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm, gap: 6 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  rowInputs: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  customerScroll: { flexDirection: 'row', marginBottom: MD3Spacing.sm },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.sm },
  searchInput: { flex: 1, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: MD3Spacing.sm },
  lineItemCard: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MD3Spacing.sm },
  lineItemTitle: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  productPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.sm },
  productPickerText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, flex: 1 },
  productPickerPlaceholder: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.outline, flex: 1 },
  productDropdown: { borderWidth: 1, borderColor: MD3Colors.outlineVariant, borderRadius: MD3Radius.sm, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.sm, overflow: 'hidden' },
  productOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.md, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  productOptionName: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurface },
  productOptionMeta: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  productOptionRight: { alignItems: 'flex-end', marginLeft: MD3Spacing.sm },
  productOptionPrice: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onSurface },
  productOptionStock: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.xs, marginBottom: MD3Spacing.sm },
  miniChip: { paddingHorizontal: MD3Spacing.sm, paddingVertical: 4, borderRadius: MD3Radius.sm, borderWidth: 1, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  miniChipSelected: { backgroundColor: MD3Colors.tertiary, borderColor: MD3Colors.tertiary },
  miniChipText: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  miniChipTextSelected: { color: MD3Colors.onPrimary },
  stockWarning: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: MD3Colors.warningContainer, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 4, marginBottom: MD3Spacing.sm },
  stockWarningText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.warning },
  lineItemInputs: { flexDirection: 'row', gap: MD3Spacing.sm, alignItems: 'flex-end' },
  inputGroup: { flex: 1 },
  inputLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  lineInput: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface, backgroundColor: MD3Colors.surface, minWidth: 50 },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitChip: { width: 32, height: 36, borderRadius: 6, borderWidth: 1.5, borderColor: MD3Colors.outline, justifyContent: 'center', alignItems: 'center', backgroundColor: MD3Colors.surface },
  unitChipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  unitChipText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  unitChipTextSelected: { color: MD3Colors.onPrimary },
  lineTotalText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, paddingVertical: 8 },
  summaryCard: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginTop: MD3Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MD3Spacing.xs },
  summaryLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  summaryValue: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: MD3Spacing.sm, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  detailLabel: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  detailValue: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface },
  detailValueBold: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginTop: MD3Spacing.md, marginBottom: MD3Spacing.sm },
  detailItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, padding: MD3Spacing.sm, marginBottom: MD3Spacing.xs },
  detailItemName: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  detailItemMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  detailItemTotal: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  detailSummary: { marginTop: MD3Spacing.md, backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md },
  detailNote: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: MD3Spacing.md, fontStyle: 'italic' },
  screenshotBtn: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderStyle: 'dashed', borderRadius: MD3Radius.sm, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.xs, overflow: 'hidden' },
  screenshotImg: { width: '100%', height: 140, resizeMode: 'cover' },
  screenshotPlaceholder: { height: 80, justifyContent: 'center', alignItems: 'center' },
  screenshotText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  screenshotRemove: { alignSelf: 'flex-start', padding: MD3Spacing.xs, marginBottom: MD3Spacing.sm },
  screenshotRemoveText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
});
