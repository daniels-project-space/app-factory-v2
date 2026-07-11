// ReviewPulse — Welcome Screen
// Full implementation: brand splash + value props + sign-up/sign-in CTAs
// Full-bleed primary[700] background — no dark/light mode switching here

import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, Layout } from '@/constants';

const BG = Colors.primary[700];
const LIME = Colors.accent[300];

const VALUE_PROPS = [
  'Send review requests in 10 seconds',
  'Get alerted to every new review',
  '$14.99/month, no contract',
] as const;

// Pulse / EKG line — built from pure React Native Views
function PulseLine() {
  return (
    <View style={{ height: 20, flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      {/* Left flat segment */}
      <View style={{ flex: 2, height: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      {/* Spike: rising arm */}
      <View
        style={{
          width: 16,
          height: 1.5,
          backgroundColor: LIME,
          transform: [{ rotate: '-68deg' }],
          marginHorizontal: -4,
        }}
      />
      {/* Spike: falling arm */}
      <View
        style={{
          width: 16,
          height: 1.5,
          backgroundColor: LIME,
          transform: [{ rotate: '68deg' }],
          marginHorizontal: -4,
        }}
      />
      {/* Short lime tail after spike */}
      <View style={{ width: 20, height: 1.5, backgroundColor: 'rgba(202,255,71,0.4)' }} />
      {/* Right flat segment */}
      <View style={{ flex: 3, height: 1.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />
    </View>
  );
}

export default function WelcomeScreen() {
  const wordmarkAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const propsAnim    = useRef(new Animated.Value(0)).current;
  const ctaAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(wordmarkAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(headlineAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(propsAnim,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(ctaAnim,      { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [wordmarkAnim, headlineAnim, propsAnim, ctaAnim]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, paddingHorizontal: Layout.screenPaddingH }}>

        {/* ── Brand / Logo area ──────────────────────────────── */}
        <Animated.View style={{ opacity: wordmarkAnim, paddingTop: 52 }}>
          <Text
            style={{
              fontFamily: 'Barlow-Condensed-ExtraBold',
              fontSize: 26,
              letterSpacing: 7,
              color: '#FFFFFF',
              textTransform: 'uppercase',
            }}
          >
            REVIEW PULSE
          </Text>
          <PulseLine />
        </Animated.View>

        {/* Push content to the bottom third */}
        <View style={{ flex: 1 }} />

        {/* ── Hero headline ──────────────────────────────────── */}
        <Animated.View style={{ opacity: headlineAnim, marginBottom: Spacing.xl }}>
          <Text
            style={{
              fontFamily: 'Barlow-Condensed-ExtraBold',
              fontSize: 54,
              lineHeight: 54,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            YOUR{'\n'}REPUTATION{'\n'}IS ALWAYS{'\n'}ON.
          </Text>
        </Animated.View>

        {/* ── Value props ────────────────────────────────────── */}
        <Animated.View
          style={{ opacity: propsAnim, marginBottom: Spacing.xl, gap: Spacing.sm }}
        >
          {VALUE_PROPS.map((prop) => (
            <View
              key={prop}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: LIME,
                }}
              />
              <Text
                style={{
                  fontFamily: 'Source-Sans-Regular',
                  fontSize: 16,
                  lineHeight: 22,
                  color: 'rgba(255,255,255,0.82)',
                }}
              >
                {prop}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* ── CTAs ───────────────────────────────────────────── */}
        <Animated.View
          style={{ opacity: ctaAnim, paddingBottom: Spacing.xl, gap: Spacing.md }}
        >
          {/* Primary CTA — white bg, teal text */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/auth/sign-up');
            }}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: Radius.xs,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? 'rgba(255,255,255,0.88)' : '#FFFFFF',
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text
              style={{
                fontFamily: 'Barlow-Condensed-Bold',
                fontSize: 18,
                letterSpacing: 1.5,
                color: BG,
                textTransform: 'uppercase',
              }}
            >
              GET STARTED FREE
            </Text>
          </Pressable>

          {/* Secondary CTA — ghost */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/auth/sign-in');
            }}
            style={{ alignItems: 'center', paddingVertical: Spacing.sm }}
          >
            <Text
              style={{
                fontFamily: 'Source-Sans-Regular',
                fontSize: 16,
                color: 'rgba(255,255,255,0.68)',
              }}
            >
              Already have an account?{' '}
              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'Source-Sans-SemiBold',
                }}
              >
                Sign in
              </Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
