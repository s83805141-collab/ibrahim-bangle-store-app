import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2, Pencil, X, Landmark, Wallet, Smartphone, CreditCard } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getAllBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, BankAccount } from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

const ACCOUNT_TYPES = ['Cash', 'Bank', 'UPI', 'Card'] as const;

function getAccountIcon(type: string) {
  if (type === 'Cash') return Wallet;
  if (type === 'UPI') return Smartphone;
  if (type === 'Card') return CreditCard;
  return Landmark;
}

function getAccountColor(type: string) {
  if (type === 'Cash') return MD3Colors.success;
  if (type === 'UPI') return MD3Colors.tertiary;
  if (type === 'Card') return MD3Colors.error;
  return MD3Colors.primary;
}

function getAccountBg(type: string) {
  if (type === 'Cash') return MD3Colors.successContainer;
  if (type === 'UPI') return MD3Colors.tertiaryContainer;
  if (type === 'Card') return MD3Colors.errorContainer;
  return MD3Colors.primaryContainer;
}

export default function BankAccountsScreen() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts(await getAllBankAccounts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (a: BankAccount) => {
    Alert.alert('Delete Account', `Delete "${a.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBankAccount(a.id!); load(); } },
    ]);
  };

  const formatRs = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bank Accounts" subtitle={`${accounts.length} accounts`} />
      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<Landmark size={48} color={MD3Colors.outline} />} title="No bank accounts" subtitle="Add accounts like Cash, SBI, HDFC, PhonePe" />}
        renderItem={({ item }) => {
          const Icon = getAccountIcon(item.type);
          const color = getAccountColor(item.type);
          const bg = getAccountBg(item.type);
          return (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <View style={[styles.cardIcon, { backgroundColor: bg }]}><Icon size={22} color={color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardType}>{item.type}{item.bank_name ? ` · ${item.bank_name}` : ''}</Text>
                  {item.account_number ? <Text style={styles.cardMeta}>A/C: {item.account_number}</Text> : null}
                  {item.upi_id ? <Text style={styles.cardMeta}>UPI: {item.upi_id}</Text> : null}
                  <Text style={styles.cardBalance}>Opening: {formatRs(item.opening_balance)}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditing(item); setModalVisible(true); }}>
                  <Pencil size={16} color={MD3Colors.primary} /><Text style={[styles.actionText, { color: MD3Colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Trash2 size={16} color={MD3Colors.error} /><Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(null); setModalVisible(true); }}>
        <Plus size={28} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <AccountFormModal
        visible={modalVisible}
        account={editing}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        onSaved={() => { setModalVisible(false); setEditing(null); load(); }}
      />
    </View>
  );
}

function AccountFormModal({ visible, account, onClose, onSaved }: { visible: boolean; account: BankAccount | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Cash');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (account) {
        setName(account.name); setType(account.type || 'Cash'); setBankName(account.bank_name || '');
        setAccountName(account.account_name || ''); setAccountNumber(account.account_number || '');
        setUpiId(account.upi_id || ''); setOpeningBalance(String(account.opening_balance || ''));
        setNotes(account.notes || '');
      } else {
        setName(''); setType('Cash'); setBankName(''); setAccountName(''); setAccountNumber('');
        setUpiId(''); setOpeningBalance(''); setNotes('');
      }
      setError('');
    }
  }, [visible, account]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Account name is required'); return; }
    setSaving(true);
    try {
      const data: BankAccount = {
        name: name.trim(), type, bank_name: bankName.trim(), account_name: accountName.trim(),
        account_number: accountNumber.trim(), upi_id: upiId.trim(),
        opening_balance: parseFloat(openingBalance) || 0, notes: notes.trim(),
      };
      if (account) {
        await updateBankAccount(account.id!, data);
      } else {
        await addBankAccount(data);
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
            <Text style={styles.modalTitle}>{account ? 'Edit Account' : 'Add Bank Account'}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Input label="Account Name *" value={name} onChangeText={setName} placeholder="e.g. SBI Current" />
            <Text style={styles.fieldLabel}>Account Type</Text>
            <View style={styles.chipRow}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipSelected]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, type === t && styles.chipTextSelected]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {(type === 'Bank' || type === 'Card') && (
              <View style={styles.rowInputs}>
                <Input label="Bank Name" value={bankName} onChangeText={setBankName} placeholder="e.g. SBI" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
                <Input label="Account Name" value={accountName} onChangeText={setAccountName} placeholder="Account holder" style={{ flex: 1 }} />
              </View>
            )}
            {(type === 'Bank' || type === 'Card') && (
              <Input label="Account Number" value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" />
            )}
            {type === 'UPI' && (
              <Input label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="e.g. name@upi" />
            )}
            <Input label="Opening Balance (Rs)" value={openingBalance} onChangeText={setOpeningBalance} keyboardType="numeric" placeholder="0" />
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title={account ? 'Update' : 'Add Account'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  card: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', padding: MD3Spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  cardName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardType: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  cardMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  cardBalance: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurface, marginTop: 2 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm, gap: 6 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  rowInputs: { flexDirection: 'row' },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
});
