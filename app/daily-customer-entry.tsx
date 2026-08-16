import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pickImage as pickImagePersistent, takePhoto as takePhotoPersistent } from '@/lib/imagePicker';
import {
    addDailyCustomerEntry,
    addDailyCustomerPayment,
    deleteDailyCustomerPayment,
    deductProductStock,
    getAllProducts,
    getDailyCustomerEntryById,
    getDailyCustomerPayments,
    updateDailyCustomerEntry,
} from '@/lib/db/repo';
import {
  Animated, View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';

export default function DailyCustomerEntryScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const editingId = editId ? Number(editId) : null;
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [billPhoto, setBillPhoto] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentModeReceive, setPaymentModeReceive] = useState<'Cash'>('Cash');
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [dailyPayments, setDailyPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productLoadError, setProductLoadError] = useState('');

  type DailyCustomerLineItem = {
    productId: number | null;
    variantId: number | null;
    productName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
  };

  const [lineItems, setLineItems] = useState<DailyCustomerLineItem[]>([
    {
      productId: null,
      variantId: null,
      productName: '',
      quantity: '1',
      unit: 'Piece',
      unitPrice: '',
    },
  ]);
  const heartScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    getAllProducts()
      .then((data) => {
        console.log('DAILY CUSTOMER PRODUCTS:', data);
        setProducts(data || []);
                setProductLoadError('');
      })
      .catch((error) => {
        console.error('DAILY CUSTOMER PRODUCTS ERROR:', error);
                setProducts([]);
                setProductLoadError(String(error?.message || error));
      });
  }, []);

  useEffect(() => {
    if (!editingId) return;

    getDailyCustomerEntryById(editingId)
      .then((entry) => {
        if (!entry) return;

        setCustomerName(entry.customer_name || '');
        setMobile(entry.mobile || '');
        setBillNo(entry.bill_no || '');
        setBillAmount(String(entry.bill_amount ?? ''));
        setPaidAmount(String(entry.paid_amount ?? ''));
        setPaymentMode(entry.payment_mode || 'Cash');
        setBillPhoto(entry.bill_photo || '');
      })
      .catch(console.error);
  }, [editingId]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [heartScale]);

  const updateLineItem = (
  index: number,
  field: keyof DailyCustomerLineItem,
  value: any
) => {
  setLineItems(prev =>
    prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
  );
};

const addLineItem = () => {
  setLineItems(prev => [
    ...prev,
    {
      productId: null,
      variantId: null,
      productName: '',
      quantity: '',
      unit: 'Piece',
      unitPrice: '',
    },
  ]);
};

const removeLineItem = (index: number) => {
  setLineItems(prev => {
    if (prev.length === 1) return prev;
    return prev.filter((_, i) => i !== index);
  });
};

const lineTotal = (item: DailyCustomerLineItem) =>
  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

const bill = lineItems.reduce(
  (sum, item) => sum + lineTotal(item),
  0
);

