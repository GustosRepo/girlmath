import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaywallScreen, { PAYWALL_DISMISSED_KEY } from '../screens/PaywallScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface PaywallContextValue {
  /** Imperatively show the paywall from any screen */
  showPaywall: () => void;
  /** True while paywall is visible */
  paywallVisible: boolean;
}

const PaywallContext = createContext<PaywallContextValue>({
  showPaywall: () => {},
  paywallVisible: false,
});

export function usePaywall() {
  return useContext(PaywallContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider — place once at the root (wrapping NavigationContainer)
// ─────────────────────────────────────────────────────────────────────────────
export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  // First-launch gate — show once if never dismissed
  useEffect(() => {
    AsyncStorage.getItem(PAYWALL_DISMISSED_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  const showPaywall = () => setVisible(true);
  const handleClose = () => setVisible(false);

  return (
    <PaywallContext.Provider value={{ showPaywall, paywallVisible: visible }}>
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
