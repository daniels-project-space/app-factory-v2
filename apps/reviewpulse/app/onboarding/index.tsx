// ReviewPulse — Onboarding entry redirect
// Immediately routes to the first onboarding step (business-type)
import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants';

export default function OnboardingIndex() {
  useEffect(() => {
    router.replace('/onboarding/business-type');
  }, []);
  return <View style={{ flex: 1, backgroundColor: Colors.primary[700] }} />;
}
