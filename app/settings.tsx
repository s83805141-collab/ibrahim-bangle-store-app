import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Settings as SettingsIcon, Store, MapPin, Phone, Heart, Check, RotateCcw, Save, Info, ShieldCheck } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';
import { getSettings, saveSettings, DEFAULT_SETTINGS, ShopSettings } from '@/lib/db/repo';
import { Button, Input, ScreenHeader } from '@/components/ui';

export default function SettingsScreen() {
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopFooter, setShopFooter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    setShopName(s.shop_name);
    setShopAddress(s.shop_address);
    setShopPhone(s.shop_phone);
    setShopFooter(s.shop_footer);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        shop_name: shopName.trim() || DEFAULT_SETTINGS.shop_name,
        shop_address: shopAddress.trim() || DEFAULT_SETTINGS.shop_address,
        shop_phone: shopPhone.trim(),
        shop_footer: shopFooter.trim() || DEFAULT_SETTINGS.shop_footer,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset to Defaults', 'Restore shop information to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        setShopName(DEFAULT_SETTINGS.shop_name);
        setShopAddress(DEFAULT_SETTINGS.shop_address);
        setShopPhone(DEFAULT_SETTINGS.shop_phone);
        setShopFooter(DEFAULT_SETTINGS.shop_footer);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" subtitle="Shop information & preferences" />
      <ScrollView contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 140 }}>
        {/* Shop Information Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(0)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: MD3Colors.primaryContainer }]}>
              <Store size={20} color={MD3Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Shop Information</Text>
              <Text style={styles.sectionDesc}>Appears on all generated invoices</Text>
            </View>
          </View>
          <Input label="Shop Name" value={shopName} onChangeText={setShopName} placeholder="Ibrahim Bangle Store" />
          <Input label="Address" value={shopAddress} onChangeText={setShopAddress} placeholder="Baggi Road, Gonda" multiline />
          <Input label="Phone Number" value={shopPhone} onChangeText={setShopPhone} keyboardType="phone-pad" placeholder="Phone number" />
        </Animated.View>

        {/* Invoice Footer Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: MD3Colors.errorContainer }]}>
              <Heart size={20} color={MD3Colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Invoice Footer</Text>
              <Text style={styles.sectionDesc}>Thank-you message on invoices</Text>
            </View>
          </View>
          <Input label="Footer Message" value={shopFooter} onChangeText={setShopFooter} placeholder="Thank You For Shopping..." multiline />
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button title="Reset" variant="outlined" intent="cancel" onPress={handleReset} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
          <Button title={saved ? 'Saved!' : 'Save Settings'} intent="save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
        </View>

        {saved && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.savedBanner}>
            <Check size={18} color={MD3Colors.success} />
            <Text style={styles.savedText}>Settings saved successfully</Text>
          </Animated.View>
        )}

        {/* About Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: MD3Colors.tertiaryContainer }]}>
              <Info size={20} color={MD3Colors.tertiary} />
            </View>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Text style={styles.aboutText}>Ibrahim Bangle Store POS</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDesc}>Offline-first inventory & billing management. All data is stored locally on your device.</Text>
          <View style={styles.aboutFeatureRow}>
            <ShieldCheck size={14} color={MD3Colors.success} />
            <Text style={styles.aboutFeature}>Data stays on device</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  section: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  sectionTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface },
  sectionDesc: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  buttonRow: { flexDirection: 'row', marginBottom: MD3Spacing.md },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MD3Spacing.sm,
    backgroundColor: MD3Colors.successContainer,
    borderRadius: MD3Radius.md,
    paddingVertical: MD3Spacing.sm + 2,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level1,
  },
  savedText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.success },
  aboutCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    ...MD3Elevation.level2,
  },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  aboutText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  aboutVersion: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary, marginBottom: MD3Spacing.sm },
  aboutDesc: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, lineHeight: 20, marginBottom: MD3Spacing.md },
  aboutFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: MD3Colors.successContainer, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, paddingVertical: 6, alignSelf: 'flex-start' },
  aboutFeature: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.success },
});
