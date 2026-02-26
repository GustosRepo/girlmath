export type PersonalityMode = 'delulu' | 'responsible' | 'chaotic';

export type AuraLevel = 'glowing' | 'healing' | 'broke';

export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

export type PriceVerdict = 'steal' | 'fair' | 'overpriced';

// ── Money context ──────────────────────────────────────────
export interface MoneyContext {
  payFrequency: PayFrequency;
  payAmount: number;
  rent: number;
  carNote: number;
  billsTotal: number;
  savingsGoalPct: number; // 0–30
}

export interface SpendableResult {
  perPeriod: number;
  monthly: number;
  purchasePct: number; // purchase as % of spendable-per-period
}

// ── Price check ────────────────────────────────────────────
export interface PriceCheckOption {
  store: string;
  price: number;
  note?: string;
}

export interface PriceCheckResult {
  verdict: PriceVerdict;
  range: { low: number; high: number };
  topOptions: PriceCheckOption[];
}

// ── AI request / response ──────────────────────────────────
export interface JustificationRequest {
  itemName: string;
  price: number;
  note?: string;
  personality: PersonalityMode;
  // optional enrichments
  spendable?: SpendableResult;
  priceCheck?: PriceCheckResult;
}

export interface JustificationResponse {
  message: string;
  emoji: string;
  reactions: string[];
}

// ── Persistence ────────────────────────────────────────────
export interface PersistedState {
  moneyContext?: MoneyContext;
  lastMode?: PersonalityMode;
}

// ── Bill reminders ─────────────────────────────────────────
export interface BillReminder {
  id: string;
  name: string;
  amount: number;
  dueDay: number;        // 1–31 day of month
  emoji: string;
  isPaid: boolean;        // paid this period?
  paidDate?: string;      // ISO date string when marked paid
  category: BillCategory;
  notifIds?: string[];   // scheduled expo-notification IDs
}

export type BillCategory =
  | 'rent'
  | 'utilities'
  | 'subscriptions'
  | 'insurance'
  | 'phone'
  | 'car'
  | 'loans'
  | 'other';

// ── Justification history ──────────────────────────────────
export interface HistoryEntry {
  id: string;
  itemName: string;
  price: number;
  personality: PersonalityMode;
  message: string;
  emoji: string;
  verdict?: PriceVerdict;
  timestamp: string;      // ISO date string
}
