import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';

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
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 50,
        }}
      >
        Ibrahim Bangle Store
      </Text>

      <TouchableOpacity
        onPress={handleGoogleSignIn}
        style={{
          backgroundColor: '#4285F4',
          padding: 15,
          borderRadius: 10,
          width: '100%',
        }}
      >
        <Text
          style={{
            color: '#fff',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          Continue with Google
        </Text>
      </TouchableOpacity>
    </View>
  );
}
