import { SirenButtons } from "../components/SirenButtons";
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Truck, Pencil, Trash2, X, Phone, MapPin, ChevronRight, Camera } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { pickImage } from '@/lib/imagePicker';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getAllSuppliersFull, addSupplier, updateSupplier, deleteSupplier, SupplierWithStats } from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader, FAB, StatusBadge } from '@/components/ui';

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<SupplierWithStats | null>(null);

  const load = useCallback(async () => {
    try { setSuppliers(await getAllSuppliersFull()); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (s: SupplierWithStats) => {
    Alert.alert('Delete Supplier', `Delete "${s.name}"? This will also delete all related purchases and ledger entries.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSupplier(s.id); load(); } },
    ]);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`} />
      <FlatList
        data={suppliers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 140 }}
        ListEmptyComponent={<EmptyState icon={<Truck size={48} color={MD3Colors.outline} />} title="No suppliers yet" subtitle="Tap + to add your first supplier" />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(250).delay(index * 50)}>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => router.push({ pathname: '/supplier-profile', params: { id: String(item.id) } })}
              >
                <View style={styles.cardIconWrap}><Truck size={22} color={MD3Colors.secondary} strokeWidth={2.2} /></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <View style={styles.contactRow}>
                    {item.phone ? <View style={styles.contactItem}><Phone size={12} color={MD3Colors.onSurfaceVariant} /><Text style={styles.contactText}>{item.phone}</Text></View> : null}
                    {item.city ? <View style={styles.contactItem}><MapPin size={12} color={MD3Colors.onSurfaceVariant} /><Text style={styles.contactText}>{item.city}</Text></View> : null}
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}><Text style={styles.statLabel}>Purchased</Text><Text style={styles.statValue}>{formatRs(item.total_purchase)}</Text></View>
                    <View style={styles.statChip}><Text style={styles.statLabel}>Paid</Text><Text style={[styles.statValue, { color: MD3Colors.success }]}>{formatRs(item.total_paid)}</Text></View>
                    {item.remaining_balance > 0 ? (
                      <StatusBadge label={`Due ${formatRs(item.remaining_balance)}`} color={MD3Colors.error} bg={MD3Colors.errorContainer} />
                    ) : <StatusBadge label="Settled" color={MD3Colors.success} bg={MD3Colors.successContainer} />}
                  </View>
                </View>
                <ChevronRight size={20} color={MD3Colors.outline} strokeWidth={2.2} />
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditing(item); setModalVisible(true); }}>
                  <Pencil size={16} color={MD3Colors.onSurfaceVariant} /><Text style={styles.actionText}>Edit</Text>
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

      <FAB onPress={() => { setEditing(null); setModalVisible(true); }} intent="add" icon={Plus} />

      <SupplierFormModal
        visible={modalVisible}
        supplier={editing}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        onSaved={() => { setModalVisible(false); setEditing(null); load(); }}
      />
    </View>
  );
}

