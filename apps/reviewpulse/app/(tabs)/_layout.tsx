import { Tabs } from 'expo-router';
import { Activity, Star, Users, BarChart2, Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Colors, LightTheme, DarkTheme } from '@/constants';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: isDark ? Colors.slate[300] : Colors.slate[500],
        tabBarStyle: {
          backgroundColor: isDark ? DarkTheme.bgSurface : LightTheme.bgSurface,
          borderTopColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontFamily: 'Barlow-Condensed-SemiBold',
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Activity size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reviews',
          tabBarIcon: ({ color, size }) => <Star size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
