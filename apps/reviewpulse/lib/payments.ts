import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";

let initialized = false;

export async function initPayments() {
  if (initialized) return;
  const apiKey = Constants.expoConfig?.extra?.revenuecatApiKey;
  if (!apiKey) return;

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  initialized = true;
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages || [];
}

export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases();
}

export async function checkEntitlement(entitlementId: string = "pro"): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[entitlementId] !== undefined;
}

export async function identifyUser(userId: string) {
  await Purchases.logIn(userId);
}

export async function logoutUser() {
  await Purchases.logOut();
}
