import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

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
        onPress={() => {
          // अगले स्टेप में यहाँ Google Sign-In आएगा
          router.replace('/(tabs)');
        }}
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
