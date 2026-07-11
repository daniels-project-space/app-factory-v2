import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/lib/state/auth-store";
import * as Haptics from "expo-haptics";
import { track } from "@/lib/analytics";
import { useAppTheme } from "@/lib/useAppTheme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return "Please enter your email.";
    if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address.";
    if (!password) return "Please choose a password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signUp(email.trim(), password);
      track("sign_up", { method: "email" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : "Sign up failed.";
      setError(
        msg.includes("already registered")
          ? "An account with this email already exists."
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
      track("sign_up", { method: "apple" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Apple sign-in failed.";
      if (!msg.includes("canceled") && !msg.includes("cancelled") && !msg.includes("ERR_CANCELED")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 justify-center px-6" style={{ backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="items-center">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-6" style={{ backgroundColor: theme.accentLight }}>
            <Text className="text-3xl">&#x2709;</Text>
          </View>
          <Text className="text-2xl font-bold mb-3 text-center" style={{ color: theme.text, fontFamily: "DMSans_700Bold" }}>
            Check your email
          </Text>
          <Text className="text-base text-center leading-6" style={{ color: theme.textSecondary, fontFamily: "DMSans_400Regular" }}>
            We sent a confirmation link to{"\n"}
            <Text style={{ color: theme.text, fontFamily: "DMSans_500Medium" }}>{email.trim()}</Text>
          </Text>
          <Text className="text-sm text-center mt-4" style={{ color: theme.textMuted, fontFamily: "DMSans_400Regular" }}>
            Tap the link in your email to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity
            accessibilityLabel="Sign in"
            className="mt-8 py-3.5 px-8 rounded-xl"
            style={{ backgroundColor: theme.accent }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/sign-in");
            }}
          >
            <Text className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: "DMSans_600SemiBold" }}>
              Go to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
              Create account
            </Text>
            <Text className="text-base" style={{ color: theme.textSecondary, fontFamily: "DMSans_400Regular" }}>
              Start your mindful journaling practice
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
                accessibilityLabel="Email address"
                style={{ backgroundColor: theme.card, color: theme.text, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, fontFamily: "DMSans_400Regular", fontSize: 16 }}
              />
            </View>

            <View>
              <Text className="text-sm mb-1.5" style={{ color: theme.textSecondary, fontFamily: "DMSans_500Medium" }}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoComplete="new-password"
                accessibilityLabel="Password"
                style={{ backgroundColor: theme.card, color: theme.text, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, fontFamily: "DMSans_400Regular", fontSize: 16 }}
              />
              <Text className="text-xs mt-1.5" style={{ color: theme.textMuted, fontFamily: "DMSans_400Regular" }}>
                Must be at least 8 characters
              </Text>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View className="mt-4 p-4 rounded-xl bg-red-500/10">
              <Text className="text-sm text-red-400" style={{ fontFamily: "DMSans_400Regular" }}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            accessibilityLabel="Create account"
            accessibilityRole="button"
            className="mt-6 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: theme.accent, opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: "DMSans_600SemiBold" }}>
              {loading ? "Creating account..." : "Create Account"}
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
            accessibilityLabel="Apple sign in"
            onPress={handleAppleSignIn}
            disabled={loading}
            className="bg-white py-3.5 rounded-xl items-center flex-row justify-center gap-2"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-lg">&#63743;</Text>
            <Text className="text-base font-semibold text-black" style={{ fontFamily: "DMSans_600SemiBold" }}>
              Sign up with Apple
            </Text>
          </TouchableOpacity>

          {/* Sign in link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-sm" style={{ color: theme.textSecondary, fontFamily: "DMSans_400Regular" }}>
              Already have an account?{" "}
            </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity accessibilityLabel="TouchableOpacity">
                <Text className="text-sm font-semibold" style={{ color: theme.accent, fontFamily: "DMSans_600SemiBold" }}>
                  Sign in
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
