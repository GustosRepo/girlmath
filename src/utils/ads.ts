import { Platform } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';

// react-native-google-mobile-ads needs a native EAS build.
// Using require() inside try/catch so the app still runs in Expo Go.
let _mobileAds: any;
let _InterstitialAd: any;
let _AdEventType: any;
let _MaxAdContentRating: any;
let _BannerAd: any;
let _BannerAdSize: any;
try {
  const m = require('react-native-google-mobile-ads');
  _mobileAds = m.default;
  _InterstitialAd = m.InterstitialAd;
  _AdEventType = m.AdEventType;
  _MaxAdContentRating = m.MaxAdContentRating;
  _BannerAd = m.BannerAd;
  _BannerAdSize = m.BannerAdSize;
} catch {}

// Re-export for screens so they never import the library directly
export const BannerAd: any = _BannerAd ?? null;
export const BannerAdSize: any = _BannerAdSize ?? {};

// ── Ad Unit IDs from .env (EXPO_PUBLIC_ = bundled into JS) ─
// Falls back to Google's official test IDs if env vars are missing
const IDS = {
  banner: {
    ios:
      process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER ??
      'ca-app-pub-3940256099942544/2934735716',
    android:
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER ??
      'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios:
      process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL ??
      'ca-app-pub-3940256099942544/4411468910',
    android:
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL ??
      'ca-app-pub-3940256099942544/1033173712',
  },
};

export const AdUnitIds = {
  banner: Platform.OS === 'ios' ? IDS.banner.ios : IDS.banner.android,
  interstitial: Platform.OS === 'ios' ? IDS.interstitial.ios : IDS.interstitial.android,
};

// ── Initialize AdMob ───────────────────────────────────────
export async function initializeAds(): Promise<void> {
  if (!_mobileAds) return; // Expo Go — skip
  await _mobileAds().initialize();
  await _mobileAds().setRequestConfiguration({
    maxAdContentRating: _MaxAdContentRating?.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}

// ── Interstitial hook ──────────────────────────────────────
// Use in any screen that needs to show a full-screen ad.
// Preloads automatically and reloads after each show.
export function useInterstitialAd() {
  const adRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!_InterstitialAd) return () => {}; // Expo Go — skip
    const ad = _InterstitialAd.createForAdRequest(AdUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;
    isLoadedRef.current = false;

    const unsubLoad = ad.addAdEventListener(_AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });
    const unsubClose = ad.addAdEventListener(_AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      load(); // preload the next one immediately
    });
    const unsubError = ad.addAdEventListener(_AdEventType.ERROR, () => {
      isLoadedRef.current = false;
    });

    ad.load();
    return () => { unsubLoad(); unsubClose(); unsubError(); };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const show = useCallback((): boolean => {
    if (isLoadedRef.current && adRef.current) {
      adRef.current.show();
      return true;
    }
    return false;
  }, []);

  return { show };
}
