// ReviewPulse — Sign Up Screen
// Full implementation: business name + email + password + Apple Sign In (iOS)
// Business name saved to profiles.business_name via auth store trigger
// NEEDS_CONFIG: Apple Sign In requires Apple Developer account setup

import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Layout,
  Spacing,
  Radius,
} from '@/constants';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const signUp = useAuthStore((s) => s.signUp);

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signUp(email.trim().toLowerCase(), password, {
        business_name: businessName.trim(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // With email confirmation enabled there is no active session yet.
      // Show the "Check your email" screen instead of routing into the app.
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      if (
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('offline')
      ) {
        setError(
          'No internet connection. Please check your network and try again.'
        );
      } else if (
        message.toLowerCase().includes('already registered') ||
        message.toLowerCase().includes('user already exists')
      ) {
        setError(
          'An account with this email already exists. Try signing in.'
        );
      } else {
        setError(message);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const { error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Auth state change listener in _layout.tsx will handle navigation to onboarding
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        setAppleLoading(false);
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Apple sign up failed';
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAppleLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: Layout.screenPaddingH,
          }}
        >
          <CheckCircle2
            size={64}
            color={Colors.success[500]}
            strokeWidth={1.5}
          />
          <Text
            style={[
              Typography.h2,
              {
                color: theme.textPrimary,
                textAlign: 'center',
                marginTop: Spacing.lg,
                marginBottom: Spacing.sm,
              },
            ]}
          >
            CHECK YOUR EMAIL
          </Text>
          <Text
            style={[
              Typography.body,
              {
                color: theme.textSecondary,
                textAlign: 'center',
                marginBottom: Spacing.xl,
              },
            ]}
          >
            We sent a confirmation link to{'\n'}
            <Text
              style={{
                color: theme.textPrimary,
                fontFamily: 'Source-Sans-SemiBold',
              }}
            >
              {email}
            </Text>
            {'\n\n'}
            Click the link to activate your account, then sign in.
          </Text>
          <Button
            label="Go to Sign In"
            variant="primary"
            onPress={() => router.replace('/auth/sign-in')}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: Layout.screenPaddingH,
            paddingTop: Spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Header */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text
              style={[
                Typography.h1,
                { color: theme.textPrimary, marginBottom: Spacing.xs },
              ]}
            >
              CREATE ACCOUNT
            </Text>
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              Start monitoring your reputation for free.
            </Text>
          </View>

          {/* Value bullets */}
          <View
            style={{
              backgroundColor: isDark
                ? DarkTheme.bgSurface2
                : Colors.primary[50],
              borderRadius: Radius.md,
              padding: Spacing.md,
              marginBottom: Spacing.xl,
              gap: Spacing.xs,
            }}
          >
            {[
              'No credit card required',
              'Free tier includes 5 SMS/month',
              'Cancel anytime',
            ].map((line) => (
              <View
                key={line}
                style={{
                  flexDirection: 'row',
                  gap: Spacing.sm,
                  alignItems: 'center',
                }}
              >
                <CheckCircle2
                  size={16}
                  color={Colors.primary[isDark ? 300 : 500]}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    Typography.bodySm,
                    {
                      color: isDark
                        ? DarkTheme.textSecondary
                        : LightTheme.textSecondary,
                    },
                  ]}
                >
                  {line}
                </Text>
              </View>
            ))}
          </View>

          {/* Apple Sign Up (iOS only, per Apple guidelines shown prominently) */}
          {Platform.OS === 'ios' && (
            <View style={{ marginBottom: Spacing.lg }}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={Radius.xs}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleSignUp}
              />
              {appleLoading && (
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: theme.textTertiary,
                      textAlign: 'center',
                      marginTop: Spacing.xs,
                    },
                  ]}
                >
                  Creating account with Apple...
                </Text>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  marginTop: Spacing.lg,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: theme.borderDefault,
                  }}
                />
                <Text
                  style={[Typography.caption, { color: theme.textTertiary }]}
                >
                  or sign up with email
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: theme.borderDefault,
                  }}
                />
              </View>
            </View>
          )}

          {/* Form */}
          <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
            <Input
              label="Business Name"
              variant="text"
              value={businessName}
              onChangeText={setBusinessName}
              error={fieldErrors.businessName}
              placeholder="Smith's Plumbing"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <Input
              ref={emailRef}
              label="Email"
              variant="text"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Input
              ref={passwordRef}
              label="Password"
              variant="text"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              hint="At least 8 characters"
              placeholder="Choose a strong password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          {/* General error */}
          {error ? (
            <View
              style={{
                backgroundColor: Colors.error[100],
                borderRadius: Radius.sm,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderLeftWidth: 3,
                borderLeftColor: Colors.error[500],
              }}
            >
              <Text
                style={[Typography.bodySm, { color: Colors.error[700] }]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Create account button */}
          <Button
            label="Create Free Account"
            variant="primary"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading || appleLoading}
            fullWidth
            style={{ marginBottom: Spacing.md }}
          />

          {/* Terms notice */}
          <Text
            style={[
              Typography.caption,
              {
                color: theme.textTertiary,
                textAlign: 'center',
                marginBottom: Spacing.xl,
              },
            ]}
          >
            By creating an account you agree to our{' '}
            <Text
              style={{
                color: Colors.primary[isDark ? 300 : 500],
                textDecorationLine: 'underline',
              }}
              onPress={() => router.push('/legal/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{
                color: Colors.primary[isDark ? 300 : 500],
                textDecorationLine: 'underline',
              }}
              onPress={() => router.push('/legal/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Sign in link */}
          <Pressable
            onPress={() => router.push('/auth/sign-in')}
            style={{ alignItems: 'center', padding: Spacing.sm }}
          >
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              Already have an account?{' '}
              <Text
                style={{
                  color: Colors.primary[isDark ? 300 : 500],
                  fontFamily: 'Source-Sans-SemiBold',
                }}
              >
                Sign in
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
