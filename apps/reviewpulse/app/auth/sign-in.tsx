// ReviewPulse — Sign In Screen
// Full implementation: email/password auth + Apple Sign In (iOS)
// Wired to useAuthStore -> supabase.auth.signInWithPassword
// Apple Sign In uses expo-apple-authentication + Supabase signInWithIdToken
// NEEDS_CONFIG: Apple Sign In requires Apple Developer account setup:
//   - Enable "Sign In with Apple" capability in Xcode
//   - Configure Apple provider in Supabase Auth dashboard

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
import { ArrowLeft } from 'lucide-react-native';
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

export default function SignInScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }

    return valid;
  };

  const handleSignIn = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signIn(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      if (
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('offline')
      ) {
        setError(
          'No internet connection. Please check your network and try again.'
        );
      } else if (message.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (message.toLowerCase().includes('email not confirmed')) {
        setError(
          'Please check your email and click the confirmation link first.'
        );
      } else {
        setError(message);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
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

      // Sign in via Supabase with Apple ID token
      const { error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Auth state change listener in _layout.tsx will handle navigation
    } catch (err: unknown) {
      // User cancelled Apple Sign In -- not an error
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        setAppleLoading(false);
        return;
      }
      const message = err instanceof Error ? err.message : 'Apple sign in failed';
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAppleLoading(false);
    }
  };

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
              SIGN IN
            </Text>
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              Welcome back - your pulse is waiting.
            </Text>
          </View>

          {/* Apple Sign In button (iOS only, per Apple guidelines shown first) */}
          {Platform.OS === 'ios' && (
            <View style={{ marginBottom: Spacing.lg }}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={Radius.xs}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleSignIn}
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
                  Signing in with Apple...
                </Text>
              )}

              {/* Divider */}
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
                  or sign in with email
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
              label="Email"
              variant="text"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="email-input"
            />

            <Input
              ref={passwordRef}
              label="Password"
              variant="text"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              testID="password-input"
            />
          </View>

          {/* Forgot password */}
          <Pressable
            onPress={() => router.push('/auth/forgot-password')}
            style={{ marginBottom: Spacing.xl, alignSelf: 'flex-start' }}
          >
            <Text
              style={[
                Typography.bodySm,
                { color: Colors.primary[isDark ? 300 : 500] },
              ]}
            >
              Forgot your password?
            </Text>
          </Pressable>

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

          {/* Sign in button */}
          <Button
            label="Sign In"
            variant="primary"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || appleLoading}
            fullWidth
            style={{ marginBottom: Spacing.md }}
            testID="sign-in-button"
          />

          {/* Divider (only on non-iOS, iOS has divider above) */}
          {Platform.OS !== 'ios' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.md,
                marginVertical: Spacing.md,
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
                or
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: theme.borderDefault,
                }}
              />
            </View>
          )}

          {/* Sign up link */}
          <Pressable
            onPress={() => router.push('/auth/sign-up')}
            style={{ alignItems: 'center', padding: Spacing.sm }}
          >
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              New to ReviewPulse?{' '}
              <Text
                style={{
                  color: Colors.primary[isDark ? 300 : 500],
                  fontFamily: 'Source-Sans-SemiBold',
                }}
              >
                Create account
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
