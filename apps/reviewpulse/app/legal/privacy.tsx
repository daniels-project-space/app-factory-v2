// ReviewPulse — Privacy Policy Screen
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, LightTheme, DarkTheme, Typography, Layout, Spacing } from '@/constants';

const sections = [
  { title: '1. Information We Collect', body: 'When you create an account, we collect your email address, business name, and business type. When you connect a Google Business Profile or Yelp account, we access your business reviews, ratings, and profile information through official APIs. When you use SMS review requests, you provide customer names and phone numbers. We collect anonymous usage analytics through PostHog and push notification tokens for review alerts.' },
  { title: '2. How We Use Your Information', body: 'We use your information to provide our services (display reviews, send SMS requests, generate AI reply suggestions, deliver push notifications), improve the app through anonymous analytics, communicate service updates, and ensure platform security.' },
  { title: '3. Information Sharing', body: 'We share data with Twilio (SMS delivery), Google/Yelp (review data via APIs), Supabase (data storage), RevenueCat (subscription management), and Sentry (crash reporting). We do not sell your personal information to third parties.' },
  { title: '4. Data Retention', body: 'Account data is retained while your account is active. Customer contact information is retained for 12 months after last use. Analytics data is retained for 24 months. You may request deletion of your data at any time through the app settings.' },
  { title: '5. Your Rights', body: 'You may access, update, or delete your account data at any time. You may export your review data. You may opt out of analytics collection. You may request complete data deletion by contacting support.' },
  { title: '6. Security', body: 'We use industry-standard encryption for data in transit (TLS 1.3) and at rest (AES-256). Authentication tokens are stored securely using platform-native secure storage. We conduct regular security reviews.' },
  { title: '7. Contact', body: 'For privacy questions, contact us at privacy@reviewpulse.app.' },
];

export default function PrivacyPolicyScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: Layout.screenPaddingH, paddingVertical: Spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
          <ArrowLeft size={24} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.h3, { color: theme.textPrimary, marginLeft: Spacing.xs }]}>Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: Layout.screenPaddingH, paddingBottom: 60 }}>
        <Text style={[Typography.caption, { color: theme.textTertiary, marginBottom: Spacing.lg }]}>
          Effective Date: March 12, 2026  |  Last Updated: March 12, 2026
        </Text>
        {sections.map((s) => (
          <View key={s.title} style={{ marginBottom: Spacing.lg }}>
            <Text style={[Typography.h4, { color: theme.textPrimary, marginBottom: Spacing.xs }]}>{s.title}</Text>
            <Text style={[Typography.body, { color: theme.textSecondary, lineHeight: 22 }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
