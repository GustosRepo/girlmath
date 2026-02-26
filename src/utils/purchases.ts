/**
 * RevenueCat purchases utility
 *
 * SETUP CHECKLIST:
 *  1. Replace REVENUECAT_IOS_KEY with your key from:
 *     RevenueCat dashboard → Project Settings → API Keys → iOS
 *
 *  2. Replace product IDs to match App Store Connect:
 *     MONTHLY_PRODUCT_ID  — your monthly subscription product ID
 *     LIFETIME_PRODUCT_ID — your one-time lifetime product ID
 *
 *  3. Create an Entitlement called "premium" in RevenueCat dashboard
 *     and attach both products to it.
 */

import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';

// ─── 🔑 CONFIG ────────────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_REVENUECAT_IOS_KEY in your .env file
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

// Must match your App Store Connect product identifiers exactly
const MONTHLY_PRODUCT_ID = 'girlmath_monthly';   // change if yours differs
const LIFETIME_PRODUCT_ID = 'girlmath_lifetime'; // change if yours differs

// Entitlement ID in RevenueCat dashboard (create one called "premium")
const ENTITLEMENT_ID = 'premium';
// ──────────────────────────────────────────────────────────────────────────────

let _initialized = false;

/** Call once on app start (App.tsx useEffect). */
export function initRevenueCat(userId?: string) {
  if (_initialized) return;
  if (Platform.OS !== 'ios') return;
  if (!REVENUECAT_IOS_KEY) {
    console.warn('[RevenueCat] EXPO_PUBLIC_REVENUECAT_IOS_KEY not set — purchases disabled');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });

  if (userId) {
    Purchases.logIn(userId).catch(() => {});
  }

  _initialized = true;
}

/** Returns true if the user has an active "premium" entitlement. */
export async function hasPremium(): Promise<boolean> {
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

/** Purchase the monthly subscription. Returns true on success. */
export async function purchaseMonthly(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const monthly = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === MONTHLY_PRODUCT_ID,
    );
    if (!monthly) {
      Alert.alert(
        '😬 product not found',
        `Make sure "${MONTHLY_PRODUCT_ID}" exists in App Store Connect and is linked to your RevenueCat offering.`,
      );
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(monthly);
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (e: any) {
    if (!e.userCancelled) {
      Alert.alert('Purchase failed 😢', e.message ?? 'Something went wrong');
    }
    return false;
  }
}

/** Purchase the lifetime one-time product. Returns true on success. */
export async function purchaseLifetime(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const lifetime = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === LIFETIME_PRODUCT_ID,
    );
    if (!lifetime) {
      Alert.alert(
        '😬 product not found',
        `Make sure "${LIFETIME_PRODUCT_ID}" exists in App Store Connect and is linked to your RevenueCat offering.`,
      );
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(lifetime);
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (e: any) {
    if (!e.userCancelled) {
      Alert.alert('Purchase failed 😢', e.message ?? 'Something went wrong');
    }
    return false;
  }
}

/** Restore previous purchases. Returns true if premium was restored. */
export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch (e: any) {
    Alert.alert('Restore failed 😢', e.message ?? 'Something went wrong');
    return false;
  }
}
