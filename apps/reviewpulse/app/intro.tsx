// ReviewPulse — Pre-Auth Intro Slides
// "Command Center Boot Sequence" — 3 dark immersive slides with geometric
// illustrations, lime pulse accents, progress dots, skip/CTA.
// Shown once before auth. hasSeenIntro persisted in AsyncStorage.

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, FontFamily } from '@/constants';
import { useSettingsStore } from '@/store/settings';

const { width: SCREEN_W } = Dimensions.get('window');

const BG = Colors.primary[950]; // Deep near-black teal
const TEAL = Colors.primary[700];
const TEAL_LIGHT = Colors.primary[300];
const LIME = Colors.accent[300];
const WHITE = '#F0F6FF';
const WHITE_DIM = 'rgba(240,246,255,0.5)';

// ─── Slide Data ──────────────────────────────────────────────────────────────

type Slide = {
  key: string;
  headline: string;
  subtext: string;
  Illustration: React.FC<{ fadeAnim: Animated.Value }>;
};

// ─── Illustration 1: Stacked Review Cards ────────────────────────────────────

function ReviewCardsIllustration({ fadeAnim }: { fadeAnim: Animated.Value }) {
  const cards = [
    { stars: 5, offset: 0, opacity: 0.35, delay: 200 },
    { stars: 5, offset: 1, opacity: 0.55, delay: 400 },
    { stars: 4, offset: 2, opacity: 1.0, delay: 600 },
  ];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
      {cards.map((card, i) => {
        const slideUp = fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30 + i * 10, 0],
        });
        return (
          <Animated.View
            key={card.offset}
            style={{
              position: 'absolute',
              top: 20 + card.offset * 28,
              width: SCREEN_W * 0.72 - card.offset * 8,
              height: 72,
              backgroundColor: `rgba(13,92,92,${card.opacity * 0.4})`,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: `rgba(58,172,172,${card.opacity * 0.5})`,
              paddingHorizontal: 16,
              paddingVertical: 12,
              justifyContent: 'space-between',
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, card.opacity],
              }),
              transform: [{ translateY: slideUp }],
            }}
          >
            {/* Stars row */}
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: card.stars }).map((_, si) => (
                <View
                  key={si}
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: LIME,
                    borderRadius: 2,
                    transform: [{ rotate: '45deg' }],
                  }}
                />
              ))}
              {card.stars < 5 &&
                Array.from({ length: 5 - card.stars }).map((_, si) => (
                  <View
                    key={`e${si}`}
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: 'rgba(202,255,71,0.15)',
                      borderRadius: 2,
                      transform: [{ rotate: '45deg' }],
                    }}
                  />
                ))}
            </View>
            {/* Fake text lines */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View
                style={{
                  height: 4,
                  width: '60%',
                  backgroundColor: `rgba(240,246,255,${card.opacity * 0.3})`,
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  height: 4,
                  width: '25%',
                  backgroundColor: `rgba(240,246,255,${card.opacity * 0.15})`,
                  borderRadius: 2,
                }}
              />
            </View>
          </Animated.View>
        );
      })}

      {/* Lime "LIVE" badge on top card */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 20 + 2 * 28 - 8,
          right: SCREEN_W * 0.14 + 4 + 8,
          backgroundColor: LIME,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: Radius.xs,
          opacity: fadeAnim,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.barlowCondensedBold,
            fontSize: 10,
            letterSpacing: 1,
            color: Colors.primary[950],
            textTransform: 'uppercase',
          }}
        >
          LIVE
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Illustration 2: SMS Request ─────────────────────────────────────────────

