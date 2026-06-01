import { Platform } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';

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

const ADS_DEBUG_ENABLED = process.env.EXPO_PUBLIC_ADS_DEBUG === 'true';
const ADS_FORCE_TEST_IDS = process.env.EXPO_PUBLIC_ADS_FORCE_TEST_IDS === 'true';

function logAdsDebug(message: string, details?: unknown) {
  if (!ADS_DEBUG_ENABLED) return;
  if (details === undefined) {
    console.log(`[Ads] ${message}`);
    return;
  }
  console.log(`[Ads] ${message}`, details);
}

// Re-export for screens so they never import the library directly
export const BannerAd: any = _BannerAd ?? null;
export const BannerAdSize: any = _BannerAdSize ?? {};

// ── Ad Unit IDs from .env (EXPO_PUBLIC_ = bundled into JS) ─
// Falls back to Google's official test IDs if env vars are missing
const GOOGLE_TEST_IDS = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
};

const CONFIGURED_IDS = {
  banner: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER ?? GOOGLE_TEST_IDS.banner.ios,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER ?? GOOGLE_TEST_IDS.banner.android,
  },
  interstitial: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL ?? GOOGLE_TEST_IDS.interstitial.ios,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL ?? GOOGLE_TEST_IDS.interstitial.android,
  },
};

const IDS = ADS_FORCE_TEST_IDS ? GOOGLE_TEST_IDS : CONFIGURED_IDS;

export const AdUnitIds = {
  banner: Platform.OS === 'ios' ? IDS.banner.ios : IDS.banner.android,
  interstitial: Platform.OS === 'ios' ? IDS.interstitial.ios : IDS.interstitial.android,
};

export const AdsDebug = {
  enabled: ADS_DEBUG_ENABLED,
  forceTestIds: ADS_FORCE_TEST_IDS,
  isUsingTestIds: ADS_FORCE_TEST_IDS,
  hasNativeModule: !!_mobileAds,
};

// ── Initialize AdMob ───────────────────────────────────────
export async function initializeAds(): Promise<void> {
  if (!_mobileAds) {
    logAdsDebug('Skipping AdMob init because native ads module is unavailable');
    return;
  }

  logAdsDebug('Initializing AdMob', {
    platform: Platform.OS,
    bannerUnitId: AdUnitIds.banner,
    interstitialUnitId: AdUnitIds.interstitial,
    usingTestIds: ADS_FORCE_TEST_IDS,
  });

  try {
    const adapterStatuses = await _mobileAds().initialize();
    await _mobileAds().setRequestConfiguration({
      maxAdContentRating: _MaxAdContentRating?.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    logAdsDebug('AdMob initialized', adapterStatuses);
  } catch (error) {
    logAdsDebug('AdMob initialization failed', error);
    throw error;
  }
}

// ── Interstitial hook ──────────────────────────────────────
// Use in any screen that needs to show a full-screen ad.
// Preloads automatically and reloads after each show.
export function useInterstitialAd() {
  const adRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  const [status, setStatus] = useState('idle');

  const load = useCallback(() => {
    if (!_InterstitialAd) {
      setStatus('native-module-missing');
      logAdsDebug('Skipping interstitial preload because native ads module is unavailable');
      return () => {};
    }

    setStatus('loading');
    logAdsDebug('Loading interstitial', { unitId: AdUnitIds.interstitial });

    const ad = _InterstitialAd.createForAdRequest(AdUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;
    isLoadedRef.current = false;

    const unsubLoad = ad.addAdEventListener(_AdEventType.LOADED, () => {
      isLoadedRef.current = true;
      setStatus('loaded');
      logAdsDebug('Interstitial loaded');
    });
    const unsubClose = ad.addAdEventListener(_AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      setStatus('closed');
      logAdsDebug('Interstitial closed; reloading');
      load(); // preload the next one immediately
    });
    const unsubError = ad.addAdEventListener(_AdEventType.ERROR, (error: unknown) => {
      isLoadedRef.current = false;
      setStatus('error');
      logAdsDebug('Interstitial failed to load/show', error);
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
      setStatus('showing');
      logAdsDebug('Showing interstitial');
      adRef.current.show();
      return true;
    }
    logAdsDebug('Interstitial show skipped because ad is not loaded', { status });
    return false;
  }, [status]);

  return { show, status };
}
