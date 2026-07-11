// ReviewPulse — Yelp Connect Screen (Sprint 13)
// Search Yelp Fusion API for business, connect to monitoring feed.
// Pro-only feature. Navigated from Settings > Connected Platforms > Yelp.

import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  MapPin,
  Check,
  Lock,
  AlertCircle,
} from 'lucide-react-native';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
  Shadows,
  FontFamily,
  HapticMap,
} from '@/constants';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Skeleton } from '@/components/shared/SkeletonLoader';
import { StarRatingDisplay } from '@/components/shared/StarRating';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useIsPro } from '@/hooks/useIsPro';

// ─── Types ────────────────────────────────────────────────────────────────────

type YelpResult = {
  yelp_id: string;
  name: string;
  rating: number;
  review_count: number;
  address: string;
  city: string;
  state: string;
  url: string;
  image_url: string;
  categories: string[];
  phone: string;
};

type ConnectState = 'idle' | 'connecting' | 'connected';

const YELP_RED = '#D32323';

// ─── Skeleton Result ──────────────────────────────────────────────────────────

function SkeletonResult({ isDark }: { isDark: boolean }) {
  return (
    <View
      style={{
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
      }}
    >
      <Skeleton width="70%" height={16} />
      <View style={{ marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm }}>
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
      <Skeleton width="90%" height={12} style={{ marginTop: Spacing.sm }} />
    </View>
  );
}

// ─── Business Result Card ─────────────────────────────────────────────────────