function SupplierFormModal({ visible, supplier, onClose, onSaved }: { visible: boolean; supplier: SupplierWithStats | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Active');
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (supplier) {
        setName(supplier.name); setPhone(supplier.phone || ''); setWhatsapp(supplier.whatsapp || '');
        setEmail(supplier.email || ''); setAddress(supplier.address || ''); setCity(supplier.city || '');
        setState(supplier.state || ''); setGstNumber(supplier.gst_number || '');
        setOpeningBalance(String(supplier.opening_balance || 0)); setNotes(supplier.notes || '');
        setStatus(supplier.status || 'Active'); setPhoto(supplier.photo || '');
      } else {
        setName(''); setPhone(''); setWhatsapp(''); setEmail(''); setAddress(''); setCity(''); setState('');
        setGstNumber(''); setOpeningBalance(''); setNotes(''); setStatus('Active'); setPhoto('');
      }
      setError('');
    }
  }, [visible, supplier]);

  const pickPhoto = async () => {
    const uri = await pickImage({ quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (!uri) { setError('Permission required to access photos'); return; }
    setPhoto(uri);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Supplier name is required'); return; }
    setSaving(true);
    try {
      const data = {
        name: name.trim(), phone: phone.trim(), whatsapp: whatsapp.trim(), email: email.trim(),
        address: address.trim(), city: city.trim(), state: state.trim(), gst_number: gstNumber.trim(),
        opening_balance: parseFloat(openingBalance) || 0, notes: notes.trim(), status, photo,
      };
      if (supplier) { await updateSupplier(supplier.id, data); } else { await addSupplier(data); }
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{supplier ? 'Edit Supplier' : 'Add Supplier'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 180 }}>
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
              {photo ? <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto('')}><Text style={styles.photoRemoveText}>Remove</Text></TouchableOpacity> : null}
            </View>
            <Input label="Supplier Name *" value={name} onChangeText={setName} placeholder="e.g. Ali Bangle Works" />
            <View style={styles.rowInputs}>
              <Input label="Mobile Number" value={phone} onChangeText={setPhone} placeholder="03xx-xxxxxxx" keyboardType="phone-pad" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="WhatsApp Number" value={whatsapp} onChangeText={setWhatsapp} placeholder="03xx-xxxxxxx" keyboardType="phone-pad" style={{ flex: 1 }} />
            </View>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="supplier@example.com" />
            <Input label="Address" value={address} onChangeText={setAddress} placeholder="Street, area" multiline />
            <View style={styles.rowInputs}>
              <Input label="City" value={city} onChangeText={setCity} placeholder="e.g. Karachi" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="State" value={state} onChangeText={setState} placeholder="e.g. Sindh" style={{ flex: 1 }} />
            </View>
            <Input label="GST Number (Optional)" value={gstNumber} onChangeText={setGstNumber} placeholder="GSTIN" />
            <Input label="Opening Balance (Rs)" value={openingBalance} onChangeText={setOpeningBalance} placeholder="0" keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Supplier Status</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, status === 'Active' && styles.chipSelected]} onPress={() => setStatus('Active')}>
                <Text style={[styles.chipText, status === 'Active' && styles.chipTextSelected]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, status === 'Inactive' && styles.chipSelected]} onPress={() => setStatus('Inactive')}>
                <Text style={[styles.chipText, status === 'Inactive' && styles.chipTextSelected]}>Inactive</Text>
              </TouchableOpacity>
            </View>
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Additional notes" multiline />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <SirenButtons onCancel={onClose} onSave={handleSave} cancelText="Cancel" saveText={supplier ? "Update" : "Save"} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.lg, marginBottom: MD3Spacing.md, ...MD3Elevation.level2, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: MD3Spacing.md },
  cardIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: MD3Colors.secondaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 4 },
  contactRow: { flexDirection: 'row', gap: MD3Spacing.md, marginBottom: 6 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  statsRow: { flexDirection: 'row', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  statChip: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 4 },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onSurface },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm + 2, gap: 6 },
  actionDivider: { width: 1, backgroundColor: MD3Colors.outlineVariant, marginVertical: MD3Spacing.xs },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xxl, borderTopRightRadius: MD3Radius.xxl, maxHeight: '92%', ...MD3Elevation.level5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderBottomWidth: 1.5, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: MD3Spacing.lg },
  rowInputs: { flexDirection: 'row' },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 2, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  chipTextSelected: { color: MD3Colors.onPrimary },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderTopWidth: 1.5, borderTopColor: MD3Colors.outlineVariant, gap: MD3Spacing.sm },
  modalStickyFooter: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, paddingVertical: MD3Spacing.md, borderTopWidth: 1.5, borderTopColor: MD3Colors.outlineVariant, gap: MD3Spacing.sm, backgroundColor: MD3Colors.surface, position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24, ...MD3Elevation.level3 },
  photoWrap: { alignItems: 'center', marginBottom: MD3Spacing.md },
  photoBtn: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2, borderColor: MD3Colors.outlineVariant },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: MD3Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  photoText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  photoRemove: { marginTop: MD3Spacing.xs, padding: MD3Spacing.xs },
  photoRemoveText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
});
