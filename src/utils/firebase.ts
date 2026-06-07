import analytics from '@react-native-firebase/analytics';

/**
 * Initialize Firebase Analytics
 * Called on app startup — no await needed, runs async in background
 */
export function initializeFirebase() {
  try {
    // Firebase is auto-initialized via the plugin
    // This is just a safety check + log
    console.log('[Firebase] Analytics initialized');
  } catch (error) {
    console.warn('[Firebase] Failed to initialize:', error);
  }
}

/**
 * Track custom events for Google Ads conversion tracking
 */
export const trackEvent = {
  /** User completed onboarding */
  completeOnboarding: async () => {
    try {
      await analytics().logEvent('tutorial_complete');
    } catch (error) {
      console.warn('[Firebase] Failed to track onboarding:', error);
    }
  },

  /** User viewed the paywall */
  viewPaywall: async () => {
    try {
      await analytics().logEvent('view_item', {
        item_id: 'premium_subscription',
        item_name: 'GirlMath Premium',
      });
    } catch (error) {
      console.warn('[Firebase] Failed to track paywall view:', error);
    }
  },

  /** User started a purchase flow */
  beginCheckout: async (productId: string, price?: number) => {
    try {
      await analytics().logEvent('begin_checkout', {
        currency: 'USD',
        value: price || 0,
        items: [{ item_id: productId, item_name: 'Premium' }],
      });
    } catch (error) {
      console.warn('[Firebase] Failed to track checkout:', error);
    }
  },

  /** User completed a purchase (fire this from RevenueCat listener) */
  purchase: async (productId: string, price: number, revenue: number) => {
    try {
      await analytics().logEvent('purchase', {
        currency: 'USD',
        value: revenue,
        transaction_id: `${Date.now()}_${productId}`,
        items: [
          {
            item_id: productId,
            item_name: 'Premium',
            price,
          },
      ],
    });
    } catch (error) {
      console.warn('[Firebase] Failed to track purchase:', error);
    }
  },

  /** User logged a spend (engagement event) */
  logSpend: async (amount: number, category: string) => {
    try {
      await analytics().logEvent('spend_virtual_currency', {
        value: amount,
        virtual_currency_name: category,
      });
    } catch (error) {
      console.warn('[Firebase] Failed to track spend:', error);
    }
  },

  /** User added a bill reminder (engagement) */
  addBill: async () => {
    try {
      await analytics().logEvent('add_to_wishlist', {
        item_name: 'bill_reminder',
      });
    } catch (error) {
      console.warn('[Firebase] Failed to track add bill:', error);
    }
  },

  /** User set a savings goal (engagement) */
  setSavingsGoal: async (goalAmount: number) => {
    try {
      await analytics().logEvent('set_checkout_option', {
        checkout_option: 'savings_goal',
        value: goalAmount,
      });
    } catch (error) {
      console.warn('[Firebase] Failed to track savings goal:', error);
    }
  },
};
