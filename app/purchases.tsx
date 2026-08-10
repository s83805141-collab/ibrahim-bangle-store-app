import { SirenButtons } from "../components/SirenButtons";
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Trash2, ClipboardList, X, ChevronDown, ChevronUp, Package, Search, Camera, ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { pickImage } from '@/lib/imagePicker';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllPurchases, getAllSuppliersFull, getAllProducts, getAllBankAccounts, addPurchase, deletePurchase,
  UNITS,
  SupplierWithStats, ProductWithDetails, PurchaseHeaderWithDetails, PurchaseItemInput, PurchaseHeader,
  SupplierPaymentInput, BankAccount,
} from '@/lib/db/repo';
import type { Unit } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader, FAB, StatusBadge } from '@/components/ui';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'] as const;

export default function PurchasesScreen() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseHeaderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseHeaderWithDetails | null>(null);

  const load = useCallback(async () => {
    try { setPurchases(await getAllPurchases()); } finally { setLoading(false); }
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
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 140 }}
        ListEmptyComponent={<EmptyState icon={<ClipboardList size={48} color={MD3Colors.outline} />} title="No purchases yet" subtitle="Tap + to record a new purchase" />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(250).delay(index * 50)}>
            <View style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} onPress={() => router.push({ pathname: '/invoice-details', params: { type: 'purchase', id: String(item.id) } })}>
                <View style={styles.cardIconWrap}><ClipboardList size={20} color={MD3Colors.accent} strokeWidth={2.2} /></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.supplier_name}</Text>
                  <Text style={styles.cardMeta}>{formatDate(item.date)} · {item.invoice_number || `#${item.id}`}</Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge label={`${item.items.length} items`} color={MD3Colors.onSurfaceVariant} bg={MD3Colors.surfaceVariant} />
                    {item.payments && item.payments.length > 0 && (
                      <StatusBadge label={`${item.payments.length} payments`} color={MD3Colors.primary} bg={MD3Colors.primaryContainer} />
                    )}
                    {item.remaining_balance > 0 ? (
                      <StatusBadge label={`Due ${formatRs(item.remaining_balance)}`} color={MD3Colors.error} bg={MD3Colors.errorContainer} />
                    ) : <StatusBadge label="Paid" color={MD3Colors.success} bg={MD3Colors.successContainer} />}
                  </View>
                </View>
                <Text style={styles.cardAmount}>{formatRs(item.grand_total || item.subtotal)}</Text>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setDetailPurchase(item)}>
                  <Text style={[styles.actionText, { color: MD3Colors.warning }]}>View Details</Text>
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Trash2 size={16} color={MD3Colors.error} /><Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      />

      <FAB onPress={() => setModalVisible(true)} intent="add" icon={Plus} />

      <PurchaseFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={() => { setModalVisible(false); load(); }} />
      <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} formatRs={formatRs} formatDate={formatDate} />
    </View>
  );
}

interface PaymentRow {
  amount: string; paymentDate: string; paymentTime: string; paymentMode: string;
  bankAccountId: number | null; bankName: string; accountName: string; accountNumber: string;
  upiId: string; transactionNumber: string; chequeNumber: string; referenceNumber: string; note: string; proofImages: string[];
}

function PurchaseFormModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: null, variantId: null, productName: '', quantity: '', unit: 'Box' as Unit, unitPrice: '', sellingPrice: '' }]);
  const [discount, setDiscount] = useState('');
  const [transportCharges, setTransportCharges] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [note, setNote] = useState('');
  const [billImage, setBillImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);

  interface LineItem { productId: number | null; variantId: number | null; productName: string; quantity: string; unit: Unit; unitPrice: string; sellingPrice: string; }

  useEffect(() => {
    if (visible) {
      loadOptions();
      setSupplierId(null);
     setInvoiceNumber(''); setDate(new Date().toISOString().split('T')[0]); setSearch('');
      setLineItems([{ productId: null, variantId: null, productName: '', quantity: '', unit: 'Box' as Unit, unitPrice: '', sellingPrice: '' }]);
      setDiscount(''); setTransportCharges(''); setOtherCharges(''); setPayments([]); setNote(''); setError(''); setBillImage('');
      setShowProductPicker(null);
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
  const addLineItem = () => setLineItems(prev => [...prev, { productId: null, variantId: null, productName: '', quantity: '', unit: 'Box' as Unit, unitPrice: '', sellingPrice: '' }]);
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
    const uri = await pickImage({ allowsEditing: true, quality: 0.8 });
    if (uri) setBillImage(uri);
  };


  const getUnitLabel = (u: Unit): string => (u === 'Dozen' ? 'T' : u[0]);

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
          amount: parseFloat(p.amount), payment_date: new Date(p.paymentDate).getTime(), payment_time: p.paymentTime,
          payment_mode: p.paymentMode, bank_account_id: p.bankAccountId,
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
    } catch (e: any) { setError(e.message || 'Failed to save purchase'); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Purchase</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
            {suppliers.length === 0 ? (
              <Text style={styles.hintText}>Please add a supplier first.</Text>
            ) : (
              <>
                {/* Premium Supplier Chips */}
                <Text style={styles.fieldLabel}>Supplier *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {suppliers.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.supplierChip, supplierId === s.id && styles.supplierChipSelected]} onPress={() => setSupplierId(s.id)}>
                      <Text style={[styles.supplierChipText, supplierId === s.id && styles.supplierChipTextSelected]} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.rowInputs}>
                  <Input label="Invoice #" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Optional" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                  <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
                </View>

                {/* Product Search */}
                <View style={styles.searchWrap}>
                  <Search size={18} color={MD3Colors.primary} strokeWidth={2.2} style={{ marginLeft: MD3Spacing.sm }} />
                  <TextInput style={styles.searchInput} placeholder="Search product..." placeholderTextColor={MD3Colors.outline} value={search} onChangeText={setSearch} />
                </View>

                <View style={styles.itemsHeader}>
                  <Text style={styles.fieldLabel}>Products</Text>
                  <TouchableOpacity onPress={addLineItem} style={styles.addBtn}><Plus size={20} color={MD3Colors.primary} strokeWidth={2.4} /></TouchableOpacity>
                </View>

                {lineItems.map((li, i) => {
                  const product = products.find(p => p.id === li.productId);
                  return (
                    <View key={i} style={styles.lineItemCard}>
                      <View style={styles.lineItemTop}>
                        <Text style={styles.lineItemTitle}>Item {i + 1}</Text>
                        {lineItems.length > 1 && <TouchableOpacity onPress={() => removeLineItem(i)}><Trash2 size={16} color={MD3Colors.error} /></TouchableOpacity>}
                      </View>

                      {/* Product Selection Chips */}
                      <TouchableOpacity style={styles.productPickerBtn} onPress={() => setShowProductPicker(showProductPicker === i ? null : i)}>
                        <Text style={li.productId ? styles.productPickerText : styles.productPickerPlaceholder}>
                          {li.productId ? li.productName || product?.name || 'Selected' : 'Select a product...'}
                        </Text>
                        {showProductPicker === i ? <ChevronUp size={18} color={MD3Colors.onSurfaceVariant} /> : <ChevronDown size={18} color={MD3Colors.onSurfaceVariant} />}
                      </TouchableOpacity>

                      {showProductPicker === i && (
                        <View style={styles.productDropdown}>
                          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {filteredProducts.map(p => (
                              <TouchableOpacity key={p.id} style={styles.productOption} onPress={() => {
                                updateLineItem(i, 'productId', p.id);
                                updateLineItem(i, 'variantId', null);
                                updateLineItem(i, 'unitPrice', String(p.cost_price || ''));
                                setShowProductPicker(null);
                              }}>
                                <Text style={styles.productOptionName}>{p.name}</Text>
                                <Text style={styles.productOptionMeta}>Cost: Rs {p.cost_price || 0} · Stock: {p.total_stock ?? 0}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

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
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Unit</Text><View style={styles.unitRow}>{UNITS.map(u => <TouchableOpacity key={u} style={[styles.unitChip, li.unit === u && styles.unitChipSelected]} onPress={() => updateLineItem(i, 'unit', u)}><Text style={[styles.unitChipText, li.unit === u && styles.unitChipTextSelected]}>{getUnitLabel(u)}</Text></TouchableOpacity>)}</View></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Purch Rs</Text><TextInput style={styles.lineInput} value={li.unitPrice} onChangeText={t => updateLineItem(i, 'unitPrice', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Sell Rs</Text><TextInput style={styles.lineInput} value={li.sellingPrice} onChangeText={t => updateLineItem(i, 'sellingPrice', t)} keyboardType="numeric" placeholder="0" placeholderTextColor={MD3Colors.outline} /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Total</Text><Text style={styles.lineTotalText}>{lineTotal(li).toFixed(0)}</Text></View>
                      </View>
                    </View>
                  );
                })}

                {/* Attractive Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatRs(subtotal)}</Text></View>
                  <Input label="Discount (Rs)" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" />
                  <View style={styles.rowInputs}>
                    <Input label="Transport (Rs)" value={transportCharges} onChangeText={setTransportCharges} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                    <Input label="Other Charges (Rs)" value={otherCharges} onChangeText={setOtherCharges} keyboardType="numeric" placeholder="0" style={{ flex: 1 }} />
                  </View>
                  {/* Grand Total Highlighted */}
                  <LinearGradient colors={[MD3Colors.accent, '#00695C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                    <Text style={styles.grandTotalValue}>{formatRs(grandTotal)}</Text>
                  </LinearGradient>

                  {/* Bill Image Picker */}
                  <Text style={styles.fieldLabel}>Bill Photo</Text>
                  <TouchableOpacity onPress={pickBillImage} style={styles.billPickerBtn}>
                    {billImage ? (
                      <Image source={{ uri: billImage }} style={styles.billImage} />
                    ) : (
                      <View style={styles.billPlaceholder}>
                        <Camera size={22} color={MD3Colors.primary} strokeWidth={2.2} />
                        <Text style={styles.billPickerText}>Attach Bill Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {billImage ? <TouchableOpacity onPress={() => setBillImage('')} style={styles.billRemove}><Text style={styles.billRemoveText}>Remove</Text></TouchableOpacity> : null}
                </View>

                {/* Payment Section */}
                <View style={styles.itemsHeader}>
                  <Text style={styles.fieldLabel}>Payments ({payments.length})</Text>
                  <TouchableOpacity onPress={addPayment} style={styles.addBtn}><Plus size={20} color={MD3Colors.accent} strokeWidth={2.4} /></TouchableOpacity>
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
                      </View>
                    )}
                    {p.paymentMode === 'Cheque' && (
                      <View style={styles.rowInputs}>
                        <Input label="Cheque #" value={p.chequeNumber} onChangeText={t => updatePayment(i, 'chequeNumber', t)} placeholder="Cheque no" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                        <Input label="Bank Name" value={p.bankName} onChangeText={t => updatePayment(i, 'bankName', t)} placeholder="Bank" style={{ flex: 1 }} />
                      </View>
                    )}
                    <Input label="Note" value={p.note} onChangeText={t => updatePayment(i, 'note', t)} placeholder="Optional" multiline />
                    <Text style={styles.fieldLabel}>Payment Screenshot</Text>
                    <View style={styles.proofRow}>
                      <TouchableOpacity style={styles.proofAddBtn} onPress={async () => {
                        const uri = await pickImage({ quality: 0.6 });
                        if (uri) {
                          updatePayment(i, 'proofImages', [...p.proofImages, uri]);
                        }
                      }}>
                        <Camera size={20} color={MD3Colors.primary} strokeWidth={2.2} />
                        <Text style={styles.proofAddText}>Add Screenshot</Text>
                      </TouchableOpacity>
                      {p.proofImages.map((img, j) => (
                        <TouchableOpacity key={j} style={styles.proofThumb} onPress={() => updatePayment(i, 'proofImages', p.proofImages.filter((_, k) => k !== j))}>
                          <Image source={{ uri: img }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={[styles.summaryRow, remaining > 0 && styles.balanceDueRow]}>
                  <Text style={styles.summaryLabel}>Remaining Balance</Text>
                  <Text style={[styles.summaryValue, remaining > 0 && { color: MD3Colors.error }]}>{formatRs(remaining)}</Text>
                </View>

                <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            )}
          </ScrollView>
          <View style={styles.modalStickyFooter}>
            <Button title="Cancel" intent="cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Save Purchase" intent="save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
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
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} /></TouchableOpacity>
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

            {purchase.payment_screenshot ? (
  <View style={styles.detailBillSection}>
    <Text style={styles.sectionTitle}>Purchase Bill Photo</Text>
    <Image
      source={{ uri: purchase.payment_screenshot }}
      style={styles.detailBillImage}
    />
  </View>
) : null}
<View style={styles.detailSummary}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Subtotal</Text><Text style={styles.detailValueBold}>{formatRs(purchase.subtotal)}</Text></View>
              {purchase.discount > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Discount</Text><Text style={[styles.detailValueBold, { color: MD3Colors.error }]}>- {formatRs(purchase.discount)}</Text></View>}
              {purchase.transport_charges > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Transport</Text><Text style={styles.detailValueBold}>{formatRs(purchase.transport_charges)}</Text></View>}
              {purchase.other_charges > 0 && <View style={styles.detailRow}><Text style={styles.detailLabel}>Other</Text><Text style={styles.detailValueBold}>{formatRs(purchase.other_charges)}</Text></View>}
              <LinearGradient colors={[MD3Colors.accent, '#00695C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.detailGrandTotal}>
                <Text style={styles.detailGrandTotalLabel}>GRAND TOTAL</Text>
                <Text style={styles.detailGrandTotalValue}>{formatRs(purchase.grand_total)}</Text>
              </LinearGradient>
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
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, marginBottom: MD3Spacing.md, ...MD3Elevation.level2, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: MD3Spacing.md },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: MD3Colors.accentContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  cardAmount: { fontFamily: 'Roboto-Bold', fontSize: 17, color: MD3Colors.accent, marginTop: 2 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm + 2, gap: 6 },
  actionDivider: { width: 1, backgroundColor: MD3Colors.outlineVariant, marginVertical: MD3Spacing.xs },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  detailBillSection: {
  marginTop: MD3Spacing.md,
  marginBottom: MD3Spacing.md,
},
detailBillImage: {
  width: '100%',
  height: 220,
  borderRadius: MD3Radius.lg,
  resizeMode: 'contain',
  backgroundColor: MD3Colors.surfaceVariant,
},
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xxl, borderTopRightRadius: MD3Radius.xxl, maxHeight: '95%', ...MD3Elevation.level5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderBottomWidth: 1.5, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs, fontWeight: '600' },
  chipScroll: { flexDirection: 'row', marginBottom: MD3Spacing.sm },
  supplierChip: { paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.sm + 2, borderRadius: MD3Radius.full, borderWidth: 2, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface, marginRight: MD3Spacing.sm, ...MD3Elevation.level1 },
  supplierChipSelected: { backgroundColor: MD3Colors.accent, borderColor: MD3Colors.accent },
  supplierChipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  supplierChipTextSelected: { color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 2, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  chipTextSelected: { color: MD3Colors.onPrimary },
  rowInputs: { flexDirection: 'row' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.md },
  searchInput: { flex: 1, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: MD3Spacing.sm },
  addBtn: { padding: MD3Spacing.xs },
  lineItemCard: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, borderWidth: 1, borderColor: MD3Colors.outlineVariant },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MD3Spacing.sm },
  lineItemTitle: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  productPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, marginBottom: MD3Spacing.sm, backgroundColor: MD3Colors.surface },
  productPickerText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface, flex: 1 },
  productPickerPlaceholder: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.outline, flex: 1 },
  productDropdown: { borderWidth: 1, borderColor: MD3Colors.outlineVariant, borderRadius: MD3Radius.md, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.sm, overflow: 'hidden' },
  productOption: { paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.md, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  productOptionName: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurface },
  productOptionMeta: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.xs, marginBottom: MD3Spacing.sm },
  miniChip: { paddingHorizontal: MD3Spacing.sm, paddingVertical: 4, borderRadius: MD3Radius.sm, borderWidth: 1, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  miniChipSelected: { backgroundColor: MD3Colors.tertiary, borderColor: MD3Colors.tertiary },
  miniChipText: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  miniChipTextSelected: { color: MD3Colors.onPrimary },
  lineItemInputs: { flexDirection: 'row', gap: MD3Spacing.sm, alignItems: 'flex-end' },
  inputGroup: { flex: 1 },
  inputLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  lineInput: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface, backgroundColor: MD3Colors.surface },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitChip: { width: 32, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: MD3Colors.outline, justifyContent: 'center', alignItems: 'center', backgroundColor: MD3Colors.surface },
  unitChipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  unitChipText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  unitChipTextSelected: { color: MD3Colors.onPrimary },
  lineTotalText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.accent, paddingVertical: 8 },
  summaryCard: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginTop: MD3Spacing.sm, borderWidth: 1, borderColor: MD3Colors.outlineVariant },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MD3Spacing.xs },
  summaryLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  summaryValue: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm + 2, marginVertical: MD3Spacing.sm },
  grandTotalLabel: { fontFamily: 'Roboto-Bold', fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  grandTotalValue: { fontFamily: 'Roboto-Bold', fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
  balanceDueRow: { backgroundColor: MD3Colors.errorContainer, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm },
  billPickerBtn: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderStyle: 'dashed', borderRadius: MD3Radius.md, backgroundColor: MD3Colors.surface, marginBottom: MD3Spacing.xs, overflow: 'hidden' },
  billImage: { width: '100%', height: 160, resizeMode: 'cover' },
  billPlaceholder: { height: 80, justifyContent: 'center', alignItems: 'center' },
  billPickerText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  billRemove: { alignSelf: 'flex-start', padding: MD3Spacing.xs, marginBottom: MD3Spacing.sm },
  billRemoveText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
  paymentCard: { backgroundColor: MD3Colors.accentContainer, borderRadius: MD3Radius.lg, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, borderWidth: 1, borderColor: MD3Colors.outlineVariant },
  proofRow: { flexDirection: 'row', gap: MD3Spacing.sm, alignItems: 'center', marginTop: MD3Spacing.xs, flexWrap: 'wrap' },
  proofAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, backgroundColor: MD3Colors.surface },
  proofAddText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary, fontWeight: '600' },
  proofThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: MD3Colors.surface, borderWidth: 1, borderColor: MD3Colors.outline, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderTopWidth: 1.5, borderTopColor: MD3Colors.outlineVariant, gap: MD3Spacing.sm },
  modalStickyFooter: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderTopWidth: 1.5, borderTopColor: MD3Colors.outlineVariant, gap: MD3Spacing.sm, backgroundColor: MD3Colors.surface, position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24, ...MD3Elevation.level3 },
  hintText: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, textAlign: 'center', padding: MD3Spacing.xl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: MD3Spacing.sm, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  detailLabel: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  detailValue: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurface },
  detailValueBold: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginTop: MD3Spacing.md, marginBottom: MD3Spacing.sm },
  detailItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.sm, marginBottom: MD3Spacing.xs },
  detailItemName: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface },
  detailItemMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  detailItemTotal: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.accent },
  detailSummary: { marginTop: MD3Spacing.md, backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.lg, padding: MD3Spacing.md },
  detailGrandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: MD3Radius.md, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm + 2, marginVertical: MD3Spacing.sm },
  detailGrandTotalLabel: { fontFamily: 'Roboto-Bold', fontSize: 14, color: '#FFFFFF' },
  detailGrandTotalValue: { fontFamily: 'Roboto-Bold', fontSize: 20, color: '#FFFFFF' },
  detailNote: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: MD3Spacing.md, fontStyle: 'italic' },
  proofBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: MD3Colors.primaryContainer, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  proofBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 11, color: MD3Colors.primary },
});
