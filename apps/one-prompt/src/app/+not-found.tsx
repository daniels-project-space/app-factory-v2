import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/lib/useAppTheme';

export default function NotFoundScreen() {
  const theme = useAppTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: theme.background }}>
        <Text className="text-xl font-bold mb-2" style={{ color: theme.text }}>
          This page doesn't exist.
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-sm font-semibold" style={{ color: theme.accent }}>go home</Text>
        </Link>
      </View>
    </>
  );
}
