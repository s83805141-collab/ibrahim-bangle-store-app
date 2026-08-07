import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  SlideInDown,
  interpolate,
} from 'react-native-reanimated';
import {
  Save,
  RefreshCw,
  Trash2,
  Plus,
  X,
  Eye,
  Search,
  Wallet,
  LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============= PREMIUM GRADIENT BUTTON =============
type ButtonIntent = 'save' | 'update' | 'delete' | 'add' | 'cancel' | 'view' | 'search' | 'payment' | 'primary' | 'teal' | 'purple';

const intentGradient: Record<ButtonIntent, string[]> = {
  save: MD3Gradients.save,
  update: MD3Gradients.update,
  delete: MD3Gradients.delete,
  add: MD3Gradients.add,
  cancel: MD3Gradients.cancel,
  view: MD3Gradients.view,
  search: MD3Gradients.search,
  payment: MD3Gradients.payment,
  primary: MD3Gradients.primary,
  teal: MD3Gradients.teal,
  purple: MD3Gradients.purple,
};

const intentIcon: Record<ButtonIntent, LucideIcon> = {
  save: Save,
  update: RefreshCw,
  delete: Trash2,
  add: Plus,
  cancel: X,
  view: Eye,
  search: Search,
  payment: Wallet,
  primary: Plus,
  teal: Wallet,
  purple: Plus,
};

export function Button({
  title,
  onPress,
  intent = 'primary',
  variant = 'filled',
  loading,
  disabled,
  style,
  icon,
  fullWidth,
}: {
  title: string;
  onPress?: () => void;
  intent?: ButtonIntent;
  variant?: 'filled' | 'outlined' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
  icon?: LucideIcon;
  fullWidth?: boolean;
}) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    setPressed(true);
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    setPressed(false);
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const gradients = intentGradient[intent];
  const IconComp = icon || intentIcon[intent];
  const isOutlined = variant === 'outlined';
  const isText = variant === 'text';
  const fg = isOutlined || isText ? (intent === 'cancel' ? MD3Colors.onSurfaceVariant : (intent === 'delete' ? MD3Colors.error : (intent === 'save' ? MD3Colors.success : (intent === 'view' ? MD3Colors.warning : MD3Colors.primary)))) : '#FFFFFF';

  if (isText) {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.textButtonWrap, animatedStyle, style]}>
          {loading ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <>
              <IconComp size={18} color={fg} strokeWidth={2.2} />
              <Text style={[styles.buttonText, { color: disabled ? MD3Colors.disabled : fg }]}>{title}</Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  if (isOutlined) {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.outlinedButton,
            { borderColor: intent === 'cancel' ? MD3Colors.outline : (intent === 'delete' ? MD3Colors.error : (intent === 'save' ? MD3Colors.success : (intent === 'view' ? MD3Colors.warning : MD3Colors.primary))) },
            animatedStyle,
            style,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <>
              <IconComp size={18} color={fg} strokeWidth={2.2} />
              <Text style={[styles.buttonText, { color: disabled ? MD3Colors.disabled : fg }]}>{title}</Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <AnimatedLinearGradient
        colors={gradients as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientButton, disabled && styles.gradientButtonDisabled, animatedStyle, fullWidth && { flex: 1 }, style]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <IconComp size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={[styles.buttonText, { color: disabled ? 'rgba(255,255,255,0.5)' : '#FFFFFF' }]}>{title}</Text>
          </>
        )}
      </AnimatedLinearGradient>
    </Pressable>
  );
}

// ============= PREMIUM CARD =============
export function Card({ children, style, onPress, delay }: { children: React.ReactNode; style?: any; onPress?: () => void; delay?: number }) {
  if (onPress) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      >
        <Animated.View entering={FadeIn.duration(300).delay(delay || 0)} style={[styles.card, animatedStyle, style]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay || 0)} style={[styles.card, style]}>
      {children}
    </Animated.View>
  );
}

