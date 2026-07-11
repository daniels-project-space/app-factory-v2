import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

// The paywall opens as a modal pushed onto the root Stack, above the tab
// navigator. Without this, tapping a different tab switches the tab bar's
// active route underneath the modal but leaves the modal itself on screen —
// so e.g. Settings becomes unreachable once the paywall has been triggered
// from Reflect. Every tab press dismisses any modal on top of the stack
// first, so the tab bar always actually navigates.
function dismissModalsOnTabPress() {
  if (router.canDismiss()) {
    router.dismissAll();
  }
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.bodySemiBold,
          fontSize: 11,
        },
      }}
      screenListeners={{
        tabPress: dismissModalsOnTabPress,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          title: 'Reflect',
          tabBarButtonTestID: 'tab-reflect',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'flame' : 'flame-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'tab-settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
