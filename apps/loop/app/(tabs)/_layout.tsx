import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

// The paywall opens as a modal pushed onto the root Stack, above the tab
// navigator. Relying on the default tabPress action to switch the visible
// tab while separately calling router.dismissAll() raced with the modal
// dismissal — on web export the default tab switch could resolve before (or
// without ever actually cancelling in favor of) the imperative dismiss, so
// the paywall modal stayed pinned on top no matter which tab was pressed
// underneath it. router.dismissTo() dismisses the modal AND navigates to the
// target tab as a single transition, so there's nothing left to race.
function tabPressListener(href: string) {
  return ({ preventDefault }: { preventDefault: () => void }) => {
    if (router.canDismiss()) {
      preventDefault();
      router.dismissTo(href);
    }
  };
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
    >
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: tabPressListener('/(tabs)') }}
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
        listeners={{ tabPress: tabPressListener('/(tabs)/reflect') }}
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
        listeners={{ tabPress: tabPressListener('/(tabs)/settings') }}
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
