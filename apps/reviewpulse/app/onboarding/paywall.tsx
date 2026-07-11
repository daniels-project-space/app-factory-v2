// ReviewPulse — Onboarding Paywall Wrapper
// Shown during onboarding flow after feature slides
// Same paywall UI — dismiss goes to tabs (not back) via router.canGoBack() fallback

import PaywallScreen from '../paywall';

export default function OnboardingPaywallScreen() {
  return <PaywallScreen />;
}
