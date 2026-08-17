import { Tabs } from 'expo-router';
import { LayoutGrid, LayoutDashboard, Package, ShoppingCart } from 'lucide-react-native';
import { MD3Colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MD3Colors.primary,
        tabBarInactiveTintColor: MD3Colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: MD3Colors.surface,
          borderTopColor: MD3Colors.outlineVariant,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Roboto-Medium',
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ size, color }) => (
            <ShoppingCart size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'More',
          tabBarIcon: ({ size, color }) => (
            <LayoutGrid size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
