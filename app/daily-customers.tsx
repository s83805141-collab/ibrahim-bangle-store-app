import { useState } from 'react';
import { addDailyCustomer } from "../lib/dailyCustomers";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

export default function DailyCustomersScreen() {
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const saveEntry = async () => {
  try {
    await addDailyCustomer({
      customer_name: customerName,
      mobile,
      bill_no: billNo,
      bill_amount: Number(billAmount) || 0,
      paid_amount: Number(paidAmount) || 0,
    });

    Alert.alert("Success", "Entry Save Ho Gayi");

    setCustomerName("");
    setMobile("");
    setBillNo("");
    setBillAmount("");
    setPaidAmount("");
  } catch (e) {
    console.log(e);
    Alert.alert("Error", "Entry Save Nahi Hui");
  }
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Daily Customer Entry</Text>

      <TextInput
        style={styles.input}
        placeholder="Customer Name"
        value={customerName}
        onChangeText={setCustomerName}
      />

      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
      />

      <TextInput
        style={styles.input}
        placeholder="Bill Number"
        value={billNo}
        onChangeText={setBillNo}
      />

      <TextInput
        style={styles.input}
        placeholder="Bill Amount"
        keyboardType="numeric"
        value={billAmount}
        onChangeText={setBillAmount}
      />

      <TextInput
        style={styles.input}
        placeholder="Paid Amount"
        keyboardType="numeric"
        value={paidAmount}
        onChangeText={setPaidAmount}
      />

      <TouchableOpacity
  style={styles.button}
  onPress={saveEntry}
>
  <Text style={styles.buttonText}>Save Entry</Text>
</TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
