import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pickImage as pickImagePersistent, takePhoto as takePhotoPersistent } from '@/lib/imagePicker';
import { addDailyCustomerEntry, deductProductStock, getAllProducts, getDailyCustomerEntryById, updateDailyCustomerEntry } from '@/lib/db/repo';
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
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productQuantity, setProductQuantity] = useState('1');
  const heartScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    getAllProducts().then(setProducts).catch(console.error);
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

  const bill = Number(billAmount) || 0;
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

  const saveEntry = async () => {
  if (!customerName.trim()) {
    Alert.alert('Validation', 'Customer Name is required');
    return;
  }

  try {
    if (selectedProduct && !editingId) {
      const qty = Number(productQuantity) || 0;
      const availableStock = Number(selectedProduct.total_stock) || 0;

      if (qty <= 0) {
        Alert.alert('Validation', 'Quantity 1 ya usse zyada honi chahiye');
        return;
      }

      if (availableStock < qty) {
        Alert.alert(
          'Insufficient Stock',
          `Available stock: ${availableStock}`
        );
        return;
      }

      await deductProductStock(
        selectedProduct.id,
        null,
        qty
      );
    }

    await addDailyCustomerEntry({
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
    });

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => {
                setSelectedProduct(product);
                const qty = Number(productQuantity) || 1;
                setBillAmount(String((product.sale_price || 0) * qty));
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                marginRight: 8,
                backgroundColor: selectedProduct?.id === product.id ? '#2563EB' : '#EEF2FF',
              }}
            >
              <Text style={{ color: selectedProduct?.id === product.id ? '#FFFFFF' : '#111827', fontWeight: '600' }}>
                {product.name}
              </Text>
              <Text style={{ color: selectedProduct?.id === product.id ? '#FFFFFF' : '#4B5563', marginTop: 2 }}>
                ₹{Number(product.sale_price || 0).toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedProduct && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={productQuantity}
              onChangeText={(value) => {
                setProductQuantity(value);
                const qty = Number(value) || 0;
                setBillAmount(String((selectedProduct.sale_price || 0) * qty));
              }}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '700', color: '#111827' }}>
              Sale Price: ₹{Number(selectedProduct.sale_price || 0).toFixed(2)} × {Number(productQuantity) || 0}
            </Text>

            <Text style={{ marginTop: 6, fontSize: 14, fontWeight: '600', color: '#2563EB' }}>
              Available Stock: {Number(selectedProduct.total_stock || 0)}
            </Text>
          </View>
        )}
        <Text style={styles.label}>Payment Mode</Text>

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
