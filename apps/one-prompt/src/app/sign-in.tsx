import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/lib/state/auth-store";
import { useOnboardingStore } from "@/lib/state/onboarding-store";
import * as Haptics from "expo-haptics";
import { track } from "@/lib/analytics";
import { useAppTheme } from "@/lib/useAppTheme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signIn(email.trim(), password);
      track("sign_in", { method: "email" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Ensure onboarding is marked complete when signing in via this screen
      completeOnboarding();
      router.replace("/");
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      setError(
        msg.includes("Invalid login")
          ? "Incorrect email or password."
          : msg.includes("not confirmed")
            ? "Please confirm your email first."
            : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signInWithApple();
      track("sign_in", { method: "apple" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeOnboarding();
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Apple sign-in failed.";
      const isCanceled =
        msg.includes("canceled") ||
        msg.includes("cancelled") ||
        msg.includes("ERR_CANCELED") ||
        (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === '1001');
      if (!isCanceled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-12">
            <Text className="text-3xl font-bold mb-2" style={{ color: theme.text, fontFamily: "DMSans_700Bold" }}>
              Welcome back
            </Text>
            <Text className="text-base" style={{ color: theme.textSecondary, fontFamily: "DMSans_400Regular" }}>
              Sign in to sync your journal
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm mb-1.5" style={{ color: theme.textSecondary, fontFamily: "DMSans_500Medium" }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                testID="email-input"
                accessibilityLabel="Email address"
                style={{ backgroundColor: theme.card, color: theme.text, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, fontFamily: "DMSans_400Regular", fontSize: 16 }}
              />
            </View>

            <View>
              <Text className="text-sm mb-1.5" style={{ color: theme.textSecondary, fontFamily: "DMSans_500Medium" }}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoComplete="current-password"
                testID="password-input"
                accessibilityLabel="Password"
                style={{ backgroundColor: theme.card, color: theme.text, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, fontFamily: "DMSans_400Regular", fontSize: 16 }}
              />
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            accessibilityLabel="Sign in"
            className="self-end mt-2"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/forgot-password");
            }}
          >
            <Text className="text-sm font-semibold" style={{ color: theme.accent, fontFamily: "DMSans_600SemiBold" }}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View className="mt-4 p-4 rounded-xl bg-red-500/10">
              <Text className="text-sm text-red-400" style={{ fontFamily: "DMSans_400Regular" }}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            testID="sign-in-button"
            accessibilityLabel="Sign in"
            accessibilityRole="button"
            className="mt-6 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: theme.accent, opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: "DMSans_600SemiBold" }}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px" style={{ backgroundColor: theme.cardBorder }} />
            <Text className="mx-3 text-xs" style={{ color: theme.textMuted, fontFamily: "DMSans_400Regular" }}>or</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: theme.cardBorder }} />
          </View>

          {/* Apple Sign In */}
          <TouchableOpacity
            onPress={handleAppleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Apple"
            className="bg-white py-3.5 rounded-xl items-center flex-row justify-center gap-2"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-lg">&#63743;</Text>
            <Text className="text-base font-semibold text-black" style={{ fontFamily: "DMSans_600SemiBold" }}>
              Sign in with Apple
            </Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-sm" style={{ color: theme.textSecondary, fontFamily: "DMSans_400Regular" }}>
              Don't have an account?{" "}
            </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity accessibilityLabel="TouchableOpacity">
                <Text className="text-sm font-semibold" style={{ color: theme.accent, fontFamily: "DMSans_600SemiBold" }}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Skip for now */}
          <TouchableOpacity
            accessibilityLabel="TouchableOpacity"
            className="mt-4 items-center"
            onPress={() => router.replace("/")}
          >
            <Text className="text-sm" style={{ color: theme.textMuted, fontFamily: "DMSans_400Regular" }}>
              Continue without account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
