import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, router } from 'expo-router';
import { X, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import ParticleBackground from '@/components/ParticleBackground';

type LegalType = 'terms' | 'privacy' | 'disclaimer';

const LEGAL_CONTENT: Record<LegalType, { title: string; content: string }> = {
  terms: {
    title: 'Terms of Service',
    content: `Last Updated: April 2026

AGREEMENT TO TERMS

By downloading, installing, or using OnePrompt ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.

1. DESCRIPTION OF SERVICE

OnePrompt is a personal journaling application that allows users to:
- Record one daily thought or reflection
- Store entries locally on your device
- Optionally sync data across devices (with sign-in)
- Access premium features through subscription

2. USER ACCOUNTS

Account Creation: You may use the App without creating an account. Sign-in is optional and used only for backup and sync functionality.

Account Security: You are responsible for maintaining the security of any account credentials used with the App.

3. SUBSCRIPTION AND PAYMENTS

Premium Features: Some features require a paid subscription ("One Thought+").

Billing: Subscriptions are billed through the platform store (Apple App Store on iOS, Google Play on Android). Payment will be charged to your Apple ID account (iOS) or Google Play account (Android) at confirmation of purchase.

Auto-Renewal: Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.

Cancellation: You may cancel your subscription through your Apple ID account settings (iOS) or Google Play account settings (Android).

Refunds: Refund requests are handled by Apple according to their policies.

4. USER CONTENT

Ownership: You retain all rights to the content you create in the App.

Privacy: Your journal entries are stored locally on your device. We do not access or read your personal content, except when you explicitly use the AI Reflections feature (premium), which sends that week's entries to OpenAI for processing.

Backup: If you enable cloud sync, your data is encrypted and stored securely.

5. ACCEPTABLE USE

You agree not to:
- Use the App for any unlawful purpose
- Attempt to gain unauthorized access to the App's systems
- Reverse engineer or modify the App
- Use the App in any way that could damage or impair the service

6. INTELLECTUAL PROPERTY

All App content, features, and functionality (excluding user content) are owned by us and protected by copyright and other intellectual property laws.

7. DISCLAIMER OF WARRANTIES

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE APP WILL BE ERROR-FREE OR UNINTERRUPTED.

8. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.

9. DATA LOSS

While we take reasonable measures to protect your data, we are not responsible for data loss. We recommend regularly exporting your entries using the PDF export feature.

10. CHANGES TO TERMS

We may update these terms from time to time. Continued use of the App after changes constitutes acceptance of the new terms.

11. TERMINATION

We reserve the right to terminate or suspend your access to the App at any time for violation of these terms.

12. GOVERNING LAW

These terms shall be governed by applicable law. If you are an EU or UK resident, nothing in these terms limits your statutory rights under applicable EU or UK consumer protection law, including your right to seek redress under local law. For EU users, our processing of personal data is subject to GDPR. For UK users, it is subject to the UK GDPR and Data Protection Act 2018.

13. CONTACT

For questions about these Terms, please contact us through the App Store.`,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `Last Updated: April 2026

OnePrompt ("we", "our", or "the App") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.

1. INFORMATION WE COLLECT

Local Data (Stored on Your Device Only):
- Journal entries and prompts
- App preferences and settings
- Streak and usage statistics

Data We May Collect:
- Anonymous analytics (app crashes, feature usage)
- Subscription status (via RevenueCat)
- Device identifier (for subscription verification)

Data We Do NOT Collect:
- Personal identifying information (unless you sign in)
- Location data
- Contact information

Note on Journal Content:
- By default, journal entries are stored locally on your device only
- If you enable Cloud Sync (requires sign-in), your entries are also stored securely on our servers (Supabase) to enable cross-device access and backup
- AI Reflections (premium feature) sends that week's entries to OpenAI for processing

2. HOW WE USE YOUR INFORMATION

We use collected information to:
- Provide and maintain the App
- Process subscriptions
- Improve app performance and features
- Send notifications (only if you enable them)

3. AI-POWERED FEATURES (IMPORTANT)

Weekly Reflections Feature:
If you are a premium subscriber and use the AI-powered weekly reflections feature, your journal entries from that week may be sent to OpenAI's servers for processing. This includes:
- The text content of your journal entries
- Photos you've taken as part of photo prompts (if applicable)

What this means:
- Your journal content is transmitted securely via HTTPS
- OpenAI processes your entries to generate personalized insights
- We do not retain your entries in our AI pipeline beyond the processing request
- OpenAI's data retention policies apply (see openai.com/privacy)

You can opt out:
- Simply don't use the weekly reflections feature
- Your entries will remain local on your device

By using the AI reflections feature, you consent to this data processing.

4. DATA STORAGE

Local Storage: Your journal entries are stored locally on your device. We cannot access them unless you use AI features.

Cloud Sync (Optional): If you sign in and enable cloud sync, your data is:
- Encrypted in transit and at rest
- Stored securely on cloud servers
- Only accessible by you

5. THIRD-PARTY SERVICES

We use the following third-party services:

RevenueCat: For subscription management
- Privacy Policy: https://www.revenuecat.com/privacy

Apple (Sign in with Apple): For optional authentication
- Privacy Policy: https://www.apple.com/legal/privacy

OpenAI: For AI-powered reflections (premium feature only)
- Privacy Policy: https://openai.com/privacy
- Data is processed per OpenAI's API data usage policies

PostHog: For anonymous analytics (crash counts, feature usage patterns, no journal content)
- Privacy Policy: https://posthog.com/privacy
- Data is anonymized and linked to a random device UUID, not your identity

Sentry: For crash reporting (stack traces and device context, no journal content)
- Privacy Policy: https://sentry.io/privacy

6. DATA SHARING

We do not sell, trade, or share your personal data with third parties except:
- When required by law
- To protect our rights or safety
- With service providers who assist in operating the App (under strict confidentiality)
- With OpenAI for AI reflection features (with your consent)

7. DATA RETENTION

Local Data: Remains on your device until you delete it or uninstall the App.

Account Data: If you create an account, we retain your data until you request deletion.

Subscription Data: Retained as required for billing and legal compliance.

AI Processing: Data sent to OpenAI is subject to their retention policies.

8. YOUR RIGHTS

You have the right to:
- Access your data (via export feature)
- Delete your data (via app settings)
- Opt out of analytics
- Opt out of AI features by not using weekly reflections
- Cancel your subscription at any time

9. CHILDREN'S PRIVACY

The App is not intended for children under 13. We do not knowingly collect data from children under 13.

10. SECURITY

We implement appropriate security measures including:
- Local data encryption using secure storage
- Secure cloud transmission (HTTPS)
- Validated API responses
- Input sanitization

11. NOTIFICATIONS

Push Notifications: Only sent if you enable daily reminders. You can disable them in app settings or device settings.

We will never send promotional notifications.

12. CHANGES TO THIS POLICY

We may update this Privacy Policy periodically. We will notify you of significant changes through the App.

13. CALIFORNIA RESIDENTS (CCPA)

California residents have additional rights:
- Right to know what data is collected
- Right to delete personal data
- Right to opt-out of data sale (we do not sell data)
- Right to non-discrimination

14. EUROPEAN USERS (GDPR)

For EU users, our legal basis for processing is:
- Consent (for optional features like AI reflections)
- Contract performance (for subscription services)
- Legitimate interests (for app improvement)

You have the right to data portability and to lodge complaints with supervisory authorities.

15. CONTACT US

For privacy questions or data requests, contact us at support@oneprompt.app or through the App Store support page.`,
  },
  disclaimer: {
    title: 'Disclaimer',
    content: `Last Updated: April 2026

GENERAL DISCLAIMER

OnePrompt is a personal journaling application designed for self-reflection and mindfulness. Please read this disclaimer carefully before using the App.

1. NOT A SUBSTITUTE FOR PROFESSIONAL HELP

This App is NOT:
- A medical device
- A mental health treatment tool
- A substitute for professional therapy or counseling
- A crisis intervention service

If you are experiencing a mental health crisis, please contact:
- Emergency services (911 in the US)
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Your local mental health professional

2. AI-GENERATED CONTENT DISCLAIMER

The AI Reflections feature (premium) generates content using OpenAI's language models. This content:
- May be inaccurate, incomplete, or not applicable to your situation
- Is generated by an automated system with no human oversight
- Should not be used as a substitute for professional advice
- May occasionally produce unexpected or unhelpful responses

AI-generated reflections are meant as a starting point for self-reflection only. If the AI response feels inaccurate or unhelpful, please disregard it. In a mental health crisis, do not rely on AI-generated content — contact a professional immediately (see Section 1 above).

3. NO MEDICAL ADVICE

Nothing in this App constitutes medical, psychological, or professional advice. The prompts and features are designed for general wellness and self-reflection purposes only.

3. USER RESPONSIBILITY

You are solely responsible for:
- The content you create in the App
- How you interpret and act on your reflections
- Backing up your data regularly
- Seeking professional help when needed

4. LIMITATION OF LIABILITY

We are not liable for:
- Any decisions you make based on using the App
- Emotional distress that may arise from self-reflection
- Data loss or corruption
- Service interruptions
- Third-party services (Apple, payment processors)

5. NO GUARANTEE OF RESULTS

We make no guarantees that using the App will:
- Improve your mental health
- Increase your happiness or well-being
- Help you achieve any specific outcome
- Work as expected in all circumstances

Individual results vary based on personal circumstances and usage.

6. CONTENT WARNINGS

Self-reflection can sometimes bring up difficult emotions. If you find that journaling is causing distress, please:
- Take a break from the App
- Speak with a trusted friend or family member
- Consult a mental health professional

7. DATA DISCLAIMER

While we take reasonable measures to protect your data:
- No system is 100% secure
- We recommend regular data exports
- We are not responsible for data breaches beyond our reasonable control
- Cloud sync is optional and at your own discretion

8. SUBSCRIPTION DISCLAIMER

Premium features ("One Thought+") are offered "as is":
- Features may change over time
- Prices may be adjusted with notice
- Refunds are subject to Apple's policies
- Access requires an active subscription

9. THIRD-PARTY SERVICES

The App uses third-party services including:
- Apple App Store
- RevenueCat (payments)
- Cloud storage providers (if sync enabled)

We are not responsible for the availability, security, or policies of these services.

10. MODIFICATIONS

We reserve the right to:
- Modify or discontinue features
- Update pricing
- Change these disclaimers
- Terminate accounts for violations

11. AGE REQUIREMENT

This App is intended for users aged 13 and older. By using the App, you confirm you meet this age requirement.

12. ACKNOWLEDGMENT

By using OnePrompt, you acknowledge that you have read, understood, and agree to this disclaimer.

If you do not agree with any part of this disclaimer, please discontinue use of the App immediately.`,
  },
};

export default function LegalScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const { type } = useLocalSearchParams<{ type: LegalType }>();

  const legalType = (type as LegalType) || 'terms';
  const content = LEGAL_CONTENT[legalType];

  const handleClose = () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient as [string, string, string]} style={{ flex: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
            <Pressable
              accessibilityLabel="Close"
              onPress={handleClose}
              className="flex-row items-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color={theme.text} />
              <Text className="font-medium text-base ml-1" style={{ color: theme.text }}>
                Back
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Close"
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.5)' : 'rgba(232,235,228,0.5)' }}
            >
              <X size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <BlurView
                intensity={theme.isDark ? 40 : 60}
                tint={theme.isDark ? 'dark' : 'light'}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                }}
              >
                <View style={{ backgroundColor: theme.card }} className="p-6">
                  <Text
                    className="font-bold text-2xl mb-6"
                    style={{ color: theme.text }}
                  >
                    {content.title}
                  </Text>
                  <Text
                    className="font-sans text-sm leading-6"
                    style={{ color: theme.textSecondary }}
                  >
                    {content.content}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
