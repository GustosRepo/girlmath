export type PersonalityMode = 'delulu' | 'responsible' | 'chaotic';

export type AuraLevel = 'glowing' | 'healing' | 'broke';

export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

export type PriceVerdict = 'steal' | 'fair' | 'overpriced';

export type SpendCategory =
  | 'shopping'
  | 'food'
  | 'beauty'
  | 'shoes'
  | 'health'
  | 'tech'
  | 'fun'
  | 'home'
  | 'misc';

export type AuraTheme = 'default' | 'clean-girl' | 'y2k' | 'dark-academia';

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

// ── Smart context (real user data woven into responses) ────
export interface SmartJustificationContext {
  topCategory?: SpendCategory;
  topCategoryAmount?: number;
  daysSinceLastSplurge?: number;
  savingsJarTotal?: number;
  treatBudgetRemaining?: number;
  weekTotal?: number;
  auraScore?: number;
}

// ── AI request / response ──────────────────────────────────
export interface JustificationRequest {
  itemName: string;
  price: number;
  note?: string;
  personality: PersonalityMode;
  spendable?: SpendableResult;
  smartCtx?: SmartJustificationContext;
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
  isLogged?: boolean;     // true if user logged as actual expense
  category?: SpendCategory; // spend category for logged entries
}

// ── Expense tracking ───────────────────────────────────────
export interface PeriodExpenses {
  periodStart: string;    // ISO date of current pay period start
  total: number;          // running total for this period
  byCategory?: Partial<Record<SpendCategory, number>>;
}

// ── Budget category limits (premium) ──────────────────────
export interface BudgetCategoryLimit {
  category: SpendCategory;
  limit: number; // 0 = no limit per period
}

// ── Cost-per-use tracker ───────────────────────────────────
export interface CostPerUseItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  uses: number;
  dateAdded: string; // ISO
}

// ── Subscriptions ──────────────────────────────────────────
export interface Subscription {
  id: string;
  name: string;
  emoji: string;
  monthlyCost: number;
  category: 'streaming' | 'fitness' | 'beauty' | 'food' | 'software' | 'other';
}

// ── Savings jar ────────────────────────────────────────────
export interface SavingsJarEntry {
  id: string;
  itemName: string;
  price: number;
  timestamp: string; // ISO
  note?: string;
}

// ── Treat yourself budget ──────────────────────────────────
export interface TreatYourselfBudget {
  monthlyLimit: number;
  spent: number;
  periodStart: string; // ISO — resets each pay period
}

// ── Aura score ─────────────────────────────────────────────
export interface AuraScore {
  score: number; // 0–1000
  lastUpdated: string; // ISO
}

// ── Savings goals ──────────────────────────────────────────
export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string; // ISO date string
  createdAt: string; // ISO
  isComplete: boolean;
}