const paid = Number(paidAmount) || 0;
const balance = Math.max(0, bill - paid);
  const entryDate = new Date().toLocaleString('en-IN');

  const sendCustomerDetails = async (type: 'whatsapp' | 'sms') => {
    if (!mobile.trim()) {
      Alert.alert('Mobile Number', 'Customer ka mobile number enter karein');
      return;
    }

    const message =
      `Ibrahim Bangle Store\n` +
      `Customer: ${customerName.trim() || '-'}\n` +
      `Bill No: ${billNo.trim() || '-'}\n` +
      `Bill Amount: ₹${bill.toFixed(2)}\n` +
      `Paid: ₹${paid.toFixed(2)}\n` +
      `Balance: ₹${balance.toFixed(2)}\n` +
      `Payment Mode: ${paymentMode}`;

    try {
      if (type === 'whatsapp') {
        const phone = mobile.replace(/\\D/g, '');
        const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
        await Linking.openURL(url);
      } else {
        const url = `sms:${mobile.replace(/\\D/g, '')}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Send details failed:', error);
      Alert.alert(
        'Unable to open',
        type === 'whatsapp'
          ? 'WhatsApp open nahi ho saka'
          : 'SMS app open nahi ho saka'
      );
    }
  };


const sendRemainingBalanceOnWhatsApp = async () => {
  if (!mobile.trim()) {
    Alert.alert('Mobile Number', 'Customer ka mobile number enter karein.');
    return;
  }

  const remainingBalance = Math.max(
    Number(billAmount) - Number(paidAmount),
    0
  );

  if (remainingBalance <= 0) {
    Alert.alert(
      'No Balance',
      'Customer ka koi remaining balance nahi hai.'
    );
    return;
  }

  const message =
    'Ibrahim Bangle Store\n\n' +
    `Dear ${customerName.trim() || '-'},\n\n` +
    `Bill No: ${billNo.trim() || '-'}\n` +
    `Remaining Balance: ₹${remainingBalance.toFixed(2)}\n\n` +
    'Kripya pending amount clear kar dein.\n\n' +
    'Thank you.';

  try {
    const phone = mobile.replace(/\D/g, '');
    const url =
      `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;

    await Linking.openURL(url);
  } catch (error) {
    console.error('Remaining balance WhatsApp failed:', error);
    Alert.alert('Error', 'WhatsApp open nahi ho saka.');
  }
};

const receivePayment = async () => {
    if (!editingId) {
        Alert.alert('Save Entry', 'Pehle customer entry save karein.');
        return;
    }

    const amount = Number(paymentAmount) || 0;
    const currentBalance = Math.max(
        Number(billAmount) - Number(paidAmount),
        0
    );

    if (amount <= 0) {
        Alert.alert('Validation', 'Payment amount enter karein.');
        return;
    }

    if (amount > currentBalance) {
        Alert.alert(
            'Validation',
            `Maximum payment ₹${currentBalance.toFixed(2)} ho sakti hai.`
        );
        return;
    }

    try {
        setPaymentSaving(true);

        await addDailyCustomerPayment({
            daily_customer_entry_id: editingId,
            amount,
            payment_mode: paymentModeReceive,
            payment_date: Date.now(),
            payment_time: new Date().toLocaleTimeString('en-IN'),
            transaction_number: '',
            payment_photo: '',
            note: '',
        });

        const updated = await getDailyCustomerEntryById(editingId);
        if (updated) {
            setPaidAmount(String(updated.paid_amount ?? 0));
        }

        const payments = await getDailyCustomerPayments(editingId);
        setDailyPayments(payments || []);
        setPaymentAmount('');

        Alert.alert(
            'Payment Received',
            `₹${amount.toFixed(2)} payment save ho gayi.`
        );
    } catch (error) {
        console.error('Receive payment failed:', error);
        Alert.alert('Error', 'Payment save nahi hui.');
    } finally {
        setPaymentSaving(false);
    }
};

const deletePayment = (paymentId: number) => {
    Alert.alert(
        'Delete Payment',
        'Kya aap ye payment delete karna chahte hain?',
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDailyCustomerPayment(paymentId);

                        if (editingId) {
                            const updated = await getDailyCustomerEntryById(editingId);
                            if (updated) {
                                setPaidAmount(String(updated.paid_amount ?? 0));
                            }

                            const payments =
                                await getDailyCustomerPayments(editingId);

                            setDailyPayments(payments || []);
                        }
                    } catch (error) {
                        console.error('Delete payment failed:', error);
                        Alert.alert('Error', 'Payment delete nahi hui.');
                    }
                },
            },
        ]
    );
};

