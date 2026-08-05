import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Sparkles, ShieldCheck, LogIn, Eye } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation, MD3Gradients } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      Alert.alert(
        'Login Successful',
        `Welcome ${userInfo.data?.user?.name ?? 'User'}`
      );
      console.log(userInfo);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.message || 'Google Sign-In failed'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1565C0', '#0D47A1', '#002171']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      {/* Brand section */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.brandWrap}>
        <View style={styles.logoWrap}>
          <Sparkles size={40} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text style={styles.brandTitle}>Ibrahim Bangle Store</Text>
        <Text style={styles.brandSubtitle}>Premium Inventory & Billing</Text>
      </Animated.View>

      {/* Features list */}
      <View style={styles.featuresWrap}>
        {[
          { icon: Sparkles, text: 'Manage stock & products' },
          { icon: ShieldCheck, text: 'Offline-first secure data' },
          { icon: Eye, text: 'Reports & analytics built-in' },
        ].map((feature, i) => {
          const Icon = feature.icon;
          return (
            <Animated.View key={i} entering={FadeInDown.duration(400).delay(300 + i * 100)} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Icon size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Sign-in card */}
      <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.card}>
        <Text style={styles.cardTitle}>Get Started</Text>
        <Text style={styles.cardDesc}>Sign in to manage your store</Text>

        <TouchableOpacity onPress={handleGoogleSignIn} activeOpacity={0.85} style={styles.googleBtn as ViewStyle}>
          <View style={styles.googleIconWrap}>
            <LogIn size={22} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service & Privacy Policy
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.primary },
  brandWrap: { alignItems: 'center', paddingTop: 100, paddingBottom: MD3Spacing.xl },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: MD3Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brandTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  featuresWrap: { paddingHorizontal: MD3Spacing.xl, marginBottom: MD3Spacing.xl, gap: MD3Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.md },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    position: 'absolute',
    bottom: MD3Spacing.xl,
    left: MD3Spacing.lg,
    right: MD3Spacing.lg,
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.xxl,
    padding: MD3Spacing.lg,
    ...MD3Elevation.level5,
  },
  cardTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface, textAlign: 'center', marginBottom: 4 },
  cardDesc: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, textAlign: 'center', marginBottom: MD3Spacing.lg },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MD3Spacing.sm,
    backgroundColor: '#4285F4',
    borderRadius: MD3Radius.lg,
    paddingVertical: MD3Spacing.md,
    marginBottom: MD3Spacing.md,
    ...MD3Elevation.level2,
  },
  googleIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  googleBtnText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: '#FFFFFF' },
  termsText: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.outline, textAlign: 'center', lineHeight: 16 },
  decorCircle1: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  decorCircle2: { position: 'absolute', top: 200, left: -80, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
});
