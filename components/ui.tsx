import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Typography, MD3Elevation } from '@/lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'filled',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'filled' | 'outlined' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}) {
  const bg = variant === 'filled' ? MD3Colors.primary : 'transparent';
  const fg = variant === 'filled' ? MD3Colors.onPrimary : MD3Colors.primary;
  const border = variant === 'outlined' ? 1.5 : 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: bg, borderColor: MD3Colors.primary, borderWidth: border }, disabled && styles.buttonDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: disabled ? MD3Colors.disabled : fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  style?: any;
}) {
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MD3Colors.outline}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.md,
    padding: MD3Spacing.md,
    ...MD3Elevation.level1,
  },
  button: {
    height: 48,
    borderRadius: MD3Radius.full,
    paddingHorizontal: MD3Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrap: { marginBottom: MD3Spacing.md },
  inputLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
    marginBottom: MD3Spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: MD3Colors.outline,
    borderRadius: MD3Radius.sm,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: MD3Spacing.sm + 2,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: MD3Colors.onSurface,
    backgroundColor: MD3Colors.surface,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: MD3Spacing.xl },
  emptyTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface, marginTop: MD3Spacing.md },
  emptySubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, marginTop: MD3Spacing.xs, textAlign: 'center' },
  header: { paddingHorizontal: MD3Spacing.lg, paddingTop: MD3Spacing.xl, paddingBottom: MD3Spacing.sm },
  headerTitle: { fontFamily: 'Roboto-Bold', fontSize: 26, color: MD3Colors.onSurface },
  headerSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
});
