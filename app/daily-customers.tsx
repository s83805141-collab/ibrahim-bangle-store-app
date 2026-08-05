import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { UserPlus, Phone, Receipt, IndianRupee, Wallet, CheckCircle2, Save } from 'lucide-react-native';
import { addDailyCustomer } from '../lib/db/dailyCustomers';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';
import { Button, Input, ScreenHeader, Card } from '@/components/ui';

export default function DailyCustomersScreen() {
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const balance = (Number(billAmount) || 0) - (Number(paidAmount) || 0);

  const saveEntry = async () => {
    if (!customerName.trim()) {
      Alert.alert('Validation', 'Customer Name is required');
      return;
    }
    setSaving(true);
    try {
      await addDailyCustomer({
        customer_name: customerName,
        mobile,
        bill_no: billNo,
        bill_amount: Number(billAmount) || 0,
        paid_amount: Number(paidAmount) || 0,
      });

      setLastSaved(true);
      Alert.alert('Success', 'Entry Save Ho Gayi');

      setCustomerName('');
      setMobile('');
      setBillNo('');
      setBillAmount('');
      setPaidAmount('');
      setTimeout(() => setLastSaved(false), 2000);
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Entry Save Nahi Hui');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily Customer" subtitle="Quick bill entry" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(300)}>
            <Card style={styles.formCard}>
              {/* Icon header */}
              <View style={styles.formHeader}>
                <View style={styles.formIconWrap}>
                  <UserPlus size={26} color={MD3Colors.onPrimaryContainer} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formTitle}>New Customer Entry</Text>
                  <Text style={styles.formSubtitle}>Record customer bill details</Text>
                </View>
              </View>

              <Input
                label="Customer Name *"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Enter customer name"
              />

              <Input
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="Mobile number"
                keyboardType="phone-pad"
              />

              <Input
                label="Bill Number"
                value={billNo}
                onChangeText={setBillNo}
                placeholder="Bill number"
              />

              <View style={styles.rowInputs}>
                <Input
                  label="Bill Amount"
                  value={billAmount}
                  onChangeText={setBillAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: MD3Spacing.sm }}
                />
                <Input
                  label="Paid Amount"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
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
                <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
              </View>

              {/* Summary chips */}
              {(Number(billAmount) > 0 || Number(paidAmount) > 0) && (
                <Animated.View entering={FadeInDown.duration(250)} style={styles.summaryRow}>
                  <View style={styles.summaryChip}>
                    <Receipt size={14} color={MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                    <Text style={styles.summaryChipText}>Bill ₹{(Number(billAmount) || 0).toFixed(0)}</Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <Wallet size={14} color={MD3Colors.success} strokeWidth={2.2} />
                    <Text style={[styles.summaryChipText, { color: MD3Colors.success }]}>Paid ₹{(Number(paidAmount) || 0).toFixed(0)}</Text>
                  </View>
                  <View style={[styles.summaryChip, balance > 0 && { backgroundColor: MD3Colors.errorContainer }]}>
                    <IndianRupee size={14} color={balance > 0 ? MD3Colors.error : MD3Colors.onSurfaceVariant} strokeWidth={2.2} />
                    <Text style={[styles.summaryChipText, balance > 0 && { color: MD3Colors.error }]}>Due ₹{balance.toFixed(0)}</Text>
                  </View>
                </Animated.View>
              )}

              <View style={{ marginTop: MD3Spacing.md }}>
                <Button
                  title={lastSaved ? 'Saved!' : 'Save Entry'}
                  intent="save"
                  onPress={saveEntry}
                  loading={saving}
                  fullWidth
                />
              </View>

              {lastSaved && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.savedBanner}>
                  <CheckCircle2 size={16} color={MD3Colors.success} strokeWidth={2.2} />
                  <Text style={styles.savedBannerText}>Entry saved successfully</Text>
                </Animated.View>
              )}
            </Card>
          </Animated.View>

          {/* Info card */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Save size={18} color={MD3Colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Quick Tips</Text>
                  <Text style={styles.infoText}>
                    Fill customer name, bill number and amounts. Balance is auto-calculated. For full payment tracking with photos and notes, use the Daily Customer Entry screen.
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  formCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MD3Spacing.lg,
  },
  formIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  formTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    color: MD3Colors.onSurface,
  },
  formSubtitle: {
    fontFamily: 'Roboto-Regular',
    fontSize: 13,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 2,
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
    marginBottom: MD3Spacing.sm,
  },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm },
  balanceLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: MD3Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  balanceValue: {
    fontFamily: 'Roboto-Bold',
    fontSize: 22,
    color: MD3Colors.onPrimaryContainer,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MD3Spacing.sm,
    marginBottom: MD3Spacing.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MD3Colors.surfaceVariant,
    borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: 6,
  },
  summaryChipText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: MD3Spacing.md,
    paddingVertical: MD3Spacing.sm,
    backgroundColor: MD3Colors.successContainer,
    borderRadius: MD3Radius.md,
  },
  savedBannerText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
    color: MD3Colors.success,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    ...MD3Elevation.level1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  infoTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 14,
    color: MD3Colors.onSurface,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
