import { PriceCheckResult } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Backend Configuration ─────────────────────────────────
// 🚀 PRODUCTION: paste your Railway URL here once deployed
const PRODUCTION_API_URL = 'REPLACE_WITH_RAILWAY_URL'; // e.g. https://girlmath-production.up.railway.app

// 🧪 LOCAL DEV:
const IS_SIMULATOR = true; // set false for physical device
const LOCAL_IP = '192.168.0.46';
const LOCAL_URL = IS_SIMULATOR ? 'http://localhost:3456' : `http://${LOCAL_IP}:3456`;

const API_URL = PRODUCTION_API_URL.startsWith('REPLACE') ? LOCAL_URL : PRODUCTION_API_URL;

const DEVICE_ID_KEY = '@girlmath_device_id';

/** Get or create a stable device ID for rate limiting */
async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'gm_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'gm_fallback_' + Date.now();
  }
}

// ── Types for backend response ─────────────────────────────
interface BackendResponse extends PriceCheckResult {
  remaining?: number;
  cached?: boolean;
  productTitle?: string;
  error?: string;
  message?: string;
}

// ══════════════════════════════════════════════════════════
// Main price check function
// Sends product name + your price to backend, compares deals
// Falls back to mock if backend is unreachable
// ══════════════════════════════════════════════════════════
export async function fetchPriceCheck(
  productName: string,
  userPrice: number,
): Promise<PriceCheckResult & { remaining?: number; rateLimited?: boolean }> {
  try {
    const deviceId = await getDeviceId();

    const res = await fetch(`${API_URL}/api/price-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, userPrice, deviceId }),
    });

    // Rate limited
    if (res.status === 429) {
      const body = await res.json();
      throw new RateLimitError(body.message || 'Daily limit reached 💅');
    }

    // API not configured — use mock fallback
    if (res.status === 503) {
      console.log('Backend API not configured, using mock data');
      return mockPriceCheck(productName, userPrice);
    }

    // Other errors with a message
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Server error ${res.status}`);
    }

    const data: BackendResponse = await res.json();
    return {
      verdict: data.verdict,
      range: data.range,
      topOptions: data.topOptions,
      remaining: data.remaining,
    };
  } catch (err) {
    // Re-throw rate limit errors so the UI can show them
    if (err instanceof RateLimitError) throw err;

    // Network error / backend not running — fall back to mock
    console.log('Backend unreachable, using mock data:', (err as Error).message);
    return mockPriceCheck(productName, userPrice);
  }
}

// ── Rate limit error class ─────────────────────────────────
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ══════════════════════════════════════════════════════════
// Mock fallback (used when backend is unreachable or unconfigured)
// ══════════════════════════════════════════════════════════
async function mockPriceCheck(productName: string, userPrice: number): Promise<PriceCheckResult> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

  const seed = productName.length;
  const basePrice = userPrice > 0 ? userPrice * 0.8 : 15 + (seed % 80);
  const variance = basePrice * 0.3;
  const low = Math.round((basePrice - variance) * 100) / 100;
  const high = Math.round((basePrice + variance) * 100) / 100;

  const stores = ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Nordstrom', 'SHEIN'];
  const notes = ['free shipping', '2-day delivery', 'open box deal', 'member price', 'clearance', ''];

  const topOptions = stores
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((store, i) => ({
      store,
      price: Math.round((low + Math.random() * (high - low)) * 100) / 100,
      note: notes[i] || undefined,
    }))
    .sort((a, b) => a.price - b.price);

  const cheapest = topOptions[0].price;
  const median = topOptions[Math.floor(topOptions.length / 2)].price;
  let verdict: PriceCheckResult['verdict'] = 'fair';
  if (userPrice && userPrice > 0) {
    if (userPrice <= cheapest * 1.05) verdict = 'steal';
    else if (userPrice >= median * 1.15) verdict = 'overpriced';
  } else {
    if (cheapest <= low * 1.05) verdict = 'steal';
    else if (cheapest >= high * 0.9) verdict = 'overpriced';
  }

  return { verdict, range: { low, high }, topOptions };
}
