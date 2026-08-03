import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader, Input, Button, Card } from '@/components/ui';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getDb } from '@/lib/db/database';
import { getDailyCustomerEntries } from '@/lib/db/repo';

type EntryRow = {
  id?: number;
  customer_name: string;
  mobile: string;
  bill_no: string;
  bill_amount: number;
  paid_amount: number;
  balance_amount?: number;
  payment_mode?: string;
  payment_status?: string;
  bill_photo?: string;
  payment_photo?: string;
  notes?: string;
  created_at?: number;
  updated_at?: number;
};

export default function DailyCustomerEntryScreen() {
  const empty: EntryRow = {
    customer_name: '',
    mobile: '',
    bill_no: '',
    bill_amount: 0,
    paid_amount: 0,
    payment_mode: 'Cash',
    payment_status: 'Pending',
    bill_photo: '',
    payment_photo: '',
    notes: '',
  };

  const [form, setForm] = useState<EntryRow>(empty);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<EntryRow | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'We need access to your photos to pick images.');
        }
      }
      await loadEntries();
    })();
  }, []);

  async function loadEntries() {
    try {
      const rows = await getDailyCustomerEntries();
      setEntries(rows as EntryRow[]);
    } catch (error) {
      console.error('loadEntries', error);
      Alert.alert('Error', 'Unable to load entries');
    }
  }

  function setField<K extends keyof EntryRow>(key: K, value: EntryRow[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const bill = Number(form.bill_amount) || 0;
    const paid = Number(form.paid_amount) || 0;
    const balance = bill - paid;
    setForm(prev => ({ ...prev, balance_amount: balance }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bill_amount, form.paid_amount]);

  async function pickImage(forField: 'bill_photo' | 'payment_photo') {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      // compatibility with older/newer API
      // @ts-ignore
      const cancelled = res.cancelled ?? (Array.isArray((res as any).assets) ? false : false);
      // new API returns assets array
      if ((res as any).assets && (res as any).assets.length > 0) {
        // @ts-ignore
        setField(forField, (res as any).assets[0].uri);
      } else if (!cancelled && (res as any).uri) {
        // @ts-ignore
        setField(forField, (res as any).uri);
      }
    } catch (error) {
      console.error('pickImage', error);
      Alert.alert('Error', 'Image pick failed');
    }
  }

  async function saveEntry() {
    if (!form.customer_name || form.customer_name.trim().length === 0) {
      Alert.alert('Validation', 'Customer Name is required');
      return;
    }
    setLoading(true);
    try {
      const db = await getDb();
      const now = Date.now();
      const billAmount = Number(form.bill_amount) || 0;
      const paidAmount = Number(form.paid_amount) || 0;
      const balance = billAmount - paidAmount;

      if (editingId) {
        await db.exec(
          `UPDATE daily_customer_entries SET
            customer_name = ?,
            mobile = ?,
            bill_no = ?,
            bill_amount = ?,
            paid_amount = ?,
            balance_amount = ?,
            payment_mode = ?,
            payment_status = ?,
            bill_photo = ?,
            payment_photo = ?,
            notes = ?,
            updated_at = ?
          WHERE id = ?`,
          [
            form.customer_name,
            form.mobile || '',
            form.bill_no || '',
            billAmount,
            paidAmount,
            balance,
            form.payment_mode || 'Cash',
            form.payment_status || 'Pending',
            form.bill_photo || '',
            form.payment_photo || '',
            form.notes || '',
            now,
            editingId,
          ]
        );
      } else {
        await db.exec(
          `INSERT INTO daily_customer_entries
          (
            customer_name,
            mobile,
            bill_no,
            bill_amount,
            paid_amount,
            balance_amount,
            payment_mode,
            payment_status,
            bill_photo,
            payment_photo,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            form.customer_name,
            form.mobile || '',
            form.bill_no || '',
            billAmount,
            paidAmount,
            balance,
            form.payment_mode || 'Cash',
            form.payment_status || 'Pending',
            form.bill_photo || '',
            form.payment_photo || '',
            form.notes || '',
            now,
            now,
          ]
        );
      }

      Alert.alert('', 'Entry Save Ho Gayi');
      setForm(empty);
      setEditingId(null);
      await loadEntries();
    } catch (error) {
      console.error('saveEntry', error);
      Alert.alert('Error', 'Unable to save entry');
    } finally {
      setLoading(false);
    }
  }

  function onEdit(item: EntryRow) {
    setEditingId(item.id ?? null);
    // populate form with existing entry data
    setForm({
      customer_name: item.customer_name || '',
      mobile: item.mobile || '',
      bill_no: item.bill_no || '',
      bill_amount: item.bill_amount ?? 0,
      paid_amount: item.paid_amount ?? 0,
      balance_amount: item.balance_amount ?? (item.bill_amount ?? 0) - (item.paid_amount ?? 0),
      payment_mode: item.payment_mode || 'Cash',
      payment_status: item.payment_status || 'Pending',
      bill_photo: item.bill_photo || '',
      payment_photo: item.payment_photo || '',
      notes: item.notes || '',
    });
    // scroll to top if needed (the form is at top)
  }

  async function onDelete(item: EntryRow) {
    Alert.alert('Confirm', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDb();
            await db.exec('DELETE FROM daily_customer_entries WHERE id = ?', [item.id]);
            await loadEntries();
          } catch (error) {
            console.error('delete', error);
            Alert.alert('Error', 'Unable to delete entry');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 120 }}>
      <ScreenHeader title="Daily Customer Entry" subtitle="Record bills & payments" />

      <Card style={{ marginBottom: MD3Spacing.md }}>
        <Input
          label="Customer Name"
          value={form.customer_name}
          onChangeText={(t) => setField('customer_name', t)}
          placeholder="Enter customer name"
        />
        <Input
          label="Mobile Number"
          value={form.mobile}
          onChangeText={(t) => setField('mobile', t)}
          placeholder="Mobile number"
          keyboardType="phone-pad"
        />
        <Input
          label="Bill Number"
          value={form.bill_no}
          onChangeText={(t) => setField('bill_no', t)}
          placeholder="Bill number"
        />
        <Input
          label="Bill Amount"
          value={String(form.bill_amount ?? '')}
          onChangeText={(t) => setField('bill_amount', Number(t) || 0)}
          placeholder="0"
          keyboardType="numeric"
        />
        <Input
          label="Paid Amount"
          value={String(form.paid_amount ?? '')}
          onChangeText={(t) => setField('paid_amount', Number(t) || 0)}
          placeholder="0"
          keyboardType="numeric"
        />

        <View style={{ marginBottom: MD3Spacing.md }}>
          <Text style={styles.label}>Balance Amount</Text>
          <Text style={styles.balance}>{Number(form.balance_amount ?? 0).toFixed(2)}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: MD3Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabelSmall}>Payment Mode</Text>
            <TouchableOpacity
              onPress={() => {
                const next = form.payment_mode === 'Cash' ? 'UPI' : form.payment_mode === 'UPI' ? 'Card' : 'Cash';
                setField('payment_mode', next);
              }}
              style={styles.pill}
            >
              <Text style={styles.pillText}>{form.payment_mode}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabelSmall}>Payment Status</Text>
            <TouchableOpacity
              onPress={() => {
                const next = form.payment_status === 'Pending' ? 'Paid' : form.payment_status === 'Paid' ? 'Partial' : 'Pending';
                setField('payment_status', next);
              }}
              style={styles.pill}
            >
              <Text style={styles.pillText}>{form.payment_status}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          label="Notes"
          value={form.notes || ''}
          onChangeText={(t) => setField('notes', t)}
          placeholder="Optional notes"
          multiline
        />

        <View style={{ flexDirection: 'row', gap: MD3Spacing.md, marginTop: MD3Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabelSmall}>Bill Photo</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('bill_photo')}>
              <Text style={{ color: MD3Colors.primary }}>Pick Bill Image</Text>
            </TouchableOpacity>
            {form.bill_photo ? <Image source={{ uri: form.bill_photo }} style={styles.preview} /> : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabelSmall}>Payment Photo</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('payment_photo')}>
              <Text style={{ color: MD3Colors.primary }}>Pick Payment Image</Text>
            </TouchableOpacity>
            {form.payment_photo ? <Image source={{ uri: form.payment_photo }} style={styles.preview} /> : null}
          </View>
        </View>

        <View style={{ marginTop: MD3Spacing.md }}>
          <Button title={editingId ? 'Update' : 'Save'} onPress={saveEntry} loading={loading} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Saved Entries</Text>

      {entries.map((e) => (
        <Card key={String(e.id)} style={{ marginBottom: MD3Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>{e.customer_name}</Text>
              <Text style={styles.entrySub}>{e.bill_no} • ₹{(e.bill_amount ?? 0).toFixed(2)} • Paid ₹{(e.paid_amount ?? 0).toFixed(2)}</Text>
              <Text style={styles.entrySubSmall}>{new Date(e.created_at ?? 0).toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setViewing(e)}>
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(e)}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(e)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ))}

      <Modal visible={!!viewing} animationType="slide" onRequestClose={() => setViewing(null)}>
        <ScrollView style={[styles.container, { padding: MD3Spacing.lg }]}>
          <TouchableOpacity onPress={() => setViewing(null)}>
            <Text style={{ color: MD3Colors.primary, marginBottom: MD3Spacing.md }}>Close</Text>
          </TouchableOpacity>
          {viewing ? (
            <>
              <Text style={styles.entryViewTitle}>{viewing.customer_name}</Text>
              <Text style={styles.entrySub}>{viewing.mobile}</Text>
              <Text style={styles.entrySub}>Bill: {viewing.bill_no}</Text>
              <Text style={styles.entrySub}>Bill Amount: ₹{(viewing.bill_amount ?? 0).toFixed(2)}</Text>
              <Text style={styles.entrySub}>Paid: ₹{(viewing.paid_amount ?? 0).toFixed(2)}</Text>
              <Text style={styles.entrySub}>Balance: ₹{(viewing.balance_amount ?? 0).toFixed(2)}</Text>
              <Text style={[styles.entrySub, { marginTop: MD3Spacing.sm }]}>Payment Mode: {viewing.payment_mode}</Text>
              <Text style={styles.entrySub}>Payment Status: {viewing.payment_status}</Text>
              <Text style={[styles.entrySub, { marginTop: MD3Spacing.sm }]}>Notes</Text>
              <Text style={styles.notes}>{viewing.notes}</Text>

              <View style={{ flexDirection: 'row', gap: MD3Spacing.md, marginTop: MD3Spacing.md }}>
                {viewing.bill_photo ? <Image source={{ uri: viewing.bill_photo }} style={styles.viewImage} /> : null}
                {viewing.payment_photo ? <Image source={{ uri: viewing.payment_photo }} style={styles.viewImage} /> : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  label: { fontFamily: 'Roboto-Medium', color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs },
  balance: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  inputLabelSmall: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 6 },
  pill: { borderRadius: MD3Radius.full, borderWidth: 1, borderColor: MD3Colors.outline, padding: 10, alignItems: 'center', backgroundColor: MD3Colors.surface },
  pillText: { fontFamily: 'Roboto-Medium', color: MD3Colors.onSurface },
  imageButton: { padding: 10, borderRadius: MD3Radius.sm, borderWidth: 1.2, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface, alignItems: 'center' },
  preview: { width: '100%', height: 110, marginTop: MD3Spacing.sm, borderRadius: MD3Radius.sm },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface, marginBottom: MD3Spacing.sm },
  entryTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface },
  entrySub: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  entrySubSmall: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: MD3Colors.surfaceVariant, borderRadius: 8, marginLeft: 8 },
  actionText: { fontFamily: 'Roboto-Medium', color: MD3Colors.onSurface },
  deleteBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: MD3Colors.errorContainer, borderRadius: 8, marginLeft: 8 },
  deleteText: { fontFamily: 'Roboto-Medium', color: MD3Colors.error },
  entryViewTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  notes: { fontFamily: 'Roboto-Regular', color: MD3Colors.onSurfaceVariant, marginTop: 6 },
  viewImage: { width: 160, height: 160, borderRadius: MD3Radius.sm },
});