// ============= PREMIUM INPUT =============
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  style,
  secureTextEntry,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  style?: any;
  secureTextEntry?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MD3Colors.outline}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ============= EMPTY STATE =============
export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
      <View style={styles.emptyIconWrap}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

// ============= SCREEN HEADER =============
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

// ============= PREMIUM FAB =============
export function FAB({ onPress, icon: IconComp = Plus, intent = 'primary' }: { onPress?: () => void; icon?: LucideIcon; intent?: ButtonIntent }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSequence(withSpring(0.85, { damping: 15 }), withSpring(1.08, { damping: 8, stiffness: 200 })); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      style={styles.fabWrap}
    >
      <AnimatedLinearGradient
        colors={intentGradient[intent] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fab, animatedStyle]}
      >
        <IconComp size={28} color="#FFFFFF" strokeWidth={2.4} />
      </AnimatedLinearGradient>
    </Pressable>
  );
}

// ============= PREMIUM MODAL =============
export function PremiumModal({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Animated.View entering={SlideInDown.duration(300)} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X size={22} color={MD3Colors.onSurface} strokeWidth={2.4} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
            {children}
          </ScrollView>
          {footer ? <View style={[styles.modalStickyFooter, { paddingBottom: MD3Spacing.sm + insets.bottom }]}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============= STATUS BADGE =============
export function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ============= STYLES =============
const styles = StyleSheet.create({
  gradientButton: {
    height: 52,
    borderRadius: MD3Radius.lg,
    paddingHorizontal: MD3Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...MD3Elevation.level2,
  },
  gradientButtonDisabled: {
    opacity: 0.5,
  },
  outlinedButton: {
    height: 52,
    borderRadius: MD3Radius.lg,
    paddingHorizontal: MD3Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  textButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: MD3Spacing.sm,
  },
  buttonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    padding: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  inputWrap: { marginBottom: MD3Spacing.md },
  inputLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
    color: MD3Colors.onSurfaceVariant,
    marginBottom: MD3Spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: MD3Colors.outline,
    borderRadius: MD3Radius.md,
    paddingHorizontal: MD3Spacing.md,
    paddingVertical: MD3Spacing.sm + 4,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: MD3Colors.onSurface,
    backgroundColor: MD3Colors.surface,
  },
  inputFocused: {
    borderColor: MD3Colors.primary,
    borderWidth: 2,
    backgroundColor: MD3Colors.primaryContainer,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: MD3Spacing.xxl },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MD3Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: MD3Spacing.md,
  },
  emptyTitle: { fontFamily: 'Roboto-Bold', fontSize: 18, color: MD3Colors.onSurface, marginTop: MD3Spacing.sm },
  emptySubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, marginTop: MD3Spacing.xs, textAlign: 'center' },
  header: { paddingHorizontal: MD3Spacing.lg, paddingTop: MD3Spacing.xl, paddingBottom: MD3Spacing.sm },
  headerTitle: { fontFamily: 'Roboto-Bold', fontSize: 28, color: MD3Colors.onSurface },
  headerSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurfaceVariant, marginTop: 4 },
  fabWrap: { position: 'absolute', bottom: 24, right: 24 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: MD3Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...MD3Elevation.level4,
  },
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
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: MD3Spacing.lg,
    paddingVertical: MD3Spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: MD3Colors.outlineVariant,
    gap: MD3Spacing.sm,
  },
  modalStickyFooter: {
    flexDirection: 'row',
    paddingHorizontal: MD3Spacing.lg,
    paddingVertical: MD3Spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: MD3Colors.outlineVariant,
    gap: MD3Spacing.sm,
    backgroundColor: MD3Colors.surface,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: MD3Spacing.md,
    ...MD3Elevation.level3,
  },
  statusBadge: {
    borderRadius: MD3Radius.sm,
    paddingHorizontal: MD3Spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
});
