import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';

import { DatabaseBackup, Upload, FileJson, ShieldCheck, AlertCircle, Info, Share2 } from 'lucide-react-native';
import { exportBackup, importBackup, downloadBackupFile } from '../lib/db/database';
import { ScreenHeader } from '../components/ui';

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

      Alert.alert(
  'Success',
  'Backup created successfully.'
);
      
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
      
      <ScrollView style={styles.scroll}>
        <View style={styles.infoBanner}>
          <Info size={20} color="#004a77" />
          <Text style={styles.infoText}>
            Your data is stored locally on this device. Back up regularly to secure your information.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#dfebd5' }]}>
              <DatabaseBackup size={22} color="#386a20" />
            </View>
            <View style={styles.headerTextContainer}>
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
              <ActivityIndicator color="#386a20" />
            ) : (
              <View style={styles.shareBtnContent}>
                <Share2 size={16} color="#ffffff" />
                <Text style={styles.secondaryBtnText}>Export & Share Backup</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryBtn, { marginTop: 12 }]} 
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
            <View style={[styles.cardIcon, { backgroundColor: '#ffe082' }]}>
              <Upload size={22} color="#b36b00" />
            </View>
            <View style={styles.headerTextContainer}>
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
            <View style={[styles.cardIcon, { backgroundColor: '#e8def8' }]}>
              <FileJson size={22} color="#6750a4" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.primaryBtnText}>Database Structure</Text>
              <Text style={styles.cardDesc}>Compatible format for future Google Drive backup. Schema versioned for forward compatibility.</Text>
            </View>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color="#386a20" />
            <Text style={styles.structText}>Versioned JSON snapshot (.json)</Text>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color="#386a20" />
            <Text style={styles.structText}>Full tables + sequences preserved</Text>
          </View>

          <View style={styles.structRow}>
            <ShieldCheck size={16} color="#386a20" />
            <Text style={styles.structText}>No external server required</Text>
          </View>
        </View>

        {status && (
          <View style={[styles.statusBox, status.includes('failed') ? styles.statusError : styles.statusSuccess]}>
            <AlertCircle size={18} color={status.includes('failed') ? '#ba1a1a' : '#386a20'} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffebee' },
  scroll: { flex: 1 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#c2e7ff', borderRadius: 8, padding: 16, margin: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#001d35', marginLeft: 8 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, marginHorizontal: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerTextContainer: { flex: 1 },
  primaryBtnText: { fontSize: 16, color: '#1d1b20', marginBottom: 2, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: '#49454f', lineHeight: 18 },
  secondaryBtn: { backgroundColor: '#386a20', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  shareBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningBtn: { borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: '#b36b00' },
  warningBtnText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  timestamp: { fontSize: 11, color: '#49454f', marginTop: 12, textAlign: 'center' },
  structRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  structText: { fontSize: 13, color: '#1d1b20', marginLeft: 8 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  statusError: { backgroundColor: '#ffdad6' },
  statusSuccess: { backgroundColor: '#dfebd5' },
  statusText: { flex: 1, fontSize: 13, color: '#1d1b20' },
});
