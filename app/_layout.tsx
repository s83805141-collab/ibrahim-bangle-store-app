

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { runAutomaticBackup } from '@/lib/db/database';

const AUTO_BACKUP_TASK = 'SINGLE_FILE_AUTO_BACKUP';

TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  try {
    await runAutomaticBackup();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Automatic backup task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function initAutoBackup() {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(AUTO_BACKUP_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(AUTO_BACKUP_TASK, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {
    console.error('Automatic backup registration failed:', error);
  }
}

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

  useEffect(() => {
    initAutoBackup();
    runAutomaticBackup();
  }, []);
  
  

  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
  });

  useEffect(() => {
  GoogleSignin.configure({
    webClientId:
      '821913372504-hfgride0tbp74o6otdklrm6b6tahgkvn.apps.googleusercontent.com',
  });
}, []);

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
  <Stack.Screen
  name="login"
  options={{ gestureEnabled: false }}
/>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="invoice-history" />
  <Stack.Screen name="invoice-details" />
  <Stack.Screen name="customer-profile" />
  <Stack.Screen name="supplier-profile" />
  <Stack.Screen name="global-search" />
  <Stack.Screen name="transport-register" />
  <Stack.Screen name="+not-found" />
</Stack>
      <StatusBar style="dark" backgroundColor={MD3Colors.background} />
    </>
  );
}
