import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DatabaseBackup, Upload, FileJson, ShieldCheck, AlertCircle, Info, Share2, Copy, Check } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { Button, ScreenHeader } from '@/components/ui';
import {
  exportBackup,
  importBackup,
  downloadBackupFile,
  isAutomaticBackupEnabled,
  setAutomaticBackupEnabled,
} from '../lib/db/database';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function BackupScreen() {
  const [busy, setBusy] = useState<'export' | 'import' | 'copy' | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [automaticBackupEnabled, setAutomaticBackupEnabledState] = useState(true);
  const [loadingAutomaticBackup, setLoadingAutomaticBackup] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const enabled = await isAutomaticBackupEnabled();
        if (mounted) {
          setAutomaticBackupEnabledState(enabled);
        }
      } catch (error) {
        console.error('Could not load automatic backup setting:', error);
      } finally {
        if (mounted) {
          setLoadingAutomaticBackup(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAutomaticBackupToggle = useCallback(async (enabled: boolean) => {
    setAutomaticBackupEnabledState(enabled);

    try {
      await setAutomaticBackupEnabled(enabled);
      setStatus(
        enabled
          ? 'Automatic backup enabled.'
          : 'Automatic backup disabled.'
      );
    } catch (error: any) {
      setAutomaticBackupEnabledState(!enabled);
      Alert.alert(
        'Error',
        error?.message || 'Could not change automatic backup setting.'
      );
    }
  }, []);

  const handleExportAndShare = useCallback(async () => {
    setBusy('export');
    setStatus(null);
    try {
      await downloadBackupFile();
      const ts = new Date().toLocaleString('en-US');
      setLastBackup(ts);
      setStatus('Backup saved to device.');
      Alert.alert('Success', 'Backup created successfully.');
    } catch (e: any) {
      setStatus('Export failed: ' + (e.message || 'unknown error'));
      Alert.alert('Error', e.message || 'Could not export backup');
    } finally {
      setBusy(null);
    }
  }, []);

  const handleCopyToClipboard = useCallback(async () => {
    setBusy('copy');
    setStatus(null);
    try {
      const json = await exportBackup();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        setStatus('Backup copied to clipboard.');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setStatus('Clipboard not available in this environment.');
      }
    } catch (e: any) {
      setStatus('Copy failed: ' + (e.message || 'error'));
    } finally {
      setBusy(null);
    }
  }, []);

  const triggerFilePicker = async () => {
    setBusy('import');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const json = await FileSystem.readAsStringAsync(file.uri);
      await importBackup(json);
      Alert.alert('Success', 'Backup restored successfully.');
    } catch (e: any) {
      Alert.alert('Restore Failed', e?.message || 'Could not restore backup.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Backup & Restore" subtitle="Export & import your offline data" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 140 }}>
        {/* Info Banner */}
        <Animated.View entering={FadeInDown.duration(300).delay(0)} style={styles.infoBanner}>
          <View style={styles.infoIconWrap}><Info size={20} color={MD3Colors.primary} /></View>
          <Text style={styles.infoText}>
            Your data is stored locally on this device. Back up regularly to secure your information.
          </Text>
        </Animated.View>

        {/* Backup Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.successContainer }]}>
              <DatabaseBackup size={22} color={MD3Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Backup Data</Text>
              <Text style={styles.cardDesc}>Save to device storage and share via Email/WhatsApp.</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <Button title="Export & Share" intent="save" onPress={handleExportAndShare} loading={busy === 'export'} disabled={busy !== null} fullWidth style={{ marginBottom: MD3Spacing.sm }} />
            <Button title={copied ? 'Copied!' : 'Copy to Clipboard'} intent="primary" onPress={handleCopyToClipboard} loading={busy === 'copy'} disabled={busy !== null} fullWidth />
          </View>
          {lastBackup && (
            <View style={styles.timestampRow}>
              <Check size={12} color={MD3Colors.success} />
              <Text style={styles.timestamp}>Last backup: {lastBackup}</Text>
            </View>
          )}
        </Animated.View>

        {/* Automatic Backup Card */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(60)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: MD3Colors.primaryContainer },
              ]}
            >
              <DatabaseBackup
                size={22}
                color={MD3Colors.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Automatic Backup</Text>
              <Text style={styles.cardDesc}>
                Automatically save a complete local backup once every 24 hours.
              </Text>
            </View>

            <Switch
              value={automaticBackupEnabled}
              onValueChange={handleAutomaticBackupToggle}
              disabled={loadingAutomaticBackup}
            />
          </View>

          <Text style={styles.featureText}>
            {automaticBackupEnabled
              ? 'Automatic backup is ON'
              : 'Automatic backup is OFF'}
          </Text>
        </Animated.View>

        {/* Restore Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.warningContainer }]}>
              <Upload size={22} color={MD3Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Restore Backup</Text>
              <Text style={styles.cardDesc}>Import a previously exported JSON backup. This replaces current data.</Text>
            </View>
          </View>
          <Button title="Select File" intent="view" onPress={triggerFilePicker} loading={busy === 'import'} disabled={busy !== null} fullWidth />
        </Animated.View>

        {/* Structure Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(180)} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.tertiaryContainer }]}>
              <FileJson size={22} color={MD3Colors.tertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Database Structure</Text>
              <Text style={styles.cardDesc}>Compatible format for future Google Drive backup.</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.featureText}>Versioned JSON snapshot (.json)</Text>
          </View>
          <View style={styles.featureRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.featureText}>Full tables + sequences preserved</Text>
          </View>
          <View style={styles.featureRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.featureText}>No external server required</Text>
          </View>
        </Animated.View>

        {/* Status */}
        {status && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.statusBox, status.includes('failed') ? styles.statusError : styles.statusSuccess]}>
            <AlertCircle size={18} color={status.includes('failed') ? MD3Colors.error : MD3Colors.success} />
            <Text style={styles.statusText}>{status}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: MD3Colors.primaryContainer,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level1,
  },
  infoIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  infoText: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onPrimaryContainer, lineHeight: 20 },
  card: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  cardDesc: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, lineHeight: 18 },
  cardActions: { gap: 0 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: MD3Spacing.sm },
  timestamp: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginTop: MD3Spacing.xs, gap: 8 },
  featureText: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurface },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level1,
  },
  statusError: { backgroundColor: MD3Colors.errorContainer },
  statusSuccess: { backgroundColor: MD3Colors.successContainer },
  statusText: { flex: 1, fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurface },
});
