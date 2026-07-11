// ReviewPulse — Forgot Password Screen
// Sends Supabase password reset email
// Linked from Sign In screen

import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ArrowLeft, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Layout,
  Spacing,
} from '@/constants';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';

export default function ForgotPasswordScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    setEmailError('');
    setError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch') || message.toLowerCase().includes('offline')) {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(message);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, padding: Layout.screenPaddingH, paddingTop: Spacing.md }}>
          {/* Back button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: -12,
              marginBottom: Spacing.lg,
            }}
            hitSlop={8}
          >
            <ArrowLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>

          {sent ? (
            // Success state
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Mail size={64} color={Colors.primary[isDark ? 300 : 500]} strokeWidth={1.5} />
              <Text
                style={[
                  Typography.h2,
                  { color: theme.textPrimary, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
                ]}
              >
                CHECK YOUR EMAIL
              </Text>
              <Text
                style={[
                  Typography.body,
                  { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
                ]}
              >
                We sent a reset link to{'\n'}
                <Text style={{ color: theme.textPrimary, fontFamily: 'Source-Sans-SemiBold' }}>
                  {email}
                </Text>
              </Text>
              <Button
                label="Back to Sign In"
                variant="secondary"
                onPress={() => router.replace('/auth/sign-in')}
                fullWidth
              />
            </View>
          ) : (
            // Form state
            <>
              <View style={{ marginBottom: Spacing.xl }}>
                <Text style={[Typography.h1, { color: theme.textPrimary, marginBottom: Spacing.xs }]}>
                  RESET PASSWORD
                </Text>
                <Text style={[Typography.body, { color: theme.textSecondary }]}>
                  Enter your email and we'll send you a reset link.
                </Text>
              </View>

              <Input
                label="Email Address"
                variant="text"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleReset}
                containerStyle={{ marginBottom: error ? Spacing.md : Spacing.xl }}
              />

              {error ? (
                <Text
                  style={[
                    Typography.bodySm,
                    { color: Colors.error[500], marginBottom: Spacing.lg },
                  ]}
                >
                  {error}
                </Text>
              ) : null}

              <Button
                label="Send Reset Link"
                variant="primary"
                onPress={handleReset}
                loading={loading}
                disabled={loading}
                fullWidth
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
