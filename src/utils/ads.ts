import { Platform } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';

// react-native-google-mobile-ads needs a native EAS build.
// Using require() inside try/catch so the app still runs in Expo Go.
let _mobileAds: any;
let _InterstitialAd: any;
let _AdEventType: any;
let _RewardedAd: any;
let _RewardedAdEventType: any;
let _MaxAdContentRating: any;
let _BannerAd: any;
let _BannerAdSize: any;
try {
  const m = require('react-native-google-mobile-ads');
  _mobileAds = m.default;
  _InterstitialAd = m.InterstitialAd;
  _AdEventType = m.AdEventType;
  _RewardedAd = m.RewardedAd;
  _RewardedAdEventType = m.RewardedAdEventType;
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
  rewarded: {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
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
  rewarded: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED ?? GOOGLE_TEST_IDS.rewarded.ios,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED ?? GOOGLE_TEST_IDS.rewarded.android,
  },
};

const IDS = ADS_FORCE_TEST_IDS ? GOOGLE_TEST_IDS : CONFIGURED_IDS;

export const AdUnitIds = {
  banner: Platform.OS === 'ios' ? IDS.banner.ios : IDS.banner.android,
  interstitial: Platform.OS === 'ios' ? IDS.interstitial.ios : IDS.interstitial.android,
  rewarded: Platform.OS === 'ios' ? IDS.rewarded.ios : IDS.rewarded.android,
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
    rewardedUnitId: AdUnitIds.rewarded,
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

export function useRewardedAd() {
  const adRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  const earnedRewardRef = useRef(false);
  const pendingResolverRef = useRef<((didEarnReward: boolean) => void) | null>(null);
  const [status, setStatus] = useState('idle');

  const resolvePending = useCallback((didEarnReward: boolean) => {
    if (!pendingResolverRef.current) return;
    pendingResolverRef.current(didEarnReward);
    pendingResolverRef.current = null;
  }, []);

  const load = useCallback(() => {
    if (!_RewardedAd) {
      setStatus('native-module-missing');
      logAdsDebug('Skipping rewarded preload because native ads module is unavailable');
      return () => {};
    }

    setStatus('loading');
    logAdsDebug('Loading rewarded ad', { unitId: AdUnitIds.rewarded });

    const ad = _RewardedAd.createForAdRequest(AdUnitIds.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;
    isLoadedRef.current = false;
    earnedRewardRef.current = false;

    const loadedEvent = _RewardedAdEventType?.LOADED ?? _AdEventType?.LOADED;
    const earnedEvent = _RewardedAdEventType?.EARNED_REWARD;

    const unsubLoad = loadedEvent
      ? ad.addAdEventListener(loadedEvent, () => {
          isLoadedRef.current = true;
          setStatus('loaded');
          logAdsDebug('Rewarded ad loaded');
        })
      : () => {};

    const unsubEarned = earnedEvent
      ? ad.addAdEventListener(earnedEvent, (reward: unknown) => {
          earnedRewardRef.current = true;
          setStatus('earned-reward');
          logAdsDebug('Rewarded ad earned reward', reward);
          resolvePending(true);
        })
      : () => {};

    const unsubClose = ad.addAdEventListener(_AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      setStatus('closed');
      if (!earnedRewardRef.current) resolvePending(false);
      logAdsDebug('Rewarded ad closed; reloading');
      load();
    });

    const unsubError = ad.addAdEventListener(_AdEventType.ERROR, (error: unknown) => {
      isLoadedRef.current = false;
      setStatus('error');
      resolvePending(false);
      logAdsDebug('Rewarded ad failed to load/show', error);
      load();
    });

    ad.load();
    return () => {
      unsubLoad();
      unsubEarned();
      unsubClose();
      unsubError();
    };
  }, [resolvePending]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const show = useCallback((): Promise<boolean> => {
    if (isLoadedRef.current && adRef.current) {
      setStatus('showing');
      earnedRewardRef.current = false;
      logAdsDebug('Showing rewarded ad');
      return new Promise<boolean>((resolve) => {
        pendingResolverRef.current = resolve;
        adRef.current.show();
      });
    }
    logAdsDebug('Rewarded ad show skipped because ad is not loaded', { status });
    return Promise.resolve(false);
  }, [status]);

  return { show, status };
}