const saveEntry = async () => {
  if (!customerName.trim()) {
    Alert.alert('Validation', 'Customer Name is required');
    return;
  }

  try {
    const validItems = lineItems.filter(
      item => item.productId && Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      Alert.alert(
        'Validation',
        'Kam se kam ek product aur quantity add karein'
      );
      return;
    }

    if (!editingId) {
      for (const item of validItems) {
        const product = products.find(p => p.id === item.productId);
        const qty = Number(item.quantity) || 0;
        const availableStock = Number(product?.total_stock) || 0;

        if (qty <= 0) {
          Alert.alert(
            'Validation',
            'Quantity 1 ya usse zyada honi chahiye'
          );
          return;
        }

        if (availableStock < qty) {
          Alert.alert(
            'Insufficient Stock',
            `${item.productName}
Available stock: ${availableStock}`
          );
          return;
        }
      }

      for (const item of validItems) {
        await deductProductStock(
          item.productId!,
          item.variantId,
          Number(item.quantity)
        );
      }
    }

    const items = validItems.map(item => ({
      product_id: item.productId!,
      variant_id: item.variantId,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Piece',
      unit_price: Number(item.unitPrice) || 0,
      total: lineTotal(item),
    }));

    await addDailyCustomerEntry(
      {
        customer_name: customerName.trim(),
        mobile: mobile.trim(),
        bill_no: billNo.trim(),
        bill_amount: bill,
        paid_amount: paid,
        balance_amount: balance,
        payment_mode: paymentMode,
        payment_status: balance > 0 ? 'Pending' : 'Paid',
        bill_photo: billPhoto,
        payment_photo: '',
        notes: '',
      },
      items
    );

    Alert.alert(
      'Success',
      `Customer: ${customerName}\nBalance: ₹${balance.toFixed(2)}`
    );
  } catch (error) {
    console.error('Daily customer save failed:', error);
    Alert.alert('Error', 'Entry save nahi hui');
  }
};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Daily Customer</Text>

      <Text style={styles.subtitle}>
        Record daily customer bills
      </Text>
      <Pressable
        onPress={() => router.push('/daily-customer-history')}
        style={styles.historyButton}
      >
        <Text style={styles.historyButtonText}>📋 Customer History</Text>
      </Pressable>


      <View style={styles.card}>
        <Text style={styles.label}>Customer Name *</Text>

        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Enter customer name"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Mobile</Text>

        <TextInput
          style={styles.input}
          value={mobile}
          onChangeText={setMobile}
          placeholder="Enter mobile number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Bill No.</Text>

        <TextInput
          style={styles.input}
          value={billNo}
          onChangeText={setBillNo}
          placeholder="Enter bill number"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Bill Amount</Text>

        <TextInput
          style={styles.input}
          value={billAmount}
          onChangeText={setBillAmount}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Select Product</Text>

      {productLoadError ? (
        <View style={{ padding: 10, marginBottom: 8, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
          <Text style={{ color: '#B91C1C', fontWeight: '600' }}>
            Product loading error:
          </Text>
          <Text style={{ color: '#B91C1C', marginTop: 4 }}>
            {productLoadError}
          </Text>
        </View>
      ) : products.length === 0 ? (
        <View style={{ padding: 10, marginBottom: 8, borderRadius: 8, backgroundColor: '#FEF3C7' }}>
          <Text style={{ color: '#92400E', fontWeight: '600' }}>
            Koi product nahi mila
          </Text>
          <Text style={{ color: '#92400E', marginTop: 4 }}>
            Total products loaded: 0
          </Text>
        </View>
      ) : (
        <Text style={{ marginBottom: 8, color: '#166534', fontWeight: '600' }}>
          Total products: {products.length}
        </Text>
      )}

      {lineItems.map((item, index) => (
        <View
          key={index}
          style={{
            marginBottom: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 12,
            backgroundColor: '#F9FAFB',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
              Product {index + 1}
            </Text>

            {lineItems.length > 1 && (
              <Pressable onPress={() => removeLineItem(index)}>
                <Text style={{ color: '#DC2626', fontWeight: '700' }}>
                  Delete
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {products.map((product) => {
              const selected = item.productId === product.id;

              return (
                <Pressable
                  key={product.id}
                  onPress={() => {
                    updateLineItem(index, 'productId', product.id);
                    updateLineItem(index, 'variantId', null);
                    updateLineItem(index, 'productName', product.name);
                    updateLineItem(
                      index,
                      'unitPrice',
                      String(product.sale_price || 0)
                    );
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    marginRight: 8,
                    backgroundColor: selected ? '#2563EB' : '#EEF2FF',
                  }}
                >
                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : '#111827',
                      fontWeight: '600',
                    }}
                  >
                    {product.name}
                  </Text>

                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : '#4B5563',
                      marginTop: 2,
                    }}
                  >
                    ₹{Number(product.sale_price || 0).toFixed(2)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {item.productId && (
            <View>
              <Text style={styles.label}>Quantity</Text>

              <TextInput
                style={styles.input}
                value={item.quantity}
                onChangeText={(value) =>
                  updateLineItem(index, 'quantity', value)
                }
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Unit</Text>

              <TextInput
                style={styles.input}
                value={item.unit}
                onChangeText={(value) =>
                  updateLineItem(index, 'unit', value)
                }
                placeholder="Piece"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Price</Text>

              <TextInput
                style={styles.input}
                value={item.unitPrice}
                onChangeText={(value) =>
                  updateLineItem(index, 'unitPrice', value)
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />

              <Text
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#111827',
                }}
              >
                Total: ₹{lineTotal(item).toFixed(2)}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#2563EB',
                }}
              >
                Available Stock:{' '}
                {Number(
                  products.find(p => p.id === item.productId)?.total_stock || 0
                )}
              </Text>
            </View>
          )}
        </View>
      ))}

      <Pressable
        onPress={addLineItem}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: '#EEF2FF',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#2563EB', fontWeight: '700' }}>
          + Add Product
        </Text>
      </Pressable>

      <Text style={styles.label}>Bill Amount</Text>

      <TextInput
        style={styles.input}
        value={bill.toFixed(2)}
        editable={false}
        placeholder="0"
        placeholderTextColor="#9CA3AF"
      />

    <Text style={styles.label}>Payment Mode</Text>
                {editingId && (
                    <View
                        style={{
                            marginTop: 18,
                            padding: 16,
                            borderRadius: 14,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}
                    >
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: '#111827',
                            marginBottom: 12,
                        }}>
                            Receive Payment
                        </Text>

                        <Text style={styles.label}>Payment Amount</Text>

                        <TextInput
                            style={styles.input}
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: '#6B7280',
                        }}>
                            Current Balance: ₹{Math.max(
                                Number(billAmount) - Number(paidAmount),
                                0
                            ).toFixed(2)}
                        </Text>

                        <Text style={styles.label}>Receive Payment Mode</Text>

                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                            {['Cash', 'UPI', 'Bank'].map((mode) => (
                                <Pressable
                                    key={mode}
                                    onPress={() =>
                                        setPaymentModeReceive(mode as 'Cash')
                                    }
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 9,
                                        borderRadius: 10,
                                        marginRight: 8,
                                        backgroundColor:
                                            paymentModeReceive === mode
                                                ? '#16A34A'
                                                : '#E5E7EB',
                                    }}
                                >
                                    <Text style={{
                                        color:
                                            paymentModeReceive === mode
                                                ? '#FFFFFF'
                                                : '#111827',
                                        fontWeight: '600',
                                    }}>
                                        {mode}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            onPress={receivePayment}
                            disabled={paymentSaving}
                            style={{
                                paddingVertical: 13,
                                borderRadius: 10,
                                alignItems: 'center',
                                backgroundColor: paymentSaving
                                    ? '#9CA3AF'
                                    : '#16A34A',
                            }}
                        >
                            <Text style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: '700',
                            }}>
                                {paymentSaving ? 'Saving...' : 'Receive Payment'}
                            </Text>
                        </Pressable>

                        {dailyPayments.length > 0 && (
                            <View style={{ marginTop: 18 }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: '#111827',
                                    marginBottom: 10,
                                }}>
                                    Payment History
                                </Text>

                                {dailyPayments.map((payment) => (
                                    <View
                                        key={payment.id}
                                        style={{
                                            padding: 12,
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            backgroundColor: '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB',
                                        }}
                                    >
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <View>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontWeight: '700',
                                                    color: '#111827',
                                                }}>
                                                    ₹{Number(payment.amount || 0).toFixed(2)}
                                                </Text>

                                                <Text style={{
                                                    marginTop: 3,
                                                    fontSize: 13,
                                                    color: '#6B7280',
                                                }}>
                                                    {payment.payment_mode || 'Cash'} • {payment.payment_time || ''}
                                                </Text>
                                            </View>

                                            <Pressable
                                                onPress={() =>
                                                    deletePayment(Number(payment.id))
                                                }
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                    borderRadius: 8,
                                                    backgroundColor: '#FEE2E2',
                                                }}
                                            >
                                                <Text style={{
                                                    color: '#DC2626',
                                                    fontWeight: '700',
                                                }}>
                                                    Delete
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {['Cash', 'UPI', 'Bank'].map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setPaymentMode(mode)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              marginRight: 8,
              backgroundColor:
                paymentMode === mode ? '#2563EB' : '#EEF6FF',
            }}
          >
            <Text
              style={{
                color:
                  paymentMode === mode ? '#FFFFFF' : '#111827',
                fontWeight: '600',
              }}
            >
              {mode}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Bill Photo</Text>

      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Pressable
          onPress={async () => {
            const uri = await pickImagePersistent({ quality: 0.7 });
            if (uri) setBillPhoto(uri);
          }}
          style={styles.photoButton}
        >
          <Text style={styles.photoButtonText}>📁 Gallery</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            const uri = await takePhotoPersistent({ quality: 0.7 });
            if (uri) setBillPhoto(uri);
          }}
          style={styles.photoButton}
        >
          <Text style={styles.photoButtonText}>📷 Camera</Text>
        </Pressable>
      </View>

      {billPhoto ? (
        <Text style={styles.photoSelected}>✓ Bill photo selected</Text>
      ) : null}

      <Text style={styles.label}>Date & Time</Text>

      <Text style={styles.dateTimeText}>{entryDate}</Text>

      <Text style={styles.label}>Paid Amount</Text>

        <TextInput
          style={styles.input}
          value={paidAmount}
          onChangeText={setPaidAmount}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Balance</Text>

          <Text style={styles.balanceValue}>
            ₹{balance.toFixed(2)}
          </Text>
        </View>

        <View style={styles.shareRow}>
        <Pressable
          style={styles.whatsappButton}
          onPress={() => sendCustomerDetails('whatsapp')}
        >
          <Text style={styles.shareButtonText}>💬 WhatsApp</Text>
        </Pressable>

        <Pressable
          style={styles.smsButton}
          onPress={() => sendCustomerDetails('sms')}
        >
          <Text style={styles.shareButtonText}>📱 SMS</Text>
        </Pressable>
      </View>

      {balance > 0 ? (
    <Pressable
      style={styles.remainingBalanceWhatsappButton}
      onPress={sendRemainingBalanceOnWhatsApp}
    >
      <Text style={styles.remainingBalanceWhatsappText}>
        Send Remaining Balance on WhatsApp
      </Text>
    </Pressable>
  ) : null}

  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        <Pressable
          style={styles.saveButton}
          onPress={saveEntry}
        >
          <Text style={styles.saveText}>
            {editingId ? 'Update Entry' : 'Save Entry'}
          </Text>
        </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  balanceBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EEF6FF',
  },

  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },

  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },

  photoButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EEF6FF',
    marginRight: 8,
  },

  photoButtonText: {
    color: '#111827',
    fontWeight: '600',
  },

  photoSelected: {
    color: '#16A34A',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },

  dateTimeText: {
    fontSize: 15,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
  },

  shareRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },

  whatsappButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
  },

  smsButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },

  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  remainingBalanceWhatsappButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
  },

  remainingBalanceWhatsappText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  historyButton: {
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#EEF6FF',
    alignItems: 'center',
  },

  historyButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },

  saveButton: {
    marginTop: 20,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