function SmsIllustration({ fadeAnim }: { fadeAnim: Animated.Value }) {
  const slideLeft = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
      {/* Phone outline */}
      <Animated.View
        style={{
          width: 160,
          height: 200,
          borderWidth: 2,
          borderColor: TEAL_LIGHT,
          borderRadius: 20,
          padding: 12,
          paddingTop: 24,
          opacity: fadeAnim,
          transform: [{ translateX: slideLeft }],
        }}
      >
        {/* Notch */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            marginLeft: -20,
            width: 40,
            height: 4,
            backgroundColor: 'rgba(58,172,172,0.3)',
            borderRadius: 2,
          }}
        />

        {/* SMS bubble sent */}
        <Animated.View
          style={{
            alignSelf: 'flex-end',
            backgroundColor: TEAL,
            borderRadius: 10,
            borderBottomRightRadius: 2,
            paddingHorizontal: 10,
            paddingVertical: 8,
            maxWidth: 110,
            marginBottom: 8,
            opacity: fadeAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            }),
          }}
        >
          <Text
            style={{
              fontFamily: FontFamily.sourceSansRegular,
              fontSize: 9,
              color: WHITE,
              lineHeight: 13,
            }}
          >
            Hi Mike! Thanks for choosing us. Mind leaving a quick review?
          </Text>
        </Animated.View>

        {/* Link preview */}
        <Animated.View
          style={{
            alignSelf: 'flex-end',
            backgroundColor: `${LIME}20`,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: `${LIME}40`,
            paddingHorizontal: 8,
            paddingVertical: 6,
            maxWidth: 110,
            marginBottom: 8,
            opacity: fadeAnim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0, 0, 1],
            }),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: LIME,
                borderRadius: 4,
              }}
            />
            <Text
              style={{
                fontFamily: FontFamily.sourceSansSemiBold,
                fontSize: 8,
                color: LIME,
              }}
            >
              Leave a Review
            </Text>
          </View>
        </Animated.View>

        {/* Delivered check */}
        <Animated.View
          style={{
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            opacity: fadeAnim.interpolate({
              inputRange: [0, 0.85, 1],
              outputRange: [0, 0, 0.7],
            }),
          }}
        >
          <Text
            style={{
              fontFamily: FontFamily.sourceSansRegular,
              fontSize: 8,
              color: TEAL_LIGHT,
            }}
          >
            Delivered
          </Text>
          <View style={{ flexDirection: 'row', gap: 1 }}>
            <View style={{ width: 6, height: 6 }}>
              <View
                style={{
                  position: 'absolute',
                  width: 6,
                  height: 3,
                  borderLeftWidth: 1.5,
                  borderBottomWidth: 1.5,
                  borderColor: LIME,
                  transform: [{ rotate: '-45deg' }],
                  top: 1,
                }}
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* 10-second badge */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 8,
          left: SCREEN_W * 0.5 - 110,
          backgroundColor: `${LIME}18`,
          borderWidth: 1,
          borderColor: `${LIME}30`,
          borderRadius: Radius.full,
          paddingHorizontal: 12,
          paddingVertical: 5,
          opacity: fadeAnim.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [0, 0, 1],
          }),
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.barlowCondensedSemiBold,
            fontSize: 11,
            letterSpacing: 0.5,
            color: LIME,
          }}
        >
          10 SECONDS
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Illustration 3: AI Reply Generation ─────────────────────────────────────

function AiReplyIllustration({ fadeAnim }: { fadeAnim: Animated.Value }) {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
      {/* Incoming review card */}
      <Animated.View
        style={{
          width: SCREEN_W * 0.72,
          backgroundColor: 'rgba(13,92,92,0.2)',
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: 'rgba(58,172,172,0.25)',
          padding: 14,
          marginBottom: 12,
          opacity: fadeAnim,
        }}
      >
        {/* Stars */}
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={{
                width: 10,
                height: 10,
                backgroundColor: s <= 2 ? Colors.error[500] : 'rgba(202,255,71,0.12)',
                borderRadius: 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
          ))}
          <Text
            style={{
              fontFamily: FontFamily.sourceSansRegular,
              fontSize: 10,
              color: Colors.error[300],
              marginLeft: 6,
            }}
          >
            2 stars
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ height: 3, width: '70%', backgroundColor: 'rgba(240,246,255,0.15)', borderRadius: 2 }} />
          <View style={{ height: 3, width: '20%', backgroundColor: 'rgba(240,246,255,0.08)', borderRadius: 2 }} />
        </View>
      </Animated.View>

      {/* AI draft reply */}
      <Animated.View
        style={{
          width: SCREEN_W * 0.72,
          backgroundColor: `${TEAL}30`,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: `${LIME}30`,
          padding: 14,
          opacity: fadeAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          }),
        }}
      >
        {/* AI badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 1.5,
              borderColor: LIME,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                backgroundColor: LIME,
                borderRadius: 1,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: FontFamily.barlowCondensedSemiBold,
              fontSize: 11,
              letterSpacing: 0.8,
              color: LIME,
              textTransform: 'uppercase',
            }}
          >
            AI DRAFT
          </Text>
        </View>

        {/* Typed reply lines */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: FontFamily.sourceSansRegular,
                fontSize: 11,
                color: WHITE,
                lineHeight: 16,
              }}
            >
              Thank you for your feedback, Sarah. We're sorry about the wait...
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: 3, width: '40%', backgroundColor: `${WHITE}20`, borderRadius: 2 }} />
            {/* Blinking cursor */}
            <View
              style={{
                width: 2,
                height: 14,
                backgroundColor: cursorVisible ? LIME : 'transparent',
                marginLeft: 3,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Slide Definitions ───────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    key: 'monitor',
    headline: 'EVERY REVIEW.\nONE SCREEN.',
    subtext: 'Monitor Google and Yelp reviews in real time. Get alerted the moment a customer posts.',
    Illustration: ReviewCardsIllustration,
  },
  {
    key: 'request',
    headline: 'REQUEST REVIEWS\nIN SECONDS.',
    subtext: 'Send an SMS with your review link right after the job. 98% open rate beats email every time.',
    Illustration: SmsIllustration,
  },
  {
    key: 'ai',
    headline: 'AI REPLIES THAT\nSOUND LIKE YOU.',
    subtext: 'One-tap AI drafts for every review. Professional responses in seconds, not minutes.',
    Illustration: AiReplyIllustration,
  },
];

