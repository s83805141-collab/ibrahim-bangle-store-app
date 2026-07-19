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
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Roboto-Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ size, color }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'More',
          tabBarIcon: ({ size, color }) => (
            <LayoutGrid size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
