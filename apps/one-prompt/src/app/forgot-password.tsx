import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/lib/state/auth-store";
import { useAppTheme } from "@/lib/useAppTheme";
import * as Haptics from "expo-haptics";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError("Please enter your email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-[#0F0F0E] justify-center px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-3xl font-bold text-[#FAFAF8] mb-3" style={{ fontFamily: "DMSans_700Bold" }}>
          Check your email
        </Text>
        <Text className="text-base text-[#9CA3AF] mb-8" style={{ fontFamily: "DMSans_400Regular" }}>
          We sent a password reset link to {email}
        </Text>
        <TouchableOpacity
          accessibilityLabel="Back to Sign In"
          onPress={() => router.back()}
          className="bg-[#A3B899] py-3.5 rounded-xl items-center"
        >
          <Text className="text-base font-semibold text-[#0F0F0E]" style={{ fontFamily: "DMSans_600SemiBold" }}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0F0F0E]"
    >
      <View className="flex-1 justify-center px-6" style={{ paddingTop: insets.top }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" className="mb-8">
          <Text className="text-sm text-[#A3B899]" style={{ fontFamily: "DMSans_600SemiBold" }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-[#FAFAF8] mb-2" style={{ fontFamily: "DMSans_700Bold" }}>
          Reset password
        </Text>
        <Text className="text-base text-[#9CA3AF] mb-8" style={{ fontFamily: "DMSans_400Regular" }}>
          Enter your email and we'll send you a reset link
        </Text>

        <View>
          <Text className="text-sm text-[#9CA3AF] mb-1.5" style={{ fontFamily: "DMSans_500Medium" }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className="bg-[#1E1E1C] text-[#FAFAF8] px-4 py-3.5 rounded-xl border border-[#2A2A28]"
            style={{ fontFamily: "DMSans_400Regular", fontSize: 16 }}
          />
        </View>

        {error ? (
          <View className="mt-4 p-4 rounded-xl bg-red-500/10">
            <Text className="text-sm text-red-400" style={{ fontFamily: "DMSans_400Regular" }}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityLabel="Reset"
          onPress={handleReset}
          disabled={loading}
          className="mt-6 bg-[#A3B899] py-3.5 rounded-xl items-center"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          <Text className="text-base font-semibold text-[#0F0F0E]" style={{ fontFamily: "DMSans_600SemiBold" }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
