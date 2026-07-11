import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Paywall provider abstraction.
 *
 * Screens and stores talk ONLY to this interface — never to a payment SDK
 * directly — so swapping providers is a one-line change at the bottom of
 * this file.
 *
 * Provider lanes:
 * - "demo" (this file's default): mock checkout that flips a persisted
 *   `isPro` flag after a short fake processing delay. No network, no keys.
 * - RevenueCat (store lane): implement `PaywallProvider` with
 *   react-native-purchases — `getPaywallStatus` reads
 *   `Purchases.getCustomerInfo()` entitlements, `purchase` maps `plan` to a
 *   package from the current Offering, `restore` calls
 *   `Purchases.restorePurchases()`. Configure the SDK key in app startup,
 *   not here.
 * - Stripe (web lane): implement `PaywallProvider` against your backend —
 *   `purchase` opens a Checkout Session URL, `getPaywallStatus` asks the
 *   backend for the subscription state tied to the signed-in user.
 */

export type Plan = 'weekly' | 'annual';

export interface PaywallStatus {
  isPro: boolean;
  plan: Plan | null;
}

export interface PaywallProvider {
  /** Current entitlement state (persisted across launches). */
  getPaywallStatus(): Promise<PaywallStatus>;
  /** Runs checkout for a plan; resolves with the new entitlement state. */
  purchase(plan: Plan): Promise<PaywallStatus>;
  /** Restores previous purchases; resolves with the entitlement state. */
  restore(): Promise<PaywallStatus>;
}

// ---------------------------------------------------------------------------
// Demo provider
// ---------------------------------------------------------------------------

const DEMO_STORAGE_KEY = 'payments:demo:status';
const DEMO_CHECKOUT_MS = 1200;

// A real card network/App Store checkout fails or gets cancelled some
// fraction of the time — the demo lane simulates that instead of always
// succeeding, so the paywall's non-blocking error state (see
// PAYWALL_COPY.error) is actually reachable rather than dead code. A real
// provider lane's `purchase()` would reject from the SDK itself instead.
const DEMO_FAILURE_RATE = 0.15;

const FREE_STATUS: PaywallStatus = { isPro: false, plan: null };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readPersistedStatus(): Promise<PaywallStatus> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<PaywallStatus>;
      if (typeof parsed.isPro === 'boolean') {
        return { isPro: parsed.isPro, plan: parsed.plan ?? null };
      }
    }
  } catch {
    // Unreadable state — treat as free.
  }
  return FREE_STATUS;
}

async function writePersistedStatus(status: PaywallStatus): Promise<void> {
  await AsyncStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(status));
}

const demoProvider: PaywallProvider = {
  getPaywallStatus: readPersistedStatus,

  async purchase(plan: Plan): Promise<PaywallStatus> {
    // Fake checkout: the caller shows its processing state for this window.
    await delay(DEMO_CHECKOUT_MS);
    if (Math.random() < DEMO_FAILURE_RATE) {
      throw new Error('Purchase failed or was cancelled');
    }
    const status: PaywallStatus = { isPro: true, plan };
    await writePersistedStatus(status);
    return status;
  },

  async restore(): Promise<PaywallStatus> {
    await delay(400);
    return readPersistedStatus();
  },
};

// ---------------------------------------------------------------------------
// Active provider — swap this export to change lanes.
// ---------------------------------------------------------------------------

const provider: PaywallProvider = demoProvider;

export function getPaywallStatus(): Promise<PaywallStatus> {
  return provider.getPaywallStatus();
}

export function purchase(plan: Plan): Promise<PaywallStatus> {
  return provider.purchase(plan);
}

export function restore(): Promise<PaywallStatus> {
  return provider.restore();
}
