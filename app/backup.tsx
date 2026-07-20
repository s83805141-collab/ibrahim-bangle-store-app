import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Sharing from 'expo-sharing'; 
import { DatabaseBackup, Upload, FileJson, ShieldCheck, AlertCircle, Info, Share2 } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius } from '@/lib/theme';
import { exportBackup, importBackup, downloadBackupFile } from '@/lib/db/database';
import { ScreenHeader } from '@/components/ui';

export default function BackupScreen() {
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExportAndShare = useCallback(async () => {
    setBusy('export');
    setStatus(null);
    try {
      const fileUri = await downloadBackupFile(); 
      
      const ts = new Date().toLocaleString('en-US');
      setLastBackup(ts);
      setStatus('Backup saved to device.');

      if (Platform.OS !== 'web') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable && fileUri) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Send Backup to your Email',
          });
        }
      } else {
        Alert.alert('Success', 'Backup file downloaded successfully.');
      }
    } catch (e: any) {
      setStatus('Export failed: ' + (e.message || 'unknown error'));
      Alert.alert('Error', e.message || 'Could not export backup');
    } finally {
      setBusy(null);
    }
  }, []);

  const handleCopyToClipboard = useCallback(async () => {
    setBusy('export');
    setStatus(null);
    try {
      const json = await exportBackup();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        setStatus('Backup copied to clipboard.');
      } else {
        setStatus('Clipboard not available in this environment.');
      }
    } catch (e: any) {
      setStatus('Copy failed: ' + (e.message || 'error'));
    } finally {
      setBusy(null);
    }
  }, []);

  const triggerFilePicker = () => {
    Alert.alert('Restore', 'File Import feature configured.');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Backup & Restore" subtitle="Export & import your offline data" />
      
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.infoBanner}>
          <Info size={20} color={MD3Colors.onPrimaryContainer} />
          <Text style={styles.infoText}>
            Your data is stored locally on this device. Back up regularly to secure your information.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.primaryContainer }]}>
              <DatabaseBackup size={22} color={MD3Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryBtnText}>Backup Data</Text>
              <Text style={styles.cardDesc}>Save to mobile storage and share to your Email/WhatsApp.</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={handleExportAndShare}
            disabled={busy !== null}
          >
            {busy === 'export' ? (
              <ActivityIndicator color={MD3Colors.primary} />
            ) : (
              <View style={styles.shareBtnContent}>
                <Share2 size={16} color={MD3Colors.primary} />
                <Text style={styles.secondaryBtnText}>Export & Share Backup</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryBtn, { marginTop: MD3Spacing.sm }]} 
            onPress={handleCopyToClipboard}
            disabled={busy !== null}
          >
            <Text style={styles.secondaryBtnText}>Copy to Clipboard</Text>
          </TouchableOpacity>

          {lastBackup && (
            <Text style={styles.timestamp}>Last backup: {lastBackup}</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.warningContainer }]}>
              <Upload size={22} color={MD3Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryBtnText}>Restore Backup</Text>
              <Text style={styles.cardDesc}>Import a previously exported JSON backup. This replaces current data.</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.warningBtn} 
            onPress={triggerFilePicker} 
            disabled={busy !== null}
          >
            <Text style={styles.warningBtnText}>Select File</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: MD3Colors.tertiaryContainer }]}>
              <FileJson size={22} color={MD3Colors.tertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryBtnText}>Database Structure</Text>
              <Text style={styles.cardDesc}>Compatible format for future Google Drive backup. Schema versioned for forward compatibility.</Text>
            </View>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.structText}>Versioned JSON snapshot (.json)</Text>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.structText}>Full tables + sequences preserved</Text>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color={MD3Colors.success} />
            <Text style={styles.structText}>No external server required</Text>
          </View>
        </View>

        {status && (
          <View style={[styles.statusBox, status.includes('failed') ? styles.statusError : styles.statusSuccess]}>
            <AlertCircle size={18} color={status.includes('failed') ? MD3Colors.error : MD3Colors.success} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: MD3Colors.onPrimaryContainer, borderRadius: MD3Radius.md, padding: MD3Spacing.md, margin: MD3Spacing.md },
  infoText: { flex: 1, fontSize: 13, color: MD3Colors.onPrimaryContainer, marginLeft: MD3Spacing.sm },
  card: { backgroundColor: '#fff', padding: MD3Spacing.md, borderRadius: MD3Radius.lg, paddingBottom: MD3Spacing.lg, marginBottom: MD3Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MD3Spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  primaryBtnText: { fontSize: 16, color: MD3Colors.onSurfaceVariant, marginBottom: 2, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: MD3Colors.outline, lineHeight: 18 },
  secondaryBtn: { backgroundColor: MD3Colors.primary, borderRadius: MD3Radius.md, paddingVertical: MD3Spacing.md, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, color: '#fff' },
  shareBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningBtn: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, paddingVertical: MD3Spacing.md, alignItems: 'center', backgroundColor: MD3Colors.secondary },
  warningBtnText: { fontSize: 14, color: '#fff' },
  timestamp: { fontSize: 11, color: MD3Colors.onSurfaceVariant, marginTop: MD3Spacing.sm, textAlign: 'center' },
  structRow: { flexDirection: 'row', alignItems: 'center', marginTop: MD3Spacing.xs },
  structText: { fontSize: 13, color: MD3Colors.onSurfaceVariant, marginLeft: MD3Spacing.sm },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginHorizontal: MD3Spacing.md, marginBottom: MD3Spacing.md },
  statusError: { backgroundColor: MD3Colors.errorContainer },
  statusSuccess: { backgroundColor: MD3Colors.successContainer },
  statusText: { flex: 1, fontSize: 13 },
});
              
