// ReviewPulse — Terms of Service Screen
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, LightTheme, DarkTheme, Typography, Layout, Spacing } from '@/constants';

const sections = [
  { title: '1. Acceptance of Terms', body: 'By creating an account or using ReviewPulse, you agree to these Terms of Service. If you do not agree, do not use the app. We may update these terms; continued use after changes constitutes acceptance.' },
  { title: '2. Description of Service', body: 'ReviewPulse helps small businesses manage online reviews. Features include review aggregation from Google and Yelp, AI-powered reply suggestions, SMS review request campaigns, analytics dashboards, and push notification alerts for new reviews.' },
  { title: '3. Account Responsibilities', body: 'You must provide accurate account information. You are responsible for maintaining the security of your password. You must not share your account credentials. You must be at least 18 years old or the age of majority in your jurisdiction.' },
  { title: '4. Acceptable Use', body: 'You agree not to: send unsolicited SMS messages, use the service to harass or spam customers, attempt to manipulate or fabricate reviews, violate any applicable laws including TCPA and CAN-SPAM, reverse-engineer or copy the application, or resell access to the service.' },
  { title: '5. SMS Review Requests', body: 'You are solely responsible for obtaining consent from recipients before sending SMS review requests. You must comply with all applicable telecommunications laws including TCPA. ReviewPulse provides the tool but you are responsible for lawful use. Message rates may apply to recipients.' },
  { title: '6. Subscriptions & Billing', body: 'Free tier includes limited features. Paid subscriptions are billed through the App Store or Google Play. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Refunds are handled by the respective app store.' },
  { title: '7. Intellectual Property', body: 'ReviewPulse and its original content, features, and functionality are owned by ReviewPulse and are protected by international copyright, trademark, and other intellectual property laws. AI-generated reply suggestions are provided as starting points and you own the final text you send.' },
  { title: '8. Limitation of Liability', body: 'ReviewPulse is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.' },
  { title: '9. Termination', body: 'We may suspend or terminate your account for violations of these terms. You may delete your account at any time through the app settings. Upon termination, your data will be deleted in accordance with our Privacy Policy.' },
  { title: '10. Contact', body: 'For questions about these terms, contact us at legal@reviewpulse.app.' },
];

export default function TermsOfServiceScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: Layout.screenPaddingH, paddingVertical: Spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
          <ArrowLeft size={24} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.h3, { color: theme.textPrimary, marginLeft: Spacing.xs }]}>Terms of Service</Text>
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
