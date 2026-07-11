// ReviewPulse — Onboarding Step 1: Business Type Selection
// 8-category grid, single-select, personalization for SMS templates
// Saves business_type to profiles table, then advances to connect-google

import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Wrench,
  Scissors,
  Heart,
  UtensilsCrossed,
  Car,
  Camera,
  Briefcase,
  MoreHorizontal,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
} from '@/constants';
import { Button } from '@/components/shared/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

type BusinessCategory = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

const CATEGORIES: BusinessCategory[] = [
  { id: 'trades',       label: 'Home Services',  Icon: Wrench },
  { id: 'beauty',       label: 'Beauty & Care',   Icon: Scissors },
  { id: 'health',       label: 'Health & Wellness', Icon: Heart },
  { id: 'food',         label: 'Food & Beverage', Icon: UtensilsCrossed },
  { id: 'auto',         label: 'Automotive',      Icon: Car },
  { id: 'photo',        label: 'Photography',     Icon: Camera },
  { id: 'professional', label: 'Professional',    Icon: Briefcase },
  { id: 'other',        label: 'Other',           Icon: MoreHorizontal },
];

export default function BusinessTypeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // One scale ref per tile
  const scaleRefs = useRef(CATEGORIES.map(() => new Animated.Value(1))).current;

  const handleSelect = (id: string, index: number) => {
    if (selected === id) return; // Already selected
    Haptics.selectionAsync();
    setSelected(id);

    Animated.sequence([
      Animated.spring(scaleRefs[index], {
        toValue: 0.94,
        useNativeDriver: true,
        speed: 60,
        bounciness: 2,
      }),
      Animated.spring(scaleRefs[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (user) {
        // Non-blocking — column may not exist yet until migration 00002 runs
        await supabase
          .from('profiles')
          .update({ business_type: selected } as Record<string, string>)
          .eq('id', user.id);
      }
    } catch {
      // Silent — business_type column added in migration 00002
    } finally {
      setSaving(false);
      router.push('/onboarding/connect-google');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <ScrollView
        contentContainerStyle={{
          padding: Layout.screenPaddingH,
          paddingTop: Spacing.xl,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: Spacing.xl }}>
          {/* Progress dots */}
          <View
            style={{
              flexDirection: 'row',
              gap: Spacing.xs,
              marginBottom: Spacing.lg,
            }}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: i === 0 ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    i === 0 ? Colors.primary[500] : theme.borderDefault,
                }}
              />
            ))}
          </View>

          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, marginBottom: Spacing.xs },
            ]}
          >
            WHAT TYPE OF{'\n'}BUSINESS?
          </Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>
            We'll personalize your review templates.
          </Text>
        </View>

        {/* 2-column grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.sm,
          }}
        >
          {CATEGORIES.map((cat, index) => {
            const isSelected = selected === cat.id;

            return (
              <Animated.View
                key={cat.id}
                style={{
                  width: '47.5%',
                  transform: [{ scale: scaleRefs[index] }],
                }}
              >
                <Pressable
                  onPress={() => handleSelect(cat.id, index)}
                  style={{
                    height: 80,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.sm,
                    paddingHorizontal: Spacing.md,
                    borderRadius: Radius.md,
                    borderWidth: isSelected ? 2 : 1.5,
                    borderColor: isSelected
                      ? Colors.primary[500]
                      : theme.borderDefault,
                    backgroundColor: isSelected
                      ? isDark
                        ? Colors.primary[900]
                        : Colors.primary[50]
                      : theme.bgSurface,
                  }}
                >
                  <cat.Icon
                    size={20}
                    color={
                      isSelected
                        ? Colors.primary[isDark ? 300 : 500]
                        : theme.textSecondary
                    }
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  <Text
                    style={[
                      Typography.bodySm,
                      {
                        flex: 1,
                        color: isSelected
                          ? Colors.primary[isDark ? 300 : 700]
                          : theme.textPrimary,
                        fontFamily: isSelected
                          ? 'Source-Sans-SemiBold'
                          : 'Source-Sans-Regular',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {cat.label}
                  </Text>

                  {/* Lime checkmark when selected */}
                  {isSelected && (
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: Colors.accent[300],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check
                        size={11}
                        color={Colors.primary[900]}
                        strokeWidth={3}
                      />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed bottom button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: Layout.screenPaddingH,
          paddingBottom: 36,
          backgroundColor: theme.bgBase,
          borderTopWidth: 1,
          borderTopColor: theme.borderDefault,
        }}
      >
        <Button
          label="CONTINUE"
          variant="primary"
          onPress={handleContinue}
          loading={saving}
          disabled={!selected || saving}
          fullWidth
        />
        <Pressable
          onPress={() => router.push('/onboarding/connect-google')}
          style={{ alignItems: 'center', paddingTop: Spacing.md }}
          hitSlop={8}
        >
          <Text style={[Typography.bodySm, { color: theme.textTertiary }]}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
