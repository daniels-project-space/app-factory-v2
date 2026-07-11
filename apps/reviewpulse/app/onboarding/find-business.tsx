// ReviewPulse — Onboarding Step 3: Find Your Business
// After Google OAuth, user searches for their business listing
// Calls Google Places API via search-business edge function
// NEEDS_CONFIG: Requires GOOGLE_PLACES_API_KEY env var on Supabase

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { MapPin, Star, ChevronRight, Building2 } from 'lucide-react-native';
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
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { useSettingsStore } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { supabase } from '@/lib/supabase';

type BusinessResult = {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  category: string;
  placeId: string;
};

function BusinessResultItem({
  item,
  onSelect,
}: {
  item: BusinessResult;
  onSelect: (item: BusinessResult) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(item);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: theme.borderDefault,
        backgroundColor: pressed ? theme.bgSurface2 : theme.bgSurface,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: Radius.md,
          backgroundColor: Colors.primary[50],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Building2 size={22} color={Colors.primary[500]} strokeWidth={1.5} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[Typography.h4, { color: theme.textPrimary, marginBottom: 2 }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
        >
          <MapPin size={12} color={theme.textTertiary} strokeWidth={1.5} />
          <Text
            style={[Typography.caption, { color: theme.textTertiary, flex: 1 }]}
            numberOfLines={1}
          >
            {item.address}
          </Text>
        </View>
        {item.rating > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.xs,
              marginTop: 2,
            }}
          >
            <Star
              size={12}
              color={Colors.warning[500]}
              fill={Colors.warning[500]}
              strokeWidth={1}
            />
            <Text style={[Typography.caption, { color: theme.textSecondary }]}>
              {item.rating}{item.reviewCount > 0 ? ` \u2022 ${item.reviewCount} reviews` : ''}{item.category ? ` \u2022 ${item.category}` : ''}
            </Text>
          </View>
        )}
      </View>

      <ChevronRight size={18} color={theme.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}

export default function FindBusinessScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);
  const user = useAuthStore((s) => s.user);
  const deactivateDemo = useDemoStore((s) => s.deactivate);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BusinessResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearching(true);
    setSearched(false);
    setError('');

    try {
      // Call the search-business edge function (Google Places Text Search)
      const { data, error: fnError } = await supabase.functions.invoke(
        'search-business',
        { body: { query: query.trim() } }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Search failed');
      }

      const response = data as {
        results?: Array<{
          place_id: string;
          name: string;
          formatted_address: string;
          rating?: number;
          user_ratings_total?: number;
          types?: string[];
        }>;
        error?: string;
      };

      if (response.error) {
        throw new Error(response.error);
      }

      const mapped: BusinessResult[] = (response.results ?? []).map((r) => ({
        id: r.place_id,
        name: r.name,
        address: r.formatted_address,
        rating: r.rating ?? 0,
        reviewCount: r.user_ratings_total ?? 0,
        category: r.types?.[0]?.replace(/_/g, ' ') ?? '',
        placeId: r.place_id,
      }));

      setResults(mapped);
      setSearched(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBusiness = async (item: BusinessResult) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelecting(true);
    setError('');

    try {
      const reviewLink = 'https://search.google.com/local/writereview?placeid=' + item.placeId;

      const { error: upsertError } = await supabase
        .from('business_profiles')
        .upsert(
          {
            user_id: user.id,
            platform: 'google',
            business_name: item.name,
            place_id: item.placeId,
            platform_id: item.placeId,
            review_link: reviewLink,
            is_active: true,
            connected_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,platform_id' }
        );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      // Deactivate demo mode now that a real business is connected
      deactivateDemo();

      router.push('/onboarding/first-request');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save business';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <View
        style={{ flex: 1, padding: Layout.screenPaddingH, paddingTop: Spacing.xl }}
      >
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
                width: i === 2 ? 24 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.primary[500],
              }}
            />
          ))}
        </View>

        {/* Header */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, marginBottom: Spacing.xs },
            ]}
          >
            {'FIND YOUR\nBUSINESS'}
          </Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>
            Search by name or address to connect your Google listing.
          </Text>
        </View>

        {/* Search input */}
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.sm,
            marginBottom: Spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              variant="search"
              value={query}
              onChangeText={setQuery}
              placeholder="Business name or address..."
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <Pressable
            onPress={handleSearch}
            disabled={searching || !query.trim()}
            style={({ pressed }) => ({
              height: Layout.inputHeight,
              paddingHorizontal: Spacing.md,
              borderRadius: Radius.xs,
              backgroundColor:
                !query.trim()
                  ? theme.borderDefault
                  : pressed
                  ? Colors.primary[700]
                  : Colors.primary[500],
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text
              style={[
                Typography.buttonSm,
                { color: !query.trim() ? theme.textTertiary : '#FFFFFF' },
              ]}
            >
              Search
            </Text>
          </Pressable>
        </View>

        {/* Error */}
        {error ? (
          <View
            style={{
              backgroundColor: Colors.error[100],
              borderRadius: Radius.sm,
              padding: Spacing.md,
              marginBottom: Spacing.md,
              borderLeftWidth: 3,
              borderLeftColor: Colors.error[500],
            }}
          >
            <Text style={[Typography.bodySm, { color: Colors.error[700] }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Results */}
        {searching || selecting ? (
          <View style={{ alignItems: 'center', paddingTop: Spacing.xl }}>
            <ActivityIndicator color={Colors.primary[500]} />
            <Text
              style={[
                Typography.bodySm,
                { color: theme.textSecondary, marginTop: Spacing.sm },
              ]}
            >
              {selecting ? 'Connecting your business...' : 'Searching Google Business...'}
            </Text>
          </View>
        ) : searched && results.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: Spacing.xl }}>
            <Text
              style={[
                Typography.body,
                { color: theme.textSecondary, textAlign: 'center' },
              ]}
            >
              {'No businesses found.\nTry a different name or address.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BusinessResultItem item={item} onSelect={handleSelectBusiness} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}
      </View>

      {/* Bottom skip */}
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
          label="I don't see my business"
          variant="ghost"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOnboardingComplete(true);
            router.replace('/(tabs)');
          }}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
