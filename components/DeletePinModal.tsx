import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X, Trash2, ShieldAlert } from 'lucide-react-native';
import { MD3Colors, MD3Radius, MD3Spacing } from '@/lib/theme';

type DeletePinModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function DeletePinModal({
  visible,
  onCancel,
  onConfirm,
}: DeletePinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const DELETE_PIN = '1234';

  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      setDeleting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (pin !== DELETE_PIN) {
      setError('Incorrect PIN. Please try again.');
      return;
    }

    try {
      setDeleting(true);
      setError('');
      await onConfirm();
    } catch {
      setError('Unable to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <ShieldAlert size={24} color={MD3Colors.error} />
            </View>

            <View style={styles.titleWrap}>
              <Text style={styles.title}>Delete Customer</Text>
              <Text style={styles.subtitle}>
                Enter PIN to confirm deletion
              </Text>
            </View>

            <TouchableOpacity
              style={styles.close}
              onPress={onCancel}
              disabled={deleting}
            >
              <X size={22} color={MD3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={pin}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, '').slice(0, 4));
              setError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={MD3Colors.onSurfaceVariant}
            style={styles.pinInput}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={deleting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.disabledBtn]}
              onPress={handleConfirm}
              disabled={deleting}
            >
              <Trash2 size={18} color="#fff" />
              <Text style={styles.deleteText}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: MD3Spacing.lg,
  },
  card: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MD3Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: MD3Spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: MD3Colors.onSurface,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
  },
  close: {
    padding: 6,
  },
  pinInput: {
    height: 54,
    borderWidth: 1,
    borderColor: MD3Colors.outline,
    borderRadius: MD3Radius.md,
    paddingHorizontal: MD3Spacing.md,
    fontSize: 24,
    letterSpacing: 10,
    textAlign: 'center',
    color: MD3Colors.onSurface,
    backgroundColor: MD3Colors.surface,
    marginTop: MD3Spacing.lg,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: MD3Colors.error,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: MD3Spacing.sm,
    marginTop: MD3Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: MD3Radius.md,
    alignItems: 'center',
    backgroundColor: MD3Colors.surfaceVariant,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: MD3Colors.onSurface,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 13,
    borderRadius: MD3Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MD3Colors.error,
  },
  disabledBtn: {
    opacity: 0.45,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
