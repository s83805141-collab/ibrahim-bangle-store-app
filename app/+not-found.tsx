import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Compass, Home } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { Button } from '@/components/ui';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient colors={['#F5F7FA', '#E8EDF5']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
          <Animated.View entering={FadeIn.duration(600).delay(150)} style={styles.iconWrap}>
            <Compass size={72} color={MD3Colors.primary} strokeWidth={1.5} />
          </Animated.View>
          <Text style={styles.title}>404</Text>
          <Text style={styles.subtitle}>This screen doesn't exist or has been moved.</Text>
          <View style={styles.btnWrap}>
            <Button title="Go to Home" onPress={() => router.replace('/')} intent="primary" icon={Home} fullWidth />
          </View>
        </Animated.View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: MD3Spacing.lg },
  content: { alignItems: 'center' },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: MD3Spacing.lg,
    ...MD3Elevation.level2,
  },
  title: { fontFamily: 'Roboto-Bold', fontSize: 48, color: MD3Colors.onSurface, marginBottom: MD3Spacing.xs },
  subtitle: { fontFamily: 'Roboto-Regular', fontSize: 15, color: MD3Colors.onSurfaceVariant, textAlign: 'center', marginBottom: MD3Spacing.xl, maxWidth: 280 },
  btnWrap: { width: 240 },
});
