import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, TextInput, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2, ClipboardList, X, ChevronDown, Package, Search, Camera, ImageIcon, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllPurchases, getAllSuppliersFull, getAllProducts, getAllBankAccounts, addPurchase, deletePurchase,
  UNITS, PAYMENT_METHODS,
  SupplierWithStats, ProductWithDetails, PurchaseHeaderWithDetails, PurchaseItemInput, PurchaseHeader,
  SupplierPaymentInput, BankAccount,
} from '@/lib/db/repo';
import type { Unit } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const;

export default function PurchasesScreen() {
  const [purchases, setPurchases] = useState<PurchaseHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseHeaderWithDetails | null>(null);

  const load = useCallback(async () => {
    try {
      setPurchases(await getAllPurchases());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (p: PurchaseHeaderWithDetails) => {
    Alert.alert('Delete Purchase', `Delete purchase "${p.invoice_number || p.id}"? Stock will be reversed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePurchase(p.id); load(); } },
    ]);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Purchase Management" subtitle={`${purchases.length} purchases`} />
      <FlatList
        data={purchases}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<ClipboardList size={48} color={MD3Colors.outline} />} title="No purchases yet" subtitle="Tap + to record a new purchase" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => setDetailPurchase(item)}>
              <View style={styles.cardIconWrap}><ClipboardList size={20} color={MD3Colors.accent} /></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.supplier_name}</Text>
                <Text style={styles.cardMeta}>{formatDate(item.date)} · {item.invoice_number || `#${item.id}`}</Text>
              </View>
              <Text style={styles.cardAmount}>{formatRs(item.grand_total || item.subtotal)}</Text>
            </TouchableOpacity>
            <View style={styles.cardBody}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>{item.items.length} items</Text></View>
                {item.payments && item.payments.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: MD3Colors.primaryContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.primary }]}>{item.payments.length} payments</Text></View>
                )}
                {item.remaining_balance > 0 ? (
                  <View style={[styles.badge, { backgroundColor: MD3Colors.errorContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.error }]}>Bal {formatRs(item.remaining_balance)}</Text></View>
                ) : <View style={[styles.badge, { backgroundColor: MD3Colors.successContainer }]}><Text style={[styles.badgeText, { color: MD3Colors.success }]}>Paid</Text></View>}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setDetailPurchase(item)}>
                <Text style={styles.actionText}>View Details</Text>
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

      <PurchaseFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={() => { setModalVisible(false); load(); }} />
      <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} formatRs={formatRs} formatDate={formatDate} />
    </View>
  );
}

interface PaymentRow {
  amount: string;
  paymentDate: string;
  paymentTime: string;
  paymentMode: string;
  bankAccountId: number | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  upiId: string;
  transactionNumber: string;
  chequeNumber: string;
  referenceNumber: string;
  note: string;
  proofImages: string[];
}

function PurchaseFormModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: null, variantId: null, quantity: '', unit: 'Piece' as Unit, unitPrice: '', sellingPrice: '' }]);
  const [discount, setDiscount] = useState('');
  const [transportCharges, setTransportCharges] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [note, setNote] = useState('');
  const [billImage, setBillImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  interface LineItem { productId: number | null; variantId: number | null; quantity: string; unit: Unit; unitPrice: string; sellingPrice: string; }

  useEffect(() => {
    if (visible) {
      loadOptions();
      setSupplierId(null); setInvoiceNumber(''); setDate(new Date().toISOString().split('T')[0]); setSearch('');
      setLineItems([{ productId: null, variantId: null, quantity: '', unit: 'Piece' as Unit, unitPrice: '', sellingPrice: '' }]);
      setDiscount(''); setTransportCharges(''); setOtherCharges('');
      setPayments([]); setNote(''); setError('');
    }
  }, [visible]);

  const loadOptions = async () => {
    const [sups, prods, banks] = await Promise.all([getAllSuppliersFull(), getAllProducts(), getAllBankAccounts()]);
    setSuppliers(sups); setProducts(prods); setBankAccounts(banks);
  };

  const filteredProducts = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.design_number || '').toLowerCase().includes(q);
  });

  const updateLineItem = (i: number, field: keyof LineItem, val: any) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: val } : li));
  };
  const addLineItem = () => setLineItems(prev => [...prev, { productId: null, variantId: null, quantity: '', unit: 'Piece' as Unit, unitPrice: '', sellingPrice: '' }]);
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const lineTotal = (li: LineItem) => (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0);
  const subtotal = lineItems.reduce((s, li) => s + lineTotal(li), 0);
  const discountAmount = parseFloat(discount) || 0;
  const transportAmount = parseFloat(transportCharges) || 0;
  const otherAmount = parseFloat(otherCharges) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + transportAmount + otherAmount);
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = Math.max(0, grandTotal - totalPaid);

  const addPayment = () => setPayments(prev => [...prev, {
    amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentTime: new Date().toTimeString().split(' ')[0],
    paymentMode: 'Cash', bankAccountId: null, bankName: '', accountName: '', accountNumber: '', upiId: '',
    transactionNumber: '', chequeNumber: '', referenceNumber: '', note: '', proofImages: [],
  }]);
  const updatePayment = (i: number, field: keyof PaymentRow, val: any) => {
    setPayments(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };
  const removePayment = (i: number) => setPayments(prev => prev.filter((_, idx) => idx !== i));

  const onBankAccountSelect = (i: number, accountId: number | null) => {
    const account = bankAccounts.find(a => a.id === accountId);
    updatePayment(i, 'bankAccountId', accountId);
    if (account) {
      updatePayment(i, 'bankName', account.bank_name || account.name);
      updatePayment(i, 'accountName', account.account_name || '');
      updatePayment(i, 'accountNumber', account.account_number || '');
      updatePayment(i, 'upiId', account.upi_id || '');
    }
  };
const pickBillImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    setBillImage(result.assets[0].uri);
  }
};
  const handleSave = async () => {
    if (!supplierId) { setError('Please select a supplier'); return; }
    const validItems = lineItems.filter(li => li.productId && parseFloat(li.quantity) > 0);
    if (validItems.length === 0) { setError('Add at least one product with quantity'); return; }
    setSaving(true);
    try {
      const dateTs = new Date(date).getTime();
      const items: PurchaseItemInput[] = validItems.map(li => ({
        product_id: li.productId!, variant_id: li.variantId, quantity: parseInt(li.quantity),
        unit: li.unit, unit_price: parseFloat(li.unitPrice) || 0, selling_price: parseFloat(li.sellingPrice) || 0, total: lineTotal(li),
      }));
      const paymentInputs: SupplierPaymentInput[] = payments
        .filter(p => parseFloat(p.amount) > 0)
        .map(p => ({
          amount: parseFloat(p.amount),
          payment_date: new Date(p.paymentDate).getTime(),
          payment_time: p.paymentTime,
          payment_mode: p.paymentMode,
          bank_account_id: p.bankAccountId,
          bank_name: p.bankName, account_name: p.accountName, account_number: p.accountNumber,
          upi_id: p.upiId, transaction_number: p.transactionNumber, cheque_number: p.chequeNumber,
          reference_number: p.referenceNumber, note: p.note, proof_images: p.proofImages,
        }));
      const header: PurchaseHeader = {
        supplier_id: supplierId, invoice_number: invoiceNumber.trim(), date: dateTs,
        subtotal, discount: discountAmount, transport_charges: transportAmount, other_charges: otherAmount,
        grand_total: grandTotal, amount_paid: totalPaid, remaining_balance: remaining,
        payment_method: (paymentInputs[0]?.payment_mode || 'Cash') as any, transaction_number: paymentInputs[0]?.transaction_number || '', note: note.trim(),
        payment_date: paymentInputs[0]?.payment_date || dateTs, payment_time: paymentInputs[0]?.payment_time || '',
        upi_id: paymentInputs[0]?.upi_id || '', reference_number: paymentInputs[0]?.reference_number || '',
        payment_screenshot: billImage,
      };
      await addPurchase(header, items, paymentInputs);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Purchase</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 120 }}>
            {suppliers.length === 0 ? (
              <Text style={styles.hintText}>Please add a supplier first.</Text>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Supplier *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {suppliers.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipSelected]} onPress={() => setSupplierId(s.id)}>
                      <Text style={[styles.chipText, supplierId === s.id && styles.chipTextSelected]} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.rowInputs}>
                  <Input label="Invoice #" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Optional" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                  <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
                </View>

                <View style={styles.searchWrap}>
                  <Search size={18} color={MD3Colors.outline} />
                  <TextInput style={styles.searchInput} placeholder="Search product..." placeholderTextColor={MD3Colors.outline} value={search} onChangeText={setSearch} />
                </View>

                <View style={styles.itemsHeader}>
                  <Text style={styles.fieldLabel}>Products</Text>
                  <TouchableOpacity onPress={addLineItem}><Plus size={20} color={MD3Colors.primary} /></TouchableOpacity>
                </View>

                {lineItems.map((li, i) => {
                  const product = products.find(p => p.id === li.productId);
                  return (
                    <View key={i} style={styles.lineItemCard}>
                      <View style={styles.lineItemTop}>
                        <Text style={styles.lineItemTitle}>Item {i + 1}</Text>
                        {lineItems.length > 1 && <TouchableOpacity onPress={() => removeLineItem(i)}><Trash2 size={16} color={MD3Colors.error} /></TouchableOpacity>}
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
                        {filteredProducts.map(p => (
                          <TouchableOpacity key={p.id} style={[styles.prodChip, li.productId === p.id && styles.prodChipSelected]} onPress={() => updateLineItem(i, 'productId', p.id)}>
                            <Text style={[styles.prodChipText, li.productId === p.id && styles.prodChipTextSelected]} numberOfLines={1}>{p.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      {product && product.variants && product.variants.length > 0 && (
                        <View style={styles.variantRow}>
                          {product.variants.map((v: any) => (
                            <TouchableOpacity key={v.id} style={[styles.miniChip, li.variantId === v.id && styles.miniChipSelected]} onPress={() => updateLineItem(i, 'variantId', li.variantId === v.id ? null : v.id)}>
                              <Text style={[styles.miniChipText, li.variantId === v.id && styles.miniChipTextSelected]}>{v.size || '-'} {v.color || ''}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <View style={styles.lineItemInputs}>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Qty</Text><TextInput style={styles.lineInput} value={li.quantity} onChangeText={t => updateLineItem(i, 'quantity', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Unit</Text><View style={styles.unitRow}>{UNITS.map(u => <TouchableOpacity key={u} style={[styles.unitChip, li.unit === u && styles.unitChipSelected]} onPress={() => updateLineItem(i, 'unit', u)}><Text style={[styles.unitChipText, li.unit === u && styles.unitChipTextSelected]}>{u[0]}</Text></TouchableOpacity>)}</View></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Purch Rs</Text><TextInput style={styles.lineInput} value={li.unitPrice} onChangeText={t => updateLineItem(i, 'unitPrice', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Sell Rs</Text><TextInput style={styles.lineInput} value={li.sellingPrice} onChangeText={t => updateLineItem(i, 'sellingPrice', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Total</Text><Text style={styles.lineTotalText}>{lineTotal(li).toFixed(0)}</Text></View>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatRs(subtotal)}</Text></View>
                  <Input label="Discount (Rs)" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" />
                  <View style={styles.rowInputs}>
                    <Input label="Transport (Rs)" value={transportCharges} onChangeText={setTransportCharges} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                    <Input label="Other Charges (Rs)" value={otherCharges} onChangeText={setOtherCharges} keyboardType="numeric" placeholder="0" style={{ flex: 1 }} />
                  </View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Grand Total</Text><Text style={[styles.summaryValue, { fontSize: 18 }]}>{formatRs(grandTotal)}</Text></View><Text style={styles.fieldLabel}>Purchase Bill</Text>

<TouchableOpacity
  onPress={pickBillImage}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 10,
  }}
>
  <Camera size={20} color={MD3Colors.primary} />
  <Text style={{ marginLeft: 10 }}>
    {billImage ? 'Change Bill Photo' : 'Attach Bill Photo'}
  </Text>
</TouchableOpacity>

{billImage ? (
  <Image
    source={{ uri: billImage }}
    style={{
      width: 120,
      height: 120,
      marginTop: 10,
      borderRadius: 8,
    }}
  />
) : null}
                </View>

                <View style={styles.itemsHeader}>
                  <Text style={styles.fieldLabel}>Payments ({payments.length})</Text>
                  <TouchableOpacity onPress={addPayment}><Plus size={20} color={MD3Colors.primary} /></TouchableOpacity>
                </View>

                {payments.length === 0 && <Text style={styles.hintText}>No payments added. This will be an unpaid purchase.</Text>}

                {payments.map((p, i) => (
                  <View key={i} style={styles.paymentCard}>
                    <View style={styles.lineItemTop}>
                      <Text style={styles.lineItemTitle}>Payment {i + 1}</Text>
                      <TouchableOpacity onPress={() => removePayment(i)}><Trash2 size={16} color={MD3Colors.error} /></TouchableOpacity>
                    </View>
                    <Input label="Amount (Rs)" value={p.amount} onChangeText={t => updatePayment(i, 'amount', t)} keyboardType="numeric" placeholder="0" />
                    <View style={styles.rowInputs}>
                      <Input label="Date" value={p.paymentDate} onChangeText={t => updatePayment(i, 'paymentDate', t)} placeholder="YYYY-MM-DD" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                      <Input label="Time" value={p.paymentTime} onChangeText={t => updatePayment(i, 'paymentTime', t)} placeholder="HH:MM" style={{ flex: 1 }} />
                    </View>
                    <Text style={styles.fieldLabel}>Payment Mode</Text>
                    <View style={styles.chipRow}>
                      {PAYMENT_MODES.map(m => (
                        <TouchableOpacity key={m} style={[styles.chip, p.paymentMode === m && styles.chipSelected]} onPress={() => updatePayment(i, 'paymentMode', m)}>
                          <Text style={[styles.chipText, p.paymentMode === m && styles.chipTextSelected]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {bankAccounts.length > 0 && (
                      <>
                        <Text style={styles.fieldLabel}>Account</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                          <TouchableOpacity style={[styles.chip, !p.bankAccountId && styles.chipSelected]} onPress={() => onBankAccountSelect(i, null)}>
                            <Text style={[styles.chipText, !p.bankAccountId && styles.chipTextSelected]}>None</Text>
                          </TouchableOpacity>
                          {bankAccounts.map(a => (
                            <TouchableOpacity key={a.id} style={[styles.chip, p.bankAccountId === a.id && styles.chipSelected]} onPress={() => onBankAccountSelect(i, a.id!)}>
                              <Text style={[styles.chipText, p.bankAccountId === a.id && styles.chipTextSelected]}>{a.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}
                    {(p.paymentMode === 'UPI' || p.paymentMode === 'Bank Transfer') && (
                      <View style={styles.rowInputs}>
                        <Input label="UPI ID" value={p.upiId} onChangeText={t => updatePayment(i, 'upiId', t)} placeholder="UPI" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                        <Input label="Txn/UTR #" value={p.transactionNumber} onChangeText={t => updatePayment(i, 'transactionNumber', t)} placeholder="UTR" style={{ flex: 1 }} />
                      </View>
                    )}
                    {p.paymentMode === 'Cheque' && (
                      <View style={styles.rowInputs}>
                        <Input label="Cheque #" value={p.chequeNumber} onChangeText={t => updatePayment(i, 'chequeNumber', t)} placeholder="Cheque no" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                        <Input label="Bank Name" value={p.bankName} onChangeText={t => updatePayment(i, 'bankName', t)} placeholder="Bank" style={{ flex: 1 }} />
                      </View>
                    )}
                    <Input label="Reference #" value={p.referenceNumber} onChangeText={t => updatePayment(i, 'referenceNumber', t)} placeholder="Optional" />
                    <Input label="Note" value={p.note} onChangeText={t => updatePayment(i, 'note', t)} placeholder="Optional" multiline />
                    <Text style={styles.fieldLabel}>Payment Proof Images</Text>
                    <View style={styles.proofRow}>
                      <TouchableOpacity style={styles.proofAddBtn} onPress={async () => {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) { Alert.alert('Permission required'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]?.uri) {
                          updatePayment(i, 'proofImages', [...p.proofImages, result.assets[0].uri]);
                        }
                      }}>
                        <Camera size={20} color={MD3Colors.primary} />
                        <Text style={styles.proofAddText}>Add Image</Text>
                      </TouchableOpacity>
                      {p.proofImages.map((img, j) => (
                        <TouchableOpacity key={j} style={styles.proofThumb} onPress={() => updatePayment(i, 'proofImages', p.proofImages.filter((_, k) => k !== j))}>
                          <Image source={{ uri: img }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                          <Text style={styles.proofText}>tap x</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={[styles.summaryRow, remaining > 0 && { backgroundColor: MD3Colors.errorContainer, borderRadius: MD3Radius.sm, padding: MD3Spacing.sm }]}>
                  <Text style={styles.summaryLabel}>Remaining Balance</Text>
                  <Text style={[styles.summaryValue, remaining > 0 && { color: MD3Colors.error }]}>{formatRs(remaining)}</Text>
                </View>

                <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            )}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Save Purchase" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PurchaseDetailModal({ purchase, onClose, formatRs, formatDate }: { purchase: PurchaseHeaderWithDetails | null; onClose: () => void; formatRs: (n: number) => string; formatDate: (ts: number) => string }) {
  if (!purchase) return null;
  return (
    <Modal visible={!!purchase} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Purchase Details</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Supplier</Text><Text style={styles.detailValue}>{purchase.supplier_name}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDate(purchase.date)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Invoice #</Text><Text style={styles.detailValue}>{purchase.invoice_number || `#${purchase.id}`}</Text></View>

            <Text style={styles.sectionTitle}>Items ({purchase.items.length})</Text>
            {purchase.items.map((item, i) => (
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
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Subtotal</Text><Text style={styles.detailValueBold}>{formatRs(purchase.subtotal)}</Text></View>
              {purchase.discount > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Discount</Text><Text style={[styles.detailValueBold, { color: MD3Colors.error }]}>- {formatRs(purchase.discount)}</Text></View>}
              {purchase.transport_charges > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Transport</Text><Text style={styles.detailValueBold}>{formatRs(purchase.transport_charges)}</Text></View>}
              {purchase.other_charges > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Other</Text><Text style={styles.detailValueBold}>{formatRs(purchase.other_charges)}</Text></View>}
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Grand Total</Text><Text style={[styles.detailValueBold, { fontSize: 18 }]}>{formatRs(purchase.grand_total)}</Text></View>
            </View>

            {purchase.payments && purchase.payments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Payments ({purchase.payments.length})</Text>
                {purchase.payments.map((pay, i) => (
                  <View key={i} style={styles.detailItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailItemName}>{formatRs(pay.amount)} · {pay.payment_mode}</Text>
                      <Text style={styles.detailItemMeta}>{formatDate(pay.payment_date)}{pay.payment_time ? ` ${pay.payment_time}` : ''}</Text>
                      {pay.transaction_number ? <Text style={styles.detailItemMeta}>Txn: {pay.transaction_number}</Text> : null}
                      {pay.cheque_number ? <Text style={styles.detailItemMeta}>Cheque: {pay.cheque_number}</Text> : null}
                      {pay.note ? <Text style={styles.detailItemMeta}>{pay.note}</Text> : null}
                    </View>
                    {pay.proof_images && pay.proof_images.length > 0 && (
                      <View style={styles.proofBadge}><ImageIcon size={14} color={MD3Colors.primary} /><Text style={styles.proofBadgeText}>{pay.proof_images.length}</Text></View>
                    )}
                  </View>
                ))}
              </>
            )}

            <View style={styles.detailSummary}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Total Paid</Text><Text style={[styles.detailValueBold, { color: MD3Colors.success }]}>{formatRs(purchase.amount_paid)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Balance</Text><Text style={[styles.detailValueBold, purchase.remaining_balance > 0 && { color: MD3Colors.error }]}>{formatRs(purchase.remaining_balance)}</Text></View>
            </View>
            {purchase.note ? <Text style={styles.detailNote}>{purchase.note}</Text> : null}
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: MD3Spacing.md },
  cardIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#B2DFDB', justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  cardAmount: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  cardBody: { paddingHorizontal: MD3Spacing.md, paddingBottom: MD3Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  badge: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 4 },
  badgeText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm, gap: 6 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '94%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipScroll: { flexDirection: 'row', marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface, marginRight: MD3Spacing.sm, maxWidth: 160 },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  rowInputs: { flexDirection: 'row' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.sm, borderWidth: 1.5, borderColor: MD3Colors.outline, paddingHorizontal: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.sm },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: MD3Spacing.sm },
  lineItemCard: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MD3Spacing.sm },
  lineItemTitle: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  productScroll: { flexDirection: 'row', marginBottom: MD3Spacing.sm },
  prodChip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.sm, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface, marginRight: MD3Spacing.sm, maxWidth: 140 },
  prodChipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  prodChipText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  prodChipTextSelected: { color: MD3Colors.onPrimary },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.xs, marginBottom: MD3Spacing.sm },
  miniChip: { paddingHorizontal: MD3Spacing.sm, paddingVertical: 4, borderRadius: MD3Radius.sm, borderWidth: 1, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  miniChipSelected: { backgroundColor: MD3Colors.tertiary, borderColor: MD3Colors.tertiary },
  miniChipText: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  miniChipTextSelected: { color: MD3Colors.onPrimary },
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
  paymentCard: { backgroundColor: MD3Colors.primaryContainer, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md },
  proofRow: { flexDirection: 'row', gap: MD3Spacing.sm, alignItems: 'center', marginTop: MD3Spacing.xs },
  proofAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface },
  proofAddText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  proofThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: MD3Colors.surface, borderWidth: 1, borderColor: MD3Colors.outline, justifyContent: 'center', alignItems: 'center' },
  proofText: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  hintText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center', padding: MD3Spacing.xl },
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
  proofBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: MD3Colors.primaryContainer, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  proofBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 11, color: MD3Colors.primary },
});
