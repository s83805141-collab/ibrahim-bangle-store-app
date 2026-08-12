import React, { useState } from 'react';
import { addDailyCustomerEntry } from '@/lib/db/repo';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';

export default function DailyCustomerEntryScreen() {
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const bill = Number(billAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const balance = Math.max(0, bill - paid);

  const saveEntry = async () => {
  if (!customerName.trim()) {
    Alert.alert('Validation', 'Customer Name is required');
    return;
  }

  try {
    await addDailyCustomerEntry({
      customer_name: customerName.trim(),
      mobile: mobile.trim(),
      bill_no: billNo.trim(),
      bill_amount: bill,
      paid_amount: paid,
      balance_amount: balance,
      payment_mode: 'Cash',
      payment_status: balance > 0 ? 'Pending' : 'Paid',
      bill_photo: '',
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

        <Pressable
          style={styles.saveButton}
          onPress={saveEntry}
        >
          <Text style={styles.saveText}>
            Save Entry
          </Text>
        </Pressable>
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

  saveButton: {
    marginTop: 20,
    height: 50,
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
