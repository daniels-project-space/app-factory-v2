import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/store/settings';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

// Placeholder copy — the factory's builder rewrites these per app.
// Keep the structure: benefit-led title, one concrete sentence of body.
const SLIDES: Slide[] = [
  {
    icon: 'grid-outline',
    title: 'Everything in one place',
    body: 'Your progress, history, and daily goal live on one simple home screen — no digging through menus.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Build momentum daily',
    body: 'Set a goal that fits your routine and watch your streak grow one day at a time.',
  },
  {
    icon: 'rocket-outline',
    title: 'Go further with Pro',
    body: 'Unlock unlimited history, deeper insights, and every feature we ship next.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index] ?? SLIDES[0]!;

  const finish = () => {
    // The root layout's route guard swaps to the (tabs) group automatically.
    completeOnboarding();
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable
          testID="onboarding-skip"
          accessibilityRole="button"
          onPress={finish}
          hitSlop={12}
        >
          <Text variant="caption" color="textMuted">
            Skip
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              marginBottom: theme.spacing.xxl,
            },
          ]}
        >
          <Ionicons name={slide.icon} size={40} color={theme.colors.primary} />
        </View>
        <Text variant="display" center>
          {slide.title}
        </Text>
        <Text
          variant="body"
          color="textMuted"
          center
          style={{ marginTop: theme.spacing.lg, maxWidth: 300 }}
        >
          {slide.body}
        </Text>
      </View>

      <View style={[styles.dots, { marginBottom: theme.spacing.xl }]}>
        {SLIDES.map((s, i) => (
          <View
            key={s.title}
            style={{
              width: i === index ? 20 : 8,
              height: 8,
              borderRadius: theme.radius.full,
              marginHorizontal: theme.spacing.xs,
              backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
            }}
          />
        ))}
      </View>

      <Button
        title={isLast ? 'Get started' : 'Continue'}
        onPress={next}
        testID="onboarding-cta"
        style={{ marginBottom: theme.spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
