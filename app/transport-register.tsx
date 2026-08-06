import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Truck,
  Phone,
  Calendar,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  Pencil,
  Trash2,
  Search,
  Clock,
  Wallet,
  ScrollText,
  TrendingUp,
  Maximize2,
} from 'lucide-react-native';
import { ScreenHeader, Input, Button, EmptyState } from '@/components/ui';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  TransportReceipt,
  TransportReceiptInput,
  insertTransportReceipt,
  updateTransportReceipt,
  deleteTransportReceipt,
  getAllTransportReceipts,
  searchTransportReceipts,
  getTotalTransportExpenses,
} from '@/lib/db/transport';

const SCREEN_WIDTH = Dimensions.get('window').width;

function todayTimestamp(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateInput(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(s: string): number {
  const parts = s.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d).getTime();
    }
  }
  return todayTimestamp();
}

const emptyForm: TransportReceiptInput = {
  driver_name: '',
  mobile_number: '',
  transport_date: todayTimestamp(),
  amount: 0,
  receipt_image: '',
};

function triggerHaptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function TransportRegisterScreen() {
  const [form, setForm] = useState<TransportReceiptInput>(emptyForm);
  const [receipts, setReceipts] = useState<TransportReceipt[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [viewing, setViewing] = useState<TransportReceipt | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [dateText, setDateText] = useState(formatDateInput(todayTimestamp()));

  const loadData = useCallback(async () => {
    try {
      const [rows, total] = await Promise.all([
        getAllTransportReceipts(),
        getTotalTransportExpenses(),
      ]);
      setReceipts(rows);
      setTotalExpenses(total);
    } catch (error) {
      console.error('loadData', error);
      Alert.alert('Error', 'Unable to load transport receipts');
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'We need access to your photos to pick receipt images.');
        }
      }
      await loadData();
    })();
  }, [loadData]);

  function setField<K extends keyof TransportReceiptInput>(key: K, value: TransportReceiptInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function pickImage(source: 'camera' | 'gallery') {
    try {
      let res: any;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Camera access is needed to take photos.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
      }
      if ((res as any).assets && (res as any).assets.length > 0) {
        setField('receipt_image', (res as any).assets[0].uri);
        triggerHaptic();
      }
    } catch (error) {
      console.error('pickImage', error);
      Alert.alert('Error', 'Image capture failed');
  }
  }

  async function handleSave() {
    if (!form.driver_name || form.driver_name.trim().length === 0) {
      Alert.alert('Validation', 'Driver Name is required');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      Alert.alert('Validation', 'Paid Amount is required and must be greater than 0');
      return;
    }
    const saveData = {
  ...form,
  transport_date: parseDateInput(dateText),
};
    setLoading(true);
    try {
      if (editingId) {
        await updateTransportReceipt(editingId, saveData);
        Alert.alert('Updated', 'Receipt updated successfully');
      } else {
        await insertTransportReceipt(saveData);
        Alert.alert('Saved', 'Transport receipt saved successfully');
      }
      setForm(emptyForm);
setDateText(formatDateInput(todayTimestamp()));
setEditingId(null);
await loadData();
    } catch (error) {
      console.error('handleSave', error);
      Alert.alert('Error', 'Unable to save receipt');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(item: TransportReceipt) {
    setEditingId(item.id);
    setForm({
      driver_name: item.driver_name,
      mobile_number: item.mobile_number,
      transport_date: item.transport_date,
      amount: item.amount,
      receipt_image: item.receipt_image,
    });
    setDateText(formatDateInput(item.transport_date));
    triggerHaptic();
  }

  function handleCancelEdit() {
  setForm(emptyForm);
  setDateText(formatDateInput(todayTimestamp()));
  setEditingId(null);
  }

  function handleDelete(item: TransportReceipt) {
    Alert.alert(
      'Confirm Delete',
      `Delete receipt for ${item.driver_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransportReceipt(item.id);
              await loadData();
              Alert.alert('Deleted', 'Receipt deleted');
            } catch (error) {
              console.error('delete', error);
              Alert.alert('Error', 'Unable to delete receipt');
            }
          },
        },
      ]
    );
  }

  async function handleSearch(text: string) {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setSearching(false);
      await loadData();
      return;
    }
    setSearching(true);
    try {
      const results = await searchTransportReceipts(text.trim());
      setReceipts(results);
    } catch (error) {
      console.error('search', error);
    }
  }
  


  const fmt = (n: number) => '\u20B9' + (Number(n) || 0).toFixed(2);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Transport Register" subtitle="Save transport payment receipts" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== TOTAL EXPENSE CARD ===== */}
          <Animated.View entering={FadeInDown.duration(300).delay(0)}>
            <View style={styles.totalCard}>
              <View style={styles.totalIconWrap}>
                <TrendingUp size={24} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>Total Transport Expenses</Text>
                <Text style={styles.totalValue}>{fmt(totalExpenses)}</Text>
              </View>
              <View style={styles.totalCountWrap}>
                <Text style={styles.totalCountText}>{receipts.length}</Text>
                <Text style={styles.totalCountLabel}>receipts</Text>
              </View>
            </View>
          </Animated.View>

          {/* ===== SEARCH BAR ===== */}
          <View style={styles.searchWrap}>
            <Search size={18} color={MD3Colors.outline} strokeWidth={2.2} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by driver name or mobile..."
              placeholderTextColor={MD3Colors.outline}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.searchClear}>
                <X size={16} color={MD3Colors.outline} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ===== FORM CARD ===== */}
          <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: MD3Spacing.md }}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={[styles.formIconWrap, editingId ? { backgroundColor: MD3Colors.secondaryContainer } : null]}>
                  {editingId ? (
                    <Pencil size={24} color={MD3Colors.onSecondaryContainer} strokeWidth={2.2} />
                  ) : (
                    <Truck size={24} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formTitle}>{editingId ? 'Edit Receipt' : 'New Receipt'}</Text>
                  <Text style={styles.formSubtitle}>
                    {editingId ? `Editing #${editingId}` : 'Fill transport payment details'}
                  </Text>
                </View>
                {editingId ? (
                  <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                    <X size={18} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Input
                label="Driver Name *"
                value={form.driver_name}
                onChangeText={(t) => setField('driver_name', t)}
                placeholder="Enter driver name"
              />

              <Input
                label="Mobile Number"
                value={form.mobile_number}
                onChangeText={(t) => setField('mobile_number', t)}
                placeholder="Mobile number"
                keyboardType="phone-pad"
              />

              <View style={styles.dateWrap}>
                <Calendar size={18} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MD3Colors.outline}
                value={dateText}
                onChangeText={setDateText}
                />
                <Text style={styles.dateDisplay}>  {formatDate(parseDateInput(dateText))}</Text>
              </View>

              <Input
                label="Paid Amount *"
                value={String(form.amount || '')}
                onChangeText={(t) => setField('amount', Number(t) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />

              {/* Receipt Image Picker */}
              <Text style={styles.fieldLabel}>Receipt Screenshot</Text>
              {form.receipt_image ? (
                <View style={styles.imagePreviewWrap}>
                  <TouchableOpacity onPress={() => setFullScreenImage(form.receipt_image)}>
                    <Image source={{ uri: form.receipt_image }} style={styles.imagePreview} />
                    <View style={styles.imagePreviewOverlay}>
                      <Maximize2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setField('receipt_image', '')} style={styles.removeBtn}>
                    <X size={12} color={MD3Colors.error} strokeWidth={2.4} />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerRow}>
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('camera')}>
                    <Camera size={22} color={MD3Colors.primary} strokeWidth={2.2} />
                    <Text style={styles.imagePickerText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('gallery')}>
                    <ImageIcon size={22} color={MD3Colors.tertiary} strokeWidth={2.2} />
                    <Text style={styles.imagePickerText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Save / Update buttons */}
              <View style={styles.formActions}>
                {editingId ? (
                  <>
                    <Button
                      title="Cancel"
                      intent="cancel"
                      variant="outlined"
                      onPress={handleCancelEdit}
                      style={{ flex: 1, marginRight: MD3Spacing.sm }}
                    />
                    <Button
                      title="Update"
                      intent="update"
                      onPress={handleSave}
                      loading={loading}
                      style={{ flex: 1 }}
                    />
                  </>
                ) : (
                  <Button
                    title="Save Receipt"
                    intent="save"
                    onPress={handleSave}
                    loading={loading}
                    fullWidth
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* ===== RECEIPTS LIST ===== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searching ? 'Search Results' : 'All Receipts'}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{receipts.length}</Text>
            </View>
          </View>

          {receipts.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={48} color={MD3Colors.outline} />}
              title={searching ? 'No results found' : 'No receipts yet'}
              subtitle={searching ? 'Try a different search term' : 'Fill the form above to add your first receipt'}
            />
          ) : (
            receipts.map((r, index) => (
              <Animated.View key={String(r.id)} entering={FadeInDown.duration(250).delay(index * 30)}>
                <View style={styles.receiptCard}>
                  <TouchableOpacity
                    style={styles.receiptCardHeader}
                    onPress={() => setViewing(r)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.receiptIconWrap}>
                      <Truck size={20} color={MD3Colors.primary} strokeWidth={2.2} />
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptTitle}>{r.driver_name}</Text>
                      <Text style={styles.receiptMeta}>
                        {r.mobile_number ? `${r.mobile_number}  ·  ` : ''}{formatDate(r.transport_date)}
                      </Text>
                      <View style={styles.receiptStatsRow}>
                        <View style={styles.statChip}>
                          <Wallet size={11} color={MD3Colors.success} strokeWidth={2.2} />
                          <Text style={[styles.statValue, { color: MD3Colors.success }]}>{fmt(r.amount)}</Text>
                        </View>
                        {r.receipt_image ? (
                          <View style={[styles.statChip, { backgroundColor: MD3Colors.tertiaryContainer }]}>
                            <ImageIcon size={11} color={MD3Colors.tertiary} strokeWidth={2.2} />
                            <Text style={[styles.statValue, { color: MD3Colors.tertiary }]}>Receipt</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {r.receipt_image ? (
                      <Image source={{ uri: r.receipt_image }} style={styles.receiptThumb} />
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.receiptCardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setViewing(r)}>
                      <Eye size={15} color={MD3Colors.warning} strokeWidth={2.2} />
                      <Text style={[styles.actionText, { color: MD3Colors.warning }]}>View</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDivider} />
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(r)}>
                      <Pencil size={15} color={MD3Colors.primary} strokeWidth={2.2} />
                      <Text style={[styles.actionText, { color: MD3Colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDivider} />
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(r)}>
                      <Trash2 size={15} color={MD3Colors.error} strokeWidth={2.2} />
                      <Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== VIEW MODAL ===== */}
      <Modal visible={!!viewing} animationType="slide" transparent onRequestClose={() => setViewing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt Details</Text>
              <TouchableOpacity onPress={() => setViewing(null)} style={styles.modalCloseBtn}>
                <X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {viewing ? (
                <>
                  <View style={styles.viewHeader}>
                    <View style={styles.viewIconWrap}>
                      <Truck size={28} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewName}>{viewing.driver_name}</Text>
                      {viewing.mobile_number ? (
                        <View style={styles.viewPhoneRow}>
                          <Phone size={13} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                          <Text style={styles.viewPhoneText}>{viewing.mobile_number}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.viewAmountCard}>
                    <View style={styles.viewAmountRow}>
                      <View style={styles.viewAmountItem}>
                        <Text style={styles.viewAmountLabel}>Paid Amount</Text>
                        <Text style={styles.viewAmountValue}>{fmt(viewing.amount)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.viewDetailCard}>
                    <View style={styles.viewDetailRow}>
                      <Calendar size={18} color={MD3Colors.primary} strokeWidth={2.2} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewDetailLabel}>Transport Date</Text>
                        <Text style={styles.viewDetailValue}>{formatDate(viewing.transport_date)}</Text>
                      </View>
                    </View>
                    <View style={styles.viewDetailDivider} />
                    <View style={styles.viewDetailRow}>
                      <Clock size={18} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewDetailLabel}>Created</Text>
                        <Text style={styles.viewDetailValue}>
                          {new Date(viewing.created_at).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                    {viewing.updated_at !== viewing.created_at ? (
                      <>
                        <View style={styles.viewDetailDivider} />
                        <View style={styles.viewDetailRow}>
                          <Pencil size={18} color={MD3Colors.secondary} strokeWidth={2.2} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.viewDetailLabel}>Last Updated</Text>
                            <Text style={styles.viewDetailValue}>
                              {new Date(viewing.updated_at).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : null}
                  </View>

                  {viewing.receipt_image ? (
                    <View style={styles.viewDetailCard}>
                      <View style={styles.viewDetailRow}>
                        <ImageIcon size={18} color={MD3Colors.warning} strokeWidth={2.2} />
                        <Text style={styles.viewDetailLabel}>Receipt Image</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFullScreenImage(viewing.receipt_image)}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: viewing.receipt_image }} style={styles.viewReceiptImage} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.fullScreenBtn}
                        onPress={() => setFullScreenImage(viewing.receipt_image)}
                      >
                        <Maximize2 size={14} color={MD3Colors.warning} strokeWidth={2.2} />
                        <Text style={[styles.actionText, { color: MD3Colors.warning }]}>View Full Screen</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== FULL SCREEN IMAGE ===== */}
      <Modal visible={!!fullScreenImage} animationType="fade" transparent onRequestClose={() => setFullScreenImage(null)}>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenImage(null)}>
            <X size={26} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
          {fullScreenImage ? (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImg}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  // ===== TOTAL CARD =====
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level3,
  },
  totalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  totalLabel: { fontFamily: 'Roboto-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  totalValue: { fontFamily: 'Roboto-Bold', fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  totalCountWrap: { alignItems: 'center' },
  totalCountText: { fontFamily: 'Roboto-Bold', fontSize: 22, color: '#FFFFFF' },
  totalCountLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  // ===== SEARCH =====
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: 2,
    marginBottom: MD3Spacing.sm,
    borderWidth: 1.5,
    borderColor: MD3Colors.outlineVariant,
    ...MD3Elevation.level1,
  },
  searchIcon: { marginRight: MD3Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: MD3Spacing.sm + 2,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: MD3Colors.onSurface,
  },
  searchClear: { padding: MD3Spacing.xs },
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
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MD3Colors.outline,
    borderRadius: MD3Radius.md,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: MD3Spacing.sm + 4,
    marginBottom: MD3Spacing.md,
    backgroundColor: MD3Colors.surface,
    gap: MD3Spacing.sm,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: MD3Colors.onSurface,
    paddingVertical: 0,
  },
  dateDisplay: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  fieldLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
    color: MD3Colors.onSurfaceVariant,
    marginBottom: MD3Spacing.xs,
    marginTop: MD3Spacing.xs,
    fontWeight: '600',
  },
  imagePickerRow: { flexDirection: 'row', gap: MD3Spacing.md, marginBottom: MD3Spacing.md },
  imagePickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MD3Spacing.md + 4,
    borderRadius: MD3Radius.md,
    borderWidth: 2,
    borderColor: MD3Colors.outlineVariant,
    backgroundColor: MD3Colors.surfaceVariant,
    gap: 6,
  },
  imagePickerText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant, fontWeight: '600' },
  imagePreviewWrap: { marginBottom: MD3Spacing.md },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: MD3Radius.md,
    overflow: 'hidden',
  },
  imagePreviewOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  // ===== RECEIPT CARDS =====
  receiptCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    marginBottom: MD3Spacing.md,
    overflow: 'hidden',
    ...MD3Elevation.level2,
  },
  receiptCardHeader: { flexDirection: 'row', padding: MD3Spacing.md },
  receiptIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
    marginTop: 2,
  },
  receiptInfo: { flex: 1 },
  receiptTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  receiptMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 6 },
  receiptStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
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
  receiptThumb: {
    width: 56,
    height: 56,
    borderRadius: MD3Radius.sm,
    marginLeft: MD3Spacing.sm,
  },
  receiptCardActions: {
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
  viewAmountCard: {
    backgroundColor: '#1565C0',
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level3,
  },
  viewAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  viewAmountItem: { alignItems: 'center' },
  viewAmountLabel: { fontFamily: 'Roboto-Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  viewAmountValue: { fontFamily: 'Roboto-Bold', fontSize: 28, color: '#FFFFFF' },
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
  viewReceiptImage: {
    width: '100%',
    height: 200,
    borderRadius: MD3Radius.md,
    marginTop: MD3Spacing.sm,
  },
  fullScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: MD3Spacing.sm,
    paddingVertical: MD3Spacing.sm,
  },
  // ===== FULL SCREEN IMAGE =====
  fullScreenContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullScreenImg: { width: SCREEN_WIDTH, height: '80%' },
});
