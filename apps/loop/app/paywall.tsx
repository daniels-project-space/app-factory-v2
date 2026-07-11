import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { Plan } from '@/lib/payments';
import { useSubscription } from '@/store/subscription';

interface PlanOption {
  id: Plan;
  label: string;
  price: string;
  period: string;
  note?: string;
  badge?: string;
}

// Placeholder pricing — the factory rewrites plans + copy per app.
const PLANS: PlanOption[] = [
  {
    id: 'annual',
    label: 'Annual',
    price: '$39.99',
    period: 'per year',
    note: 'About $0.77 a week',
    badge: 'Best value',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$4.99',
    period: 'per week',
    note: 'Cancel anytime',
  },
];

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'infinite-outline', label: 'Unlimited history and archives' },
  { icon: 'analytics-outline', label: 'Advanced insights and trends' },
  { icon: 'cloud-done-outline', label: 'Automatic backup across devices' },
  { icon: 'flash-outline', label: 'Every future Pro feature, included' },
];

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isPro, phase, purchase, restore, resetPhase } = useSubscription();
  const [selected, setSelected] = useState<Plan>('annual');

  // Leave the phase clean for the next visit.
  useEffect(() => resetPhase, [resetPhase]);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const processing = phase === 'processing';
  const succeeded = phase === 'success' || isPro;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.closeRow}>
        <Pressable
          testID="paywall-close"
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
          onPress={close}
          hitSlop={12}
          style={[
            styles.closeButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {succeeded ? (
        <View style={[styles.successBlock, { paddingVertical: theme.spacing.xxxl }]}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.accent} />
          <Text variant="display" center style={{ marginTop: theme.spacing.lg }}>
            You're all set
          </Text>
          <Text variant="body" color="textMuted" center style={{ marginTop: theme.spacing.sm }}>
            Pro is active on this device. Enjoy the full experience.
          </Text>
          <Button
            title="Continue"
            onPress={close}
            testID="paywall-continue"
            style={{ marginTop: theme.spacing.xxl, alignSelf: 'stretch' }}
          />
        </View>
      ) : (
        <>
          <Text variant="display" style={{ marginTop: theme.spacing.md }}>
            Unlock Pro
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: theme.spacing.sm }}>
            One upgrade, everything included.
          </Text>

          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
            {FEATURES.map((feature) => (
              <View key={feature.label} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={20} color={theme.colors.primary} />
                <Text variant="body" style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
            {PLANS.map((plan) => {
              const active = selected === plan.id;
              return (
                <Card
                  key={plan.id}
                  onPress={() => setSelected(plan.id)}
                  testID={`paywall-plan-${plan.id}`}
                  style={{
                    borderWidth: 2,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <View style={styles.planRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.planLabelRow}>
                        <Text variant="title">{plan.label}</Text>
                        {plan.badge ? (
                          <Badge
                            label={plan.badge}
                            tone="accent"
                            style={{ marginLeft: theme.spacing.md }}
                          />
                        ) : null}
                      </View>
                      {plan.note ? (
                        <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                          {plan.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.planPrice}>
                      <Text variant="title" color={active ? 'primary' : 'text'}>
                        {plan.price}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {plan.period}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>

          {phase === 'error' ? (
            <Text variant="caption" color="danger" center style={{ marginTop: theme.spacing.lg }}>
              Something went wrong with the purchase. Please try again.
            </Text>
          ) : null}

          <Button
            title={processing ? 'Processing…' : 'Continue'}
            onPress={() => void purchase(selected)}
            loading={processing}
            testID="paywall-purchase"
            style={{ marginTop: theme.spacing.xl }}
          />

          <Pressable
            testID="paywall-restore"
            accessibilityRole="button"
            onPress={processing ? undefined : () => void restore()}
            style={{ marginTop: theme.spacing.lg, alignSelf: 'center' }}
            hitSlop={12}
          >
            <Text variant="caption" color="textMuted">
              Restore purchases
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBlock: {
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planPrice: {
    alignItems: 'flex-end',
  },
});
