import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaywallScreen, { PAYWALL_DISMISSED_KEY } from '../screens/PaywallScreen';
import { hasPremium } from '../utils/purchases';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface PaywallContextValue {
  /** Imperatively show the paywall from any screen */
  showPaywall: () => void | Promise<void>;
  /** True while paywall is visible */
  paywallVisible: boolean;
  /** Whether the current user has an active premium subscription */
  isPremium: boolean;
  /** Re-check premium status from RevenueCat (call after purchase) */
  refreshPremium: () => Promise<void>;
}

const PaywallContext = createContext<PaywallContextValue>({
  showPaywall: () => {},
  paywallVisible: false,
  isPremium: false,
  refreshPremium: async () => {},
});

export function usePaywall() {
  return useContext(PaywallContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider — place once at the root (wrapping NavigationContainer)
// ─────────────────────────────────────────────────────────────────────────────
export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const refreshPremium = async () => {
    const premium = await hasPremium();
    setIsPremium(premium);
  };

  // First-launch gate — show once if never dismissed AND not already premium
  useEffect(() => {
    (async () => {
      const dismissed = await AsyncStorage.getItem(PAYWALL_DISMISSED_KEY);
      const premium = await hasPremium();
      setIsPremium(premium);
      if (dismissed || premium) {
        if (premium) await AsyncStorage.setItem(PAYWALL_DISMISSED_KEY, 'true');
        return;
      }
      setVisible(true);
    })();
  }, []);

  // Re-check premium whenever the app comes back to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshPremium();
      }
    });
    return () => sub.remove();
  }, []);

  const showPaywall = async () => {
    const premium = await hasPremium();
    if (premium) return; // already subscribed, never show
    setVisible(true);
  };
  const handleClose = async () => {
    await refreshPremium();
    setVisible(false);
  };

  return (
    <PaywallContext.Provider value={{ showPaywall, paywallVisible: visible, isPremium, refreshPremium }}>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <PaywallScreen onClose={handleClose} />
      </Modal>
      {children}
    </PaywallContext.Provider>
  );
}
