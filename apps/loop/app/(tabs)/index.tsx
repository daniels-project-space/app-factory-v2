import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  Badge,
  Card,
  EmptyState,
  ListRow,
  ProgressRing,
  Screen,
  Sheet,
  Text,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { DEMO_MODE, seedOnce } from '@/lib/demo';
import { useSubscription } from '@/store/subscription';

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  minutes: number;
}

// Realistic fixture data — replaced by real app data by the factory builder.
function buildDemoActivities(): ActivityItem[] {
  return [
    {
      id: 'a1',
      title: 'Morning session',
      subtitle: 'Completed today, 7:40 AM',
      icon: 'sunny-outline',
      minutes: 24,
    },
    {
      id: 'a2',
      title: 'Deep focus block',
      subtitle: 'Completed yesterday, 2:15 PM',
      icon: 'timer-outline',
      minutes: 52,
    },
    {
      id: 'a3',
      title: 'Evening review',
      subtitle: 'Completed yesterday, 9:05 PM',
      icon: 'moon-outline',
      minutes: 16,
    },
  ];
}

export default function HomeScreen() {
  const theme = useTheme();
  const isPro = useSubscription((s) => s.isPro);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const seeded = DEMO_MODE
        ? await seedOnce('activities', buildDemoActivities)
        : [];
      if (!cancelled) {
        setItems(seeded);
        setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
  const dailyGoalMinutes = 60;
  const progress = Math.min(1, totalMinutes / (dailyGoalMinutes * 2));

  return (
    <Screen scroll testID="home-screen">
      <View style={[styles.headerRow, { marginTop: theme.spacing.lg }]}>
        <View>
          <Text variant="caption" color="textMuted">
            Welcome back
          </Text>
          <Text variant="display">Today</Text>
        </View>
        <Badge label={isPro ? 'Pro' : 'Free'} tone={isPro ? 'accent' : 'neutral'} />
      </View>

      <Card style={{ marginTop: theme.spacing.xl }}>
        <View style={styles.progressRow}>
          <ProgressRing progress={progress} size={104} testID="home-progress-ring">
            <Text variant="title">{Math.round(progress * 100)}%</Text>
          </ProgressRing>
          <View style={{ flex: 1, marginLeft: theme.spacing.xl }}>
            <Text variant="title">Weekly goal</Text>
            <Text variant="body" color="textMuted" style={{ marginTop: 4 }}>
              {totalMinutes} of {dailyGoalMinutes * 2} minutes logged this week.
            </Text>
          </View>
        </View>
      </Card>

      <Text variant="title" style={{ marginTop: theme.spacing.xxl }}>
        Recent activity
      </Text>

      {loaded && items.length === 0 ? (
        <EmptyState
          testID="home-empty"
          icon="leaf-outline"
          title="Nothing here yet"
          message="Your sessions will show up here as soon as you log the first one."
        />
      ) : (
        <Card unpadded style={{ marginTop: theme.spacing.md }}>
          {items.map((item, i) => (
            <ListRow
              key={item.id}
              testID={`home-activity-${item.id}`}
              title={item.title}
              subtitle={item.subtitle}
              divider={i < items.length - 1}
              left={<Ionicons name={item.icon} size={22} color={theme.colors.primary} />}
              right={
                <Text variant="caption" color="textMuted">
                  {item.minutes} min
                </Text>
              }
              onPress={() => setSelectedItem(item)}
            />
          ))}
        </Card>
      )}

      <Sheet
        visible={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        testID="home-activity-sheet"
      >
        <Text variant="body" color="textMuted">
          {selectedItem?.subtitle}
        </Text>
        <Text variant="body" style={{ marginTop: theme.spacing.md }}>
          Duration: {selectedItem?.minutes} minutes
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
