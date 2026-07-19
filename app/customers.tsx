import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Users, Pencil, Trash2, X, Phone, MessageCircle, MapPin, BookOpen, Wallet, Camera, UserCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllCustomersFull, addCustomer, updateCustomer, deleteCustomer,
  CustomerWithStats, Customer,
} from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CustomerWithStats | null>(null);

  const load = useCallback(async () => {
    try {
      setCustomers(await getAllCustomersFull());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (c: CustomerWithStats) => {
    Alert.alert('Delete Customer', `Delete "${c.name}" and all related sales/ledger?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomer(c.id); load(); } },
    ]);
  };

  const openAdd = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (c: CustomerWithStats) => { setEditing(c); setModalVisible(true); };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customers" subtitle={`${customers.length} customers`} />
      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<Users size={48} color={MD3Colors.outline} />} title="No customers yet" subtitle="Tap + to add a customer" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => router.push({ pathname: '/customer-ledger', params: { customerId: String(item.id) } })}
            >
              <View style={styles.cardIconWrap}><Users size={20} color={MD3Colors.error} /></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.phone || 'No phone'}{item.city ? ` · ${item.city}` : ''}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>Purchased: </Text>
                  <Text style={styles.statValue}>{formatRs(item.total_purchase)}</Text>
                  {item.outstanding_balance > 0 ? (
                    <Text style={styles.statDue}> · Due: {formatRs(item.outstanding_balance)}</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/customer-ledger', params: { customerId: String(item.id) } })}>
                <BookOpen size={16} color={MD3Colors.primary} /><Text style={[styles.actionText, { color: MD3Colors.primary }]}>Ledger</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                <Pencil size={16} color={MD3Colors.onSurfaceVariant} /><Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Trash2 size={16} color={MD3Colors.error} /><Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Plus size={28} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <CustomerFormModal
        visible={modalVisible}
        editing={editing}
        onClose={() => setModalVisible(false)}
        onSaved={() => { setModalVisible(false); load(); }}
      />
    </View>
  );
}

function CustomerFormModal({ visible, editing, onClose, onSaved }: { visible: boolean; editing: CustomerWithStats | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (editing) {
        setName(editing.name);
        setPhone(editing.phone || '');
        setWhatsapp(editing.whatsapp || '');
        setAddress(editing.address || '');
        setCity(editing.city || '');
        setState(editing.state || '');
        setOpeningBalance(String(editing.opening_balance || ''));
        setNotes(editing.notes || '');
        setStatus((editing.status as 'Active' | 'Inactive') || 'Active');
        setPhoto(editing.photo || '');
      } else {
        setName(''); setPhone(''); setWhatsapp(''); setAddress(''); setCity(''); setState('');
        setOpeningBalance(''); setNotes(''); setStatus('Active'); setPhoto('');
      }
      setError('');
    }
  }, [visible, editing]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Permission required to access photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    try {
      const customer: Customer = {
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        opening_balance: parseFloat(openingBalance) || 0,
        notes: notes.trim(),
        status,
        photo,
      };
      if (editing) {
        await updateCustomer(editing.id, customer);
      } else {
        await addCustomer(customer);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Customer' : 'Add Customer'}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.photoWrap}>
              <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={28} color={MD3Colors.onSurfaceVariant} />
                    <Text style={styles.photoText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photo ? (
                <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto('')}>
                  <Text style={styles.photoRemoveText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Input label="Customer Name *" value={name} onChangeText={setName} placeholder="Required" />
            <View style={styles.rowInputs}>
              <Input label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="WhatsApp Number" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="WhatsApp" style={{ flex: 1 }} />
            </View>
            <Input label="Address" value={address} onChangeText={setAddress} placeholder="Street address" multiline />
            <View style={styles.rowInputs}>
              <Input label="City" value={city} onChangeText={setCity} placeholder="City" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="State" value={state} onChangeText={setState} placeholder="State" style={{ flex: 1 }} />
            </View>
            <Input label="Opening Balance (Rs)" value={openingBalance} onChangeText={setOpeningBalance} keyboardType="numeric" placeholder="0" />
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.chipRow}>
              {(['Active', 'Inactive'] as const).map(s => (
                <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipSelected]} onPress={() => setStatus(s)}>
                  <Text style={[styles.chipText, status === s && styles.chipTextSelected]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title={editing ? 'Update' : 'Add Customer'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: MD3Spacing.md },
  cardIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.errorContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  statValue: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurface },
  statDue: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm, gap: 6 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  rowInputs: { flexDirection: 'row' },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipRow: { flexDirection: 'row', marginBottom: MD3Spacing.md },
  chip: { paddingVertical: MD3Spacing.sm, paddingHorizontal: MD3Spacing.lg, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, marginRight: MD3Spacing.sm, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  photoWrap: { alignItems: 'center', marginBottom: MD3Spacing.md },
  photoBtn: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2, borderColor: MD3Colors.outlineVariant },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  photoText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  photoRemove: { marginTop: MD3Spacing.xs, padding: MD3Spacing.xs },
  photoRemoveText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
});
