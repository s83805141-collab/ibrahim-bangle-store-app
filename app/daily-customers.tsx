import { View, Text } from 'react-native';

export default function DailyCustomersScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
        Daily Customer Entry
      </Text>

      <Text style={{ marginTop: 10 }}>
        Screen Successfully Created
      </Text>
    </View>
  );
}