function BusinessResultCard({
  business,
  isDark,
  connectState,
  onConnect,
}: {
  business: YelpResult;
  isDark: boolean;
  connectState: ConnectState;
  onConnect: () => void;
}) {
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
        ...(isDark ? {} : Shadows.sm),
      }}
    >
      {/* Business name */}
      <Text
        style={{
          fontFamily: FontFamily.sourceSansSemiBold,
          fontSize: 15,
          color: theme.textPrimary,
        }}
        numberOfLines={1}
      >
        {business.name}
      </Text>

      {/* Rating + review count */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          marginTop: Spacing.xs,
        }}
      >
        <StarRatingDisplay rating={business.rating} size="sm" />
        <Text style={[Typography.caption, { color: theme.textTertiary }]}>
          {business.rating.toFixed(1)}
        </Text>
        <View
          style={{
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: theme.textTertiary,
          }}
        />
        <Text style={[Typography.caption, { color: theme.textTertiary }]}>
          {business.review_count} reviews
        </Text>
      </View>

      {/* Address */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: Spacing.xs,
        }}
      >
        <MapPin size={12} color={theme.textTertiary} strokeWidth={1.5} />
        <Text
          style={[Typography.caption, { color: theme.textTertiary, flex: 1 }]}
          numberOfLines={1}
        >
          {business.address}
        </Text>
      </View>

      {/* Categories */}
      {business.categories.length > 0 && (
        <Text
          style={[
            Typography.caption,
            { color: theme.textTertiary, marginTop: 2, fontStyle: 'italic' },
          ]}
          numberOfLines={1}
        >
          {business.categories.slice(0, 3).join(' · ')}
        </Text>
      )}

      {/* Connect button */}
      <View style={{ alignItems: 'flex-end', marginTop: Spacing.sm }}>
        {connectState === 'connected' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: Colors.primary[500],
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: Radius.sm,
            }}
          >
            <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedBold,
                fontSize: 12,
                letterSpacing: 0.6,
                color: '#FFFFFF',
                textTransform: 'uppercase',
              }}
            >
              Connected
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              HapticMap.connectPlatform();
              onConnect();
            }}
            disabled={connectState === 'connecting'}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: Radius.sm,
              borderWidth: 1.5,
              borderColor: Colors.primary[isDark ? 300 : 500],
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {connectState === 'connecting' ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary[isDark ? 300 : 500]}
                style={{ width: 13, height: 13 }}
              />
            ) : null}
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedBold,
                fontSize: 12,
                letterSpacing: 0.6,
                color: Colors.primary[isDark ? 300 : 500],
                textTransform: 'uppercase',
              }}
            >
              {connectState === 'connecting' ? 'Connecting' : 'Connect'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function YelpConnectScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isPro } = useIsPro();

  // Search state
  const [term, setTerm] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<YelpResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Per-item connect state
  const [connectStates, setConnectStates] = useState<Record<string, ConnectState>>({});

  // Success state
  const [connectedBusiness, setConnectedBusiness] = useState<YelpResult | null>(null);
  const successScale = useRef(new Animated.Value(0)).current;

  // Location input ref for keyboard flow
  const locationInputRef = useRef<TextInput>(null);

  // ─── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (term.trim().length < 2 || location.trim().length < 2) return;

    HapticMap.buttonPress();
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('yelp-search', {
        body: { term: term.trim(), location: location.trim() },
      });

      if (error) {
        // Detect missing API key — surface a clear message rather than a generic error
        const msg = (error as { message?: string }).message ?? '';
        const body = (data as { error?: string } | null)?.error ?? '';
        if (body.includes('not configured') || msg.includes('503') || msg.includes('not configured')) {
          setSearchError('Yelp monitoring is not yet available. The Yelp API key has not been configured on this server. Contact support to enable this feature.');
        } else {
          setSearchError(msg || 'Search failed. Please try again.');
        }
        return;
      }
      setResults(data?.results ?? []);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ─── Connect ───────────────────────────────────────────────────────────────

  const handleConnect = async (business: YelpResult) => {
    if (!user) return;

    setConnectStates((prev) => ({ ...prev, [business.yelp_id]: 'connecting' }));

    try {
      // Check if already connected
      const { data: existing } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'yelp')
        .eq('platform_id', business.yelp_id)
        .maybeSingle();

      if (existing) {
        // Reactivate if exists
        const { error: reactivateErr } = await supabase
          .from('business_profiles')
          .update({ is_active: true, business_name: business.name })
          .eq('id', existing.id)
          .eq('user_id', user.id);
        if (reactivateErr) throw reactivateErr;
      } else {
        // Insert new business profile
        const { error } = await supabase.from('business_profiles').insert({
          user_id: user.id,
          platform: 'yelp',
          platform_id: business.yelp_id,
          business_name: business.name,
          review_link: business.url,
          current_rating: business.rating,
          total_reviews: business.review_count,
          is_active: true,
        });

        if (error) throw error;
      }

      setConnectStates((prev) => ({ ...prev, [business.yelp_id]: 'connected' }));

      // Show success state after brief delay
      setTimeout(() => {
        setConnectedBusiness(business);
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 12,
        }).start();
      }, 400);

      HapticMap.reviewSent();
    } catch (err: unknown) {
      setConnectStates((prev) => ({ ...prev, [business.yelp_id]: 'idle' }));
      Alert.alert('Connection Failed', err instanceof Error ? err.message : 'Please try again.');
      HapticMap.requestFailed();
    }
  };

  // ─── Pro Gate ──────────────────────────────────────────────────────────────

  if (!isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Layout.screenPaddingH,
            height: Layout.headerHeight,
          }}
        >
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              padding: Spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>
          <Text style={[Typography.h2, { color: theme.textPrimary, marginLeft: Spacing.sm }]}>
            CONNECT YELP
          </Text>
        </View>

        {/* Teal accent strip */}
        <View
          style={{
            height: 3,
            backgroundColor: isDark ? Colors.primary[300] : Colors.primary[500],
          }}
        />

        {/* Pro gate content */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: Layout.screenPaddingH,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark ? `${Colors.accent[700]}20` : Colors.accent[50],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.lg,
            }}
          >
            <Lock
              size={32}
              color={isDark ? Colors.accent[400] : Colors.accent[700]}
              strokeWidth={1.8}
            />
          </View>

          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
            ]}
          >
            YELP MONITORING
          </Text>
          <Text
            style={[
              Typography.h2,
              { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.lg },
            ]}
          >
            IS A PRO FEATURE
          </Text>

          <Text
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                textAlign: 'center',
                maxWidth: 280,
                marginBottom: Spacing.xl,
                lineHeight: 24,
              },
            ]}
          >
            Connect your Yelp profile to monitor reviews and track your rating alongside Google.
          </Text>

          <Button
            label="UPGRADE TO PRO — $14.99/MO"
            onPress={() => {
              HapticMap.buttonPress();
              router.push('/paywall');
            }}
            variant="primary"
            fullWidth
          />

          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            style={({ pressed }) => ({
              marginTop: Spacing.lg,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={[Typography.bodySm, { color: theme.textTertiary }]}
            >
              Skip for now
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Success State ─────────────────────────────────────────────────────────

  if (connectedBusiness) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.bgBase,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Layout.screenPaddingH,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: successScale }],
            marginBottom: Spacing.xl,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark
                ? `${Colors.success[500]}20`
                : Colors.success[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={36} color={Colors.success[500]} strokeWidth={2.5} />
          </View>
        </Animated.View>

        <Text
          style={[Typography.h1, { color: theme.textPrimary, textAlign: 'center' }]}
        >
          YELP CONNECTED
        </Text>

        <Text
          style={[
            Typography.h3,
            { color: theme.textPrimary, textAlign: 'center', marginTop: Spacing.md },
          ]}
        >
          {connectedBusiness.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            marginTop: Spacing.sm,
          }}
        >
          <StarRatingDisplay rating={connectedBusiness.rating} size="sm" />
          <Text style={[Typography.bodySm, { color: theme.textSecondary }]}>
            {connectedBusiness.rating.toFixed(1)} · {connectedBusiness.review_count} reviews
          </Text>
        </View>

        <Text
          style={[
            Typography.body,
            {
              color: theme.textSecondary,
              textAlign: 'center',
              marginTop: Spacing.xl,
              maxWidth: 260,
              lineHeight: 24,
            },
          ]}
        >
          Reviews will appear in your feed within 15 minutes.
        </Text>

        <View style={{ width: '100%', marginTop: Spacing['2xl'] }}>
          <Button
            label="DONE"
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            variant="primary"
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Search State ──────────────────────────────────────────────────────────

  const canSearch = term.trim().length >= 2 && location.trim().length >= 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Layout.screenPaddingH,
            height: Layout.headerHeight,
          }}
        >
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              padding: Spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>

          <Text style={[Typography.h2, { color: theme.textPrimary, marginLeft: Spacing.sm, flex: 1 }]}>
            CONNECT YELP
          </Text>

          {/* Pro badge */}
          <View
            style={{
              backgroundColor: isDark ? `${Colors.accent[300]}20` : Colors.accent[50],
              paddingHorizontal: Spacing.sm,
              paddingVertical: 3,
              borderRadius: Radius.sm,
              borderWidth: 1,
              borderColor: Colors.accent[400],
            }}
          >
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedBold,
                fontSize: 11,
                letterSpacing: 0.6,
                color: Colors.accent[700],
                textTransform: 'uppercase',
              }}
            >
              PRO
            </Text>
          </View>
        </View>

        {/* Teal accent strip */}
        <View
          style={{
            height: 3,
            backgroundColor: isDark ? Colors.primary[300] : Colors.primary[500],
          }}
        />

        {/* Content */}
        <View style={{ flex: 1, padding: Layout.screenPaddingH, paddingTop: Spacing.lg }}>
          {/* Yelp identity badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: YELP_RED,
              }}
            />
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedBold,
                fontSize: 14,
                letterSpacing: 0.5,
                color: YELP_RED,
                textTransform: 'uppercase',
              }}
            >
              Yelp
            </Text>
          </View>
          <Text
            style={[
              Typography.bodySm,
              { color: theme.textSecondary, marginBottom: Spacing.lg },
            ]}
          >
            Find your business on Yelp to start monitoring reviews
          </Text>

          {/* Search inputs */}
          <Input
            placeholder="Business name"
            value={term}
            onChangeText={setTerm}
            variant="search"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => locationInputRef.current?.focus?.()}
          />
          <View style={{ height: Spacing.sm }} />
          <Input
            ref={locationInputRef}
            placeholder="City or ZIP code"
            value={location}
            onChangeText={setLocation}
            returnKeyType="search"
            onSubmitEditing={() => canSearch && handleSearch()}
          />

          {/* Search button */}
          <Pressable
            onPress={handleSearch}
            disabled={!canSearch || searching}
            style={({ pressed }) => ({
              backgroundColor: canSearch ? YELP_RED : isDark ? DarkTheme.bgSurface3 : Colors.neutral[200],
              paddingVertical: Spacing.md,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: Spacing.sm,
              marginTop: Spacing.md,
              opacity: (!canSearch || searching) ? 0.6 : pressed ? 0.85 : 1,
            })}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Search size={16} color={canSearch ? '#FFFFFF' : theme.textTertiary} strokeWidth={2} />
            )}
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedBold,
                fontSize: 14,
                letterSpacing: 0.8,
                color: canSearch ? '#FFFFFF' : theme.textTertiary,
                textTransform: 'uppercase',
              }}
            >
              {searching ? 'Searching Yelp...' : 'Search Yelp'}
            </Text>
          </Pressable>

          {/* Results */}
          {hasSearched && !searching && (
            <View style={{ flex: 1, marginTop: Spacing.lg }}>
              {/* Results header */}
              <Text
                style={[
                  Typography.label,
                  { color: theme.textTertiary, marginBottom: Spacing.sm },
                ]}
              >
                {results.length > 0
                  ? `RESULTS · ${results.length} FOUND`
                  : searchError
                    ? 'ERROR'
                    : 'NO RESULTS'}
              </Text>

              {/* Error state */}
              {searchError && (
                <View
                  style={{
                    backgroundColor: isDark ? `${Colors.error[700]}15` : Colors.error[100],
                    borderRadius: Radius.md,
                    padding: Spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.sm,
                  }}
                >
                  <AlertCircle size={18} color={Colors.error[500]} strokeWidth={2} />
                  <Text
                    style={[
                      Typography.bodySm,
                      { color: Colors.error[isDark ? 300 : 700], flex: 1 },
                    ]}
                  >
                    {searchError}
                  </Text>
                </View>
              )}

              {/* Empty state */}
              {!searchError && results.length === 0 && (
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: Spacing['2xl'],
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.slate[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: Spacing.md,
                    }}
                  >
                    <AlertCircle
                      size={24}
                      color={theme.textTertiary}
                      strokeWidth={1.5}
                    />
                  </View>
                  <Text
                    style={[Typography.h4, { color: theme.textSecondary, textAlign: 'center' }]}
                  >
                    No businesses found
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.xs },
                    ]}
                  >
                    Try different keywords or check the spelling
                  </Text>
                </View>
              )}

              {/* Results list */}
              {results.length > 0 && (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.yelp_id}
                  renderItem={({ item }) => (
                    <BusinessResultCard
                      business={item}
                      isDark={isDark}
                      connectState={connectStates[item.yelp_id] ?? 'idle'}
                      onConnect={() => handleConnect(item)}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: Spacing['2xl'] }}
                />
              )}
            </View>
          )}

          {/* Loading skeletons */}
          {searching && (
            <View style={{ marginTop: Spacing.lg }}>
              <Text
                style={[
                  Typography.label,
                  { color: theme.textTertiary, marginBottom: Spacing.sm },
                ]}
              >
                SEARCHING YELP...
              </Text>
              <SkeletonResult isDark={isDark} />
              <SkeletonResult isDark={isDark} />
              <SkeletonResult isDark={isDark} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
