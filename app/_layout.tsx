import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MD3Colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  GoogleSignin.configure({
  webClientId:
    '821913372504-hfgride0tbp74o6otdklrm6b6tahgkvn.apps.googleusercontent.com',
});

  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="login" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="+not-found" />
</Stack>
      <StatusBar style="dark" backgroundColor={MD3Colors.background} />
    </>
  );
}
