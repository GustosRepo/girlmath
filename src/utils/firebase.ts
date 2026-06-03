import analytics from '@react-native-firebase/analytics';

/**
 * Initialize Firebase Analytics
 * Called on app startup — no await needed, runs async in background
 */
export function initializeFirebase() {
  // Firebase is auto-initialized via the plugin
  // This is just a safety check + log
  console.log('[Firebase] Analytics initialized');
}

/**
 * Track custom events for Google Ads conversion tracking
 */
export const trackEvent = {
  /** User completed onboarding */
  completeOnboarding: async () => {
    await analytics().logEvent('tutorial_complete');
  },

  /** User viewed the paywall */
  viewPaywall: async () => {
    await analytics().logEvent('view_item', {
      item_id: 'premium_subscription',
      item_name: 'GirlMath Premium',
    });
  },

  /** User started a purchase flow */
  beginCheckout: async (productId: string, price?: number) => {
    await analytics().logEvent('begin_checkout', {
      currency: 'USD',
      value: price || 0,
      items: [{ item_id: productId, item_name: 'Premium' }],
    });
  },

  /** User completed a purchase (fire this from RevenueCat listener) */
  purchase: async (productId: string, price: number, revenue: number) => {
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
  },

  /** User logged a spend (engagement event) */
  logSpend: async (amount: number, category: string) => {
    await analytics().logEvent('spend_virtual_currency', {
      value: amount,
      virtual_currency_name: category,
    });
  },

  /** User added a bill reminder (engagement) */
  addBill: async () => {
    await analytics().logEvent('add_to_wishlist', {
      item_name: 'bill_reminder',
    });
  },

  /** User set a savings goal (engagement) */
  setSavingsGoal: async (goalAmount: number) => {
    await analytics().logEvent('set_checkout_option', {
      checkout_option: 'savings_goal',
      value: goalAmount,
    });
  },
};