// ─── Progress Dots ───────────────────────────────────────────────────────────

function ProgressDots({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            width: i === activeIndex ? 28 : 8,
            borderRadius: 2,
            backgroundColor: LIME,
            opacity: i === activeIndex ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Intro Screen ───────────────────────────────────────────────────────

export default function IntroScreen() {
  const setHasSeenIntro = useSettingsStore((s) => s.setHasSeenIntro);
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();

  // Per-slide fade animations
  const fadeAnims = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  // Animate current slide in
  useEffect(() => {
    fadeAnims[currentIndex].setValue(0);
    Animated.timing(fadeAnims[currentIndex], {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, fadeAnims]);

  // Initial slide animation
  useEffect(() => {
    Animated.timing(fadeAnims[0], {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnims]);

  const finish = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasSeenIntro(true);
    router.replace('/auth/welcome');
  }, [setHasSeenIntro]);

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
  }, []);

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Gradient overlay — top-left teal glow */}
      <View
        style={{
          position: 'absolute',
          top: -120,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: TEAL,
          opacity: 0.06,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar: Skip button */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            paddingTop: 8,
            height: 48,
          }}
        >
          {!isLastSlide && (
            <Pressable
              onPress={finish}
              testID="intro-skip-btn"
              accessibilityRole="button"
              accessibilityLabel="Skip intro"
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.full,
                backgroundColor: pressed ? 'rgba(240,246,255,0.08)' : 'transparent',
              })}
              hitSlop={12}
            >
              <Text
                style={{
                  fontFamily: FontFamily.sourceSansSemiBold,
                  fontSize: 15,
                  color: WHITE_DIM,
                  letterSpacing: 0.3,
                }}
              >
                Skip
              </Text>
            </Pressable>
          )}
        </View>

        {/* Current slide — conditional render (works on web + native) */}
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnims[currentIndex],
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
          accessibilityLabel={`Slide ${currentIndex + 1} of ${SLIDES.length}: ${currentSlide?.headline ?? ''}`}
        >
          {/* Grid background lines */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.04,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={`h${i}`}
                style={{
                  position: 'absolute',
                  top: `${(i + 1) * 8}%` as unknown as number,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: WHITE,
                }}
              />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={`v${i}`}
                style={{
                  position: 'absolute',
                  left: `${(i + 1) * 16}%` as unknown as number,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: WHITE,
                }}
              />
            ))}
          </View>

          {/* Illustration */}
          {currentSlide && (
            <View style={{ marginBottom: 48 }}>
              <currentSlide.Illustration fadeAnim={fadeAnims[currentIndex]} />
            </View>
          )}

          {/* Headline */}
          <Text
            style={{
              fontFamily: FontFamily.barlowCondensedExtraBold,
              fontSize: 38,
              lineHeight: 42,
              letterSpacing: -0.5,
              color: WHITE,
              textAlign: 'left',
              marginBottom: 16,
            }}
          >
            {currentSlide?.headline ?? ''}
          </Text>

          {/* Subtext */}
          <Text
            style={{
              fontFamily: FontFamily.sourceSansRegular,
              fontSize: 17,
              lineHeight: 26,
              color: WHITE_DIM,
              textAlign: 'left',
              maxWidth: 320,
            }}
          >
            {currentSlide?.subtext ?? ''}
          </Text>
        </Animated.View>

        {/* Bottom: dots + CTA */}
        <View
          style={{
            paddingHorizontal: 32,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            gap: 28,
          }}
        >
          {/* Progress dots */}
          <ProgressDots
            count={SLIDES.length}
            activeIndex={currentIndex}
          />

          {/* CTA button (only on last slide) OR next indicator */}
          {isLastSlide ? (
            <Pressable
              onPress={finish}
              testID="intro-get-started-btn"
              accessibilityRole="button"
              accessibilityLabel="Get started"
              style={({ pressed }) => ({
                backgroundColor: pressed ? Colors.accent[400] : LIME,
                height: 56,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: LIME,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              })}
            >
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedBold,
                  fontSize: 19,
                  letterSpacing: 1,
                  color: Colors.primary[950],
                  textTransform: 'uppercase',
                }}
              >
                GET STARTED
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={goNext}
              testID="intro-next-btn"
              accessibilityRole="button"
              accessibilityLabel="Next slide"
              style={({ pressed }) => ({
                height: 56,
                borderRadius: Radius.md,
                borderWidth: 1.5,
                borderColor: `${TEAL_LIGHT}40`,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(58,172,172,0.08)' : 'transparent',
              })}
            >
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedBold,
                  fontSize: 17,
                  letterSpacing: 0.8,
                  color: TEAL_LIGHT,
                  textTransform: 'uppercase',
                }}
              >
                NEXT
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
