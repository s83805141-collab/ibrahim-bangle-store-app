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
  KeyboardAvoidingView,
} from 'react-native';
import { pickImage as pickImagePersistent, requestPermissions } from '@/lib/imagePicker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  UserPlus,
  Phone,
  Receipt,
  Wallet,
  IndianRupee,
  CheckCircle2,
  Camera,
  X,
  Eye,
  Pencil,
  Trash2,
  FileText,
  CreditCard,
  Clock,
  Image as ImageIcon,
  ScrollText,
} from 'lucide-react-native';
import { ScreenHeader, Input, Button, EmptyState } from '@/components/ui';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { useBottomTabSpacing } from '@/lib/hooks/useSpacing';
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
        const granted = await requestPermissions();
        if (!granted) {
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
      const uri = await pickImagePersistent({ quality: 0.7 });
      if (uri) {
        setField(forField, uri);
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

  const fmt = (n: number) => '₹' + (Number(n) || 0).toFixed(2);
  const paymentModes = ['Cash', 'UPI', 'Card'] as const;
  const paymentStatuses = ['Pending', 'Paid', 'Partial'] as const;

  const statusBadge = (status?: string) => {
    if (status === 'Paid') return { label: 'Paid', color: MD3Colors.success, bg: MD3Colors.successContainer };
    if (status === 'Partial') return { label: 'Partial', color: MD3Colors.warning, bg: MD3Colors.warningContainer };
    return { label: 'Pending', color: MD3Colors.error, bg: MD3Colors.errorContainer };
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily Customer Entry" subtitle="Record bills & payments" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: bottomSpacing + 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== FORM CARD ===== */}
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={[styles.formIconWrap, editingId ? { backgroundColor: MD3Colors.secondaryContainer } : null]}>
                  {editingId ? (
                    <Pencil size={24} color={MD3Colors.onSecondaryContainer} strokeWidth={2.2} />
                  ) : (
                    <UserPlus size={24} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formTitle}>{editingId ? 'Edit Entry' : 'New Entry'}</Text>
                  <Text style={styles.formSubtitle}>
                    {editingId ? `Editing #${editingId}` : 'Fill customer bill & payment details'}
                  </Text>
                </View>
                {editingId ? (
                  <TouchableOpacity
                    onPress={() => { setForm(empty); setEditingId(null); }}
                    style={styles.cancelEditBtn}
                  >
                    <X size={18} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Input
                label="Customer Name *"
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

              <View style={styles.rowInputs}>
                <Input
                  label="Bill Amount"
                  value={String(form.bill_amount ?? '')}
                  onChangeText={(t) => setField('bill_amount', Number(t) || 0)}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: MD3Spacing.sm }}
                />
                <Input
                  label="Paid Amount"
                  value={String(form.paid_amount ?? '')}
                  onChangeText={(t) => setField('paid_amount', Number(t) || 0)}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>

              {/* Balance highlight */}
              <View style={styles.balanceWrap}>
                <View style={styles.balanceLeft}>
                  <Wallet size={20} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                  <Text style={styles.balanceLabel}>Balance Amount</Text>
                </View>
                <Text style={styles.balanceValue}>{fmt(form.balance_amount ?? 0)}</Text>
              </View>

              {/* Payment mode chips */}
              <Text style={styles.fieldLabel}>Payment Mode</Text>
              <View style={styles.chipRow}>
                {paymentModes.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, form.payment_mode === m && styles.chipSelected]}
                    onPress={() => setField('payment_mode', m)}
                  >
                    <Text style={[styles.chipText, form.payment_mode === m && styles.chipTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment status chips */}
              <Text style={styles.fieldLabel}>Payment Status</Text>
              <View style={styles.chipRow}>
                {paymentStatuses.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, form.payment_status === s && chipStatusSelected(s)]}
                    onPress={() => setField('payment_status', s)}
                  >
                    <Text style={[styles.chipText, form.payment_status === s && { color: MD3Colors.onPrimary }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Notes"
                value={form.notes || ''}
                onChangeText={(t) => setField('notes', t)}
                placeholder="Optional notes"
                multiline
              />

              {/* Image pickers */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: MD3Spacing.sm }}>
                  <Text style={styles.fieldLabel}>Bill Photo</Text>
                  <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('bill_photo')}>
                    {form.bill_photo ? (
                      <Image source={{ uri: form.bill_photo }} style={styles.preview} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Camera size={24} color={MD3Colors.onSurfaceVariant} strokeWidth={2} />
                        <Text style={styles.imagePlaceholderText}>Pick Bill Image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {form.bill_photo ? (
                    <TouchableOpacity onPress={() => setField('bill_photo', '')} style={styles.removeBtn}>
                      <X size={12} color={MD3Colors.error} strokeWidth={2.4} />
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Payment Photo</Text>
                  <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('payment_photo')}>
                    {form.payment_photo ? (
                      <Image source={{ uri: form.payment_photo }} style={styles.preview} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Camera size={24} color={MD3Colors.onSurfaceVariant} strokeWidth={2} />
                        <Text style={styles.imagePlaceholderText}>Pick Payment Image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {form.payment_photo ? (
                    <TouchableOpacity onPress={() => setField('payment_photo', '')} style={styles.removeBtn}>
                      <X size={12} color={MD3Colors.error} strokeWidth={2.4} />
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Save / Update buttons */}
              <View style={styles.formActions}>
                {editingId ? (
                  <>
                    <Button
                      title="Cancel"
                      intent="cancel"
                      variant="outlined"
                      onPress={() => { setForm(empty); setEditingId(null); }}
                      style={{ flex: 1, marginRight: MD3Spacing.sm }}
                    />
                    <Button
                      title="Update"
                      intent="update"
                      onPress={saveEntry}
                      loading={loading}
                      style={{ flex: 1 }}
                    />
                  </>
                ) : (
                  <Button
                    title="Save Entry"
                    intent="save"
                    onPress={saveEntry}
                    loading={loading}
                    fullWidth
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* ===== SAVED ENTRIES ===== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Entries</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{entries.length}</Text>
            </View>
          </View>

          {entries.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={48} color={MD3Colors.outline} />}
              title="No entries yet"
              subtitle="Fill the form above to add your first entry"
            />
          ) : (
            entries.map((e, index) => {
              const badge = statusBadge(e.payment_status);
              return (
                <Animated.View key={String(e.id)} entering={FadeInDown.duration(250).delay(index * 40)}>
                  <View style={styles.entryCard}>
                    <View style={styles.entryCardHeader}>
                      <View style={styles.entryIconWrap}>
                        <UserPlus size={20} color={MD3Colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryTitle}>{e.customer_name}</Text>
                        <Text style={styles.entryMeta}>
                          {e.bill_no ? `Bill #${e.bill_no}` : 'No bill no'}{e.mobile ? ` · ${e.mobile}` : ''}
                        </Text>
                        <View style={styles.entryStatsRow}>
                          <View style={styles.statChip}>
                            <Receipt size={11} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                            <Text style={styles.statValue}>{fmt(e.bill_amount ?? 0)}</Text>
                          </View>
                          <View style={styles.statChip}>
                            <Wallet size={11} color={MD3Colors.success} strokeWidth={2.2} />
                            <Text style={[styles.statValue, { color: MD3Colors.success }]}>{fmt(e.paid_amount ?? 0)}</Text>
                          </View>
                          {(e.balance_amount ?? 0) > 0 ? (
                            <View style={[styles.statChip, { backgroundColor: MD3Colors.errorContainer }]}>
                              <IndianRupee size={11} color={MD3Colors.error} strokeWidth={2.2} />
                              <Text style={[styles.statValue, { color: MD3Colors.error }]}>{fmt(e.balance_amount ?? 0)}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.entryBadges}>
                        <View style={[styles.statusBadgeSmall, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeSmallText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                        {e.payment_mode ? (
                          <View style={[styles.statusBadgeSmall, { backgroundColor: MD3Colors.secondaryContainer }]}>
                            <Text style={[styles.statusBadgeSmallText, { color: MD3Colors.onSecondaryContainer }]}>{e.payment_mode}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {e.created_at ? (
                      <View style={styles.entryDateRow}>
                        <Clock size={12} color={MD3Colors.outline} strokeWidth={2.2} />
                        <Text style={styles.entryDateText}>{new Date(e.created_at).toLocaleString()}</Text>
                      </View>
                    ) : null}

                    <View style={styles.entryCardActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => setViewing(e)}>
                        <Eye size={15} color={MD3Colors.warning} strokeWidth={2.2} />
                        <Text style={[styles.actionText, { color: MD3Colors.warning }]}>View</Text>
                      </TouchableOpacity>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(e)}>
                        <Pencil size={15} color={MD3Colors.primary} strokeWidth={2.2} />
                        <Text style={[styles.actionText, { color: MD3Colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(e)}>
                        <Trash2 size={15} color={MD3Colors.error} strokeWidth={2.2} />
                        <Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== VIEW MODAL ===== */}
      <Modal visible={!!viewing} animationType="slide" transparent onRequestClose={() => setViewing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entry Details</Text>
              <TouchableOpacity onPress={() => setViewing(null)} style={styles.modalCloseBtn}>
                <X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
              {viewing ? (
                <>
                  {/* Customer header */}
                  <View style={styles.viewHeader}>
                    <View style={styles.viewIconWrap}>
                      <UserPlus size={28} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewName}>{viewing.customer_name}</Text>
                      {viewing.mobile ? (
                        <View style={styles.viewPhoneRow}>
                          <Phone size={13} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                          <Text style={styles.viewPhoneText}>{viewing.mobile}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Status badges */}
                  <View style={styles.viewBadgesRow}>
                    {viewing.payment_status ? (
                      <View style={[styles.viewBadge, { backgroundColor: statusBadge(viewing.payment_status).bg }]}>
                        <Text style={[styles.viewBadgeText, { color: statusBadge(viewing.payment_status).color }]}>
                          {viewing.payment_status}
                        </Text>
                      </View>
                    ) : null}
                    {viewing.payment_mode ? (
                      <View style={[styles.viewBadge, { backgroundColor: MD3Colors.secondaryContainer }]}>
                        <CreditCard size={12} color={MD3Colors.onSecondaryContainer} strokeWidth={2.2} />
                        <Text style={[styles.viewBadgeText, { color: MD3Colors.onSecondaryContainer }]}>{viewing.payment_mode}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Amount gradient card */}
                  <LinearGradient
                    colors={['#1565C0', '#0D47A1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.viewAmountCard}
                  >
                    <View style={styles.viewAmountRow}>
                      <View style={styles.viewAmountItem}>
                        <Text style={styles.viewAmountLabel}>Bill Amount</Text>
                        <Text style={styles.viewAmountValue}>{fmt(viewing.bill_amount ?? 0)}</Text>
                      </View>
                      <View style={styles.viewAmountDivider} />
                      <View style={styles.viewAmountItem}>
                        <Text style={styles.viewAmountLabel}>Paid</Text>
                        <Text style={styles.viewAmountValue}>{fmt(viewing.paid_amount ?? 0)}</Text>
                      </View>
                      <View style={styles.viewAmountDivider} />
                      <View style={styles.viewAmountItem}>
                        <Text style={styles.viewAmountLabel}>Balance</Text>
                        <Text style={styles.viewAmountValue}>{fmt(viewing.balance_amount ?? 0)}</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* Detail rows */}
                  <View style={styles.viewDetailCard}>
                    <View style={styles.viewDetailRow}>
                      <Receipt size={18} color={MD3Colors.primary} strokeWidth={2.2} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewDetailLabel}>Bill Number</Text>
                        <Text style={styles.viewDetailValue}>{viewing.bill_no || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.viewDetailDivider} />
                    <View style={styles.viewDetailRow}>
                      <Clock size={18} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewDetailLabel}>Date</Text>
                        <Text style={styles.viewDetailValue}>
                          {viewing.created_at ? new Date(viewing.created_at).toLocaleString() : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes */}
                  {viewing.notes ? (
                    <View style={styles.viewDetailCard}>
                      <View style={styles.viewDetailRow}>
                        <FileText size={18} color={MD3Colors.tertiary} strokeWidth={2.2} />
                        <Text style={styles.viewDetailLabel}>Notes</Text>
                      </View>
                      <Text style={styles.viewNotesText}>{viewing.notes}</Text>
                    </View>
                  ) : null}

                  {/* Photos */}
                  {(viewing.bill_photo || viewing.payment_photo) ? (
                    <View style={styles.viewDetailCard}>
                      <View style={styles.viewDetailRow}>
                        <ImageIcon size={18} color={MD3Colors.warning} strokeWidth={2.2} />
                        <Text style={styles.viewDetailLabel}>Photos</Text>
                      </View>
                      <View style={styles.viewPhotosRow}>
                        {viewing.bill_photo ? (
                          <View style={styles.viewPhotoWrap}>
                            <Image source={{ uri: viewing.bill_photo }} style={styles.viewPhoto} />
                            <Text style={styles.viewPhotoCaption}>Bill Photo</Text>
                          </View>
                        ) : null}
                        {viewing.payment_photo ? (
                          <View style={styles.viewPhotoWrap}>
                            <Image source={{ uri: viewing.payment_photo }} style={styles.viewPhoto} />
                            <Text style={styles.viewPhotoCaption}>Payment Photo</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  // ===== FORM CARD =====
  formCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.lg,
    ...MD3Elevation.level2,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.lg },
  formIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  formTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface },
  formSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  cancelEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MD3Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInputs: { flexDirection: 'row' },
  balanceWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: MD3Colors.primaryContainer,
    borderRadius: MD3Radius.md,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: MD3Spacing.md,
    marginTop: MD3Spacing.xs,
    marginBottom: MD3Spacing.md,
  },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm },
  balanceLabel: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onPrimaryContainer, fontWeight: '600' },
  balanceValue: { fontFamily: 'Roboto-Bold', fontSize: 22, color: MD3Colors.onPrimaryContainer },
  fieldLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
    color: MD3Colors.onSurfaceVariant,
    marginBottom: MD3Spacing.xs,
    marginTop: MD3Spacing.xs,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', marginBottom: MD3Spacing.md, gap: MD3Spacing.sm },
  chip: {
    paddingVertical: MD3Spacing.sm,
    paddingHorizontal: MD3Spacing.lg,
    borderRadius: MD3Radius.full,
    borderWidth: 2,
    borderColor: MD3Colors.outline,
    backgroundColor: MD3Colors.surface,
  },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  chipTextSelected: { color: MD3Colors.onPrimary },
  // dynamic status chip colors handled inline
  imageButton: {
    borderRadius: MD3Radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: MD3Colors.outlineVariant,
    backgroundColor: MD3Colors.surfaceVariant,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: { width: '100%', height: 90, borderRadius: MD3Radius.md },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.md },
  imagePlaceholderText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 11,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 6,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: MD3Spacing.xs,
    paddingVertical: 4,
  },
  removeBtnText: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.error, fontWeight: '600' },
  formActions: { flexDirection: 'row', marginTop: MD3Spacing.lg },
  // ===== SECTION HEADER =====
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface },
  countBadge: {
    backgroundColor: MD3Colors.primary,
    borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: 2,
    marginLeft: MD3Spacing.sm,
  },
  countBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 12, color: MD3Colors.onPrimary },
  // ===== ENTRY CARDS =====
  entryCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
    overflow: 'hidden',
  },
  entryCardHeader: { flexDirection: 'row', padding: MD3Spacing.md },
  entryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
    marginTop: 2,
  },
  entryInfo: { flex: 1 },
  entryTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  entryMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 6 },
  entryStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MD3Colors.surfaceVariant,
    borderRadius: MD3Radius.sm,
    paddingHorizontal: MD3Spacing.sm,
    paddingVertical: 3,
  },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 11, color: MD3Colors.onSurface },
  entryBadges: { alignItems: 'flex-end', gap: 4 },
  statusBadgeSmall: { borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: 3 },
  statusBadgeSmallText: { fontFamily: 'Roboto-Medium', fontSize: 10, fontWeight: '700' },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: MD3Spacing.md,
    paddingBottom: MD3Spacing.sm,
  },
  entryDateText: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline },
  entryCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: MD3Colors.outlineVariant,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: MD3Spacing.sm + 2,
    gap: 6,
  },
  actionDivider: { width: 1, backgroundColor: MD3Colors.outlineVariant, marginVertical: MD3Spacing.xs },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, fontWeight: '600' },
  // ===== VIEW MODAL =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: MD3Colors.surface,
    borderTopLeftRadius: MD3Radius.xxl,
    borderTopRightRadius: MD3Radius.xxl,
    maxHeight: '93%',
    ...MD3Elevation.level5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MD3Spacing.lg,
    paddingVertical: MD3Spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: MD3Colors.outlineVariant,
  },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MD3Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { padding: MD3Spacing.lg },
  viewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  viewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  viewName: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  viewPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  viewPhoneText: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  viewBadgesRow: { flexDirection: 'row', gap: MD3Spacing.sm, marginBottom: MD3Spacing.md, flexWrap: 'wrap' },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: MD3Radius.sm,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: 5,
  },
  viewBadgeText: { fontFamily: 'Roboto-Medium', fontSize: 12, fontWeight: '700' },
  viewAmountCard: {
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level3,
  },
  viewAmountRow: { flexDirection: 'row', alignItems: 'center' },
  viewAmountItem: { flex: 1, alignItems: 'center' },
  viewAmountLabel: { fontFamily: 'Roboto-Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  viewAmountValue: { fontFamily: 'Roboto-Bold', fontSize: 16, color: '#FFFFFF' },
  viewAmountDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },
  viewDetailCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.md,
    borderWidth: 1.5,
    borderColor: MD3Colors.outlineVariant,
  },
  viewDetailRow: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.md },
  viewDetailLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  viewDetailValue: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, marginTop: 2 },
  viewDetailDivider: { height: 1, backgroundColor: MD3Colors.outlineVariant, marginVertical: MD3Spacing.sm },
  viewNotesText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 13,
    color: MD3Colors.onSurface,
    marginTop: MD3Spacing.sm,
    lineHeight: 20,
  },
  viewPhotosRow: { flexDirection: 'row', gap: MD3Spacing.md, marginTop: MD3Spacing.sm },
  viewPhotoWrap: { alignItems: 'center' },
  viewPhoto: { width: 140, height: 140, borderRadius: MD3Radius.md },
  viewPhotoCaption: {
    fontFamily: 'Roboto-Medium',
    fontSize: 11,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 6,
  },
});

// Helper for dynamic status chip styles — appended after StyleSheet to keep logic clean
function chipStatusSelected(s: string) {
  if (s === 'Paid') return { backgroundColor: MD3Colors.success, borderColor: MD3Colors.success };
  if (s === 'Partial') return { backgroundColor: MD3Colors.warning, borderColor: MD3Colors.warning };
  return { backgroundColor: MD3Colors.error, borderColor: MD3Colors.error };
}
function chipStatusTextSelected(s: string) {
  return { color: MD3Colors.onPrimary };
}
