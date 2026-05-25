import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState, MoneyContext, PersonalityMode, BillReminder, HistoryEntry, PeriodExpenses, PayFrequency, SpendCategory, BudgetCategoryLimit, AuraTheme, CostPerUseItem, Subscription, SavingsJarEntry, TreatYourselfBudget, AuraScore, SavingsGoal } from '../types';

const KEY = '@girlmath_state';
const BILLS_KEY = '@girlmath_bills';
const HISTORY_KEY = '@girlmath_history';
const EXPENSES_KEY = '@girlmath_expenses';
const STORAGE_VERSION_KEY = '@girlmath_storage_version';
const LANGUAGE_KEY = '@girlmath_language';
const CURRENT_STORAGE_VERSION = 1;

type JsonRecord = Record<string, unknown>;

const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'biweekly', 'monthly'];
const PERSONALITY_MODES: PersonalityMode[] = ['delulu', 'responsible', 'chaotic'];
const SPEND_CATEGORIES: SpendCategory[] = ['shopping', 'food', 'beauty', 'shoes', 'health', 'tech', 'fun', 'home', 'misc'];
const BILL_CATEGORIES: BillReminder['category'][] = ['rent', 'utilities', 'subscriptions', 'insurance', 'phone', 'car', 'loans', 'other'];
const AURA_THEMES: AuraTheme[] = ['default', 'clean-girl', 'y2k', 'dark-academia'];
const SUBSCRIPTION_CATEGORIES: Subscription['category'][] = ['streaming', 'fitness', 'beauty', 'food', 'software', 'other'];
const SUPPORTED_LANGUAGES = ['en', 'es', 'th'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asString(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function asNumber(value: unknown, fallback = 0, min = 0, max = 1_000_000): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}

function asIsoString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return undefined;
  return new Date(time).toISOString();
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function sanitizeMoneyContext(value: unknown): MoneyContext | undefined {
  if (!isRecord(value) || !isOneOf(value.payFrequency, PAY_FREQUENCIES)) return undefined;
  return {
    payFrequency: value.payFrequency,
    payAmount: asNumber(value.payAmount),
    rent: asNumber(value.rent),
    carNote: asNumber(value.carNote),
    billsTotal: asNumber(value.billsTotal),
    savingsGoalPct: asNumber(value.savingsGoalPct, 10, 0, 100),
  };
}

function sanitizeState(value: unknown): PersistedState {
  if (!isRecord(value)) return {};
  const state: PersistedState = {};
  const moneyContext = sanitizeMoneyContext(value.moneyContext);
  if (moneyContext) state.moneyContext = moneyContext;
  if (isOneOf(value.lastMode, PERSONALITY_MODES)) state.lastMode = value.lastMode;
  return state;
}

function sanitizeBill(value: unknown): BillReminder | undefined {
  if (!isRecord(value) || !isOneOf(value.category, BILL_CATEGORIES)) return undefined;
  const id = asString(value.id, 80);
  const name = asString(value.name);
  if (!id || !name) return undefined;
  const notifIds = Array.isArray(value.notifIds)
    ? value.notifIds.filter((id): id is string => typeof id === 'string').slice(0, 12)
    : undefined;
  return {
    id,
    name,
    amount: asNumber(value.amount),
    dueDay: Math.round(asNumber(value.dueDay, 1, 1, 31)),
    emoji: asString(value.emoji, 8) ?? '💸',
    isPaid: value.isPaid === true,
    paidDate: asIsoString(value.paidDate),
    category: value.category,
    notifIds,
  };
}

function sanitizeHistoryEntry(value: unknown): HistoryEntry | undefined {
  if (!isRecord(value) || !isOneOf(value.personality, PERSONALITY_MODES)) return undefined;
  const id = asString(value.id, 80);
  const itemName = asString(value.itemName);
  const message = asString(value.message, 400);
  const timestamp = asIsoString(value.timestamp);
  if (!id || !itemName || !message || !timestamp) return undefined;
  return {
    id,
    itemName,
    price: asNumber(value.price),
    personality: value.personality,
    message,
    emoji: asString(value.emoji, 8) ?? '💸',
    verdict: isOneOf(value.verdict, ['steal', 'fair', 'overpriced'] as const) ? value.verdict : undefined,
    timestamp,
    isLogged: value.isLogged === true,
    category: isOneOf(value.category, SPEND_CATEGORIES) ? value.category : undefined,
  };
}

function sanitizePeriodExpenses(value: unknown, currentStart: string): PeriodExpenses | undefined {
  if (!isRecord(value) || value.periodStart !== currentStart) return undefined;
  const byCategory: Partial<Record<SpendCategory, number>> = {};
  if (isRecord(value.byCategory)) {
    for (const category of SPEND_CATEGORIES) {
      if (value.byCategory[category] != null) byCategory[category] = asNumber(value.byCategory[category]);
    }
  }
  return {
    periodStart: currentStart,
    total: asNumber(value.total),
    ...(Object.keys(byCategory).length > 0 ? { byCategory } : {}),
  };
}

function sanitizeBudgetLimit(value: unknown): BudgetCategoryLimit | undefined {
  if (!isRecord(value) || !isOneOf(value.category, SPEND_CATEGORIES)) return undefined;
  return { category: value.category, limit: asNumber(value.limit) };
}

function sanitizeCostPerUseItem(value: unknown): CostPerUseItem | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id, 80);
  const name = asString(value.name);
  const dateAdded = asIsoString(value.dateAdded);
  if (!id || !name || !dateAdded) return undefined;
  return {
    id,
    name,
    emoji: asString(value.emoji, 8) ?? '🛍️',
    price: asNumber(value.price),
    uses: Math.round(asNumber(value.uses, 0, 0, 100_000)),
    dateAdded,
  };
}

function sanitizeSubscription(value: unknown): Subscription | undefined {
  if (!isRecord(value) || !isOneOf(value.category, SUBSCRIPTION_CATEGORIES)) return undefined;
  const id = asString(value.id, 80);
  const name = asString(value.name);
  if (!id || !name) return undefined;
  return {
    id,
    name,
    emoji: asString(value.emoji, 8) ?? '💳',
    monthlyCost: asNumber(value.monthlyCost),
    category: value.category,
  };
}

function sanitizeSavingsJarEntry(value: unknown): SavingsJarEntry | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id, 80);
  const itemName = asString(value.itemName);
  const timestamp = asIsoString(value.timestamp);
  if (!id || !itemName || !timestamp) return undefined;
  return {
    id,
    itemName,
    price: asNumber(value.price),
    timestamp,
    note: asString(value.note, 180),
  };
}

function sanitizeTreatBudget(value: unknown): TreatYourselfBudget | undefined {
  if (!isRecord(value)) return undefined;
  return {
    monthlyLimit: asNumber(value.monthlyLimit, 100),
    spent: asNumber(value.spent),
    periodStart: asIsoString(value.periodStart) ?? new Date().toISOString(),
  };
}

function sanitizeAuraScore(value: unknown): AuraScore | undefined {
  if (!isRecord(value)) return undefined;
  return {
    score: Math.round(asNumber(value.score, 500, 0, 1000)),
    lastUpdated: asIsoString(value.lastUpdated) ?? new Date().toISOString(),
  };
}

function sanitizeSavingsGoal(value: unknown): SavingsGoal | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id, 80);
  const name = asString(value.name);
  const createdAt = asIsoString(value.createdAt);
  if (!id || !name || !createdAt) return undefined;
  const targetAmount = asNumber(value.targetAmount);
  const savedAmount = Math.min(asNumber(value.savedAmount), targetAmount);
  return {
    id,
    name,
    emoji: asString(value.emoji, 8) ?? '🎯',
    targetAmount,
    savedAmount,
    deadline: asIsoString(value.deadline),
    createdAt,
    isComplete: savedAmount >= targetAmount || value.isComplete === true,
  };
}

function sanitizeArray<T>(value: unknown, sanitize: (item: unknown) => T | undefined, maxItems = 500): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(sanitize).filter((item): item is T => item != null).slice(0, maxItems);
}

async function migrateJsonArray<T>(
  key: string,
  sanitize: (item: unknown) => T | undefined,
  maxItems?: number,
): Promise<void> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return;
  const sanitized = sanitizeArray(parseJson(raw), sanitize, maxItems);
  await AsyncStorage.setItem(key, JSON.stringify(sanitized));
}

async function migrateVersion1(): Promise<void> {
  const stateRaw = await AsyncStorage.getItem(KEY);
  if (stateRaw) {
    const state = sanitizeState(parseJson(stateRaw));
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  }

  await migrateJsonArray(BILLS_KEY, sanitizeBill, 100);
  await migrateJsonArray(HISTORY_KEY, sanitizeHistoryEntry, 50);
  await migrateJsonArray(BUDGET_LIMITS_KEY, sanitizeBudgetLimit, 25);
  await migrateJsonArray(CPU_KEY, sanitizeCostPerUseItem, 100);
  await migrateJsonArray(SUBS_KEY, sanitizeSubscription, 100);
  await migrateJsonArray(JAR_KEY, sanitizeSavingsJarEntry, 500);
  await migrateJsonArray(SAVINGS_GOALS_KEY, sanitizeSavingsGoal, 100);

  const countRaw = await AsyncStorage.getItem(JUSTIFY_COUNT_KEY);
  if (countRaw) {
    const parsed = parseJson(countRaw);
    if (isRecord(parsed) && typeof parsed.date === 'string') {
      await AsyncStorage.setItem(
        JUSTIFY_COUNT_KEY,
        JSON.stringify({
          date: parsed.date,
          count: Math.round(asNumber(parsed.count, 0, 0, 1_000)),
        }),
      );
    }
  }

  const totalRaw = await AsyncStorage.getItem(TOTAL_JUSTIFY_KEY);
  if (totalRaw) {
    await AsyncStorage.setItem(TOTAL_JUSTIFY_KEY, String(Math.round(asNumber(totalRaw, 0, 0, 1_000_000))));
  }

  const themeRaw = await AsyncStorage.getItem(AURA_THEME_KEY);
  if (themeRaw && !isOneOf(themeRaw, AURA_THEMES)) {
    await AsyncStorage.setItem(AURA_THEME_KEY, 'default');
  }

  const treatRaw = await AsyncStorage.getItem(TREAT_KEY);
  if (treatRaw) {
    const budget = sanitizeTreatBudget(parseJson(treatRaw));
    if (budget) await AsyncStorage.setItem(TREAT_KEY, JSON.stringify(budget));
  }

  const auraRaw = await AsyncStorage.getItem(AURA_SCORE_KEY);
  if (auraRaw) {
    const score = sanitizeAuraScore(parseJson(auraRaw));
    if (score) await AsyncStorage.setItem(AURA_SCORE_KEY, JSON.stringify(score));
  }

  const expensesRaw = await AsyncStorage.getItem(EXPENSES_KEY);
  if (expensesRaw) {
    const parsed = parseJson(expensesRaw);
    if (isRecord(parsed) && typeof parsed.periodStart === 'string') {
      const byCategory: Partial<Record<SpendCategory, number>> = {};
      if (isRecord(parsed.byCategory)) {
        for (const category of SPEND_CATEGORIES) {
          if (parsed.byCategory[category] != null) {
            byCategory[category] = asNumber(parsed.byCategory[category]);
          }
        }
      }
      const expenses: PeriodExpenses = {
        periodStart: parsed.periodStart,
        total: asNumber(parsed.total),
        ...(Object.keys(byCategory).length > 0 ? { byCategory } : {}),
      };
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    }
  }
}

export async function runStorageMigrations(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_VERSION_KEY);
    const version = Math.round(asNumber(raw, 0, 0, CURRENT_STORAGE_VERSION));

    if (version < 1) {
      await migrateVersion1();
    }

    await AsyncStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
  } catch {
    // Keep startup resilient. Individual loaders still validate data on read.
  }
}

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return sanitizeState(parseJson(raw));
  } catch {}
  return {};
}

export async function saveMoneyContext(ctx: MoneyContext): Promise<void> {
  try {
    const prev = await loadState();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, moneyContext: ctx }));
  } catch {}
}

export async function saveMode(mode: PersonalityMode): Promise<void> {
  try {
    const prev = await loadState();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, lastMode: mode }));
  } catch {}
}

// ── Bills ──────────────────────────────────────────────────
export async function loadBills(): Promise<BillReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(BILLS_KEY);
    return sanitizeArray(parseJson(raw), sanitizeBill, 100);
  } catch {}
  return [];
}

export async function saveBills(bills: BillReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills));
  } catch {}
}

// ── History ────────────────────────────────────────────────
export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return sanitizeArray(parseJson(raw), sanitizeHistoryEntry, 50);
  } catch {}
  return [];
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  try {
    const prev = await loadHistory();
    const updated = [entry, ...prev].slice(0, 50); // keep last 50
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
}

// ── Justify counter — daily limit (resets each new day) ───────
// Stored as JSON: { count: number, date: 'YYYY-MM-DD' }
const JUSTIFY_COUNT_KEY = '@girlmath_justify_count';

function todayStr(): string {
  // Use local date, not UTC, so the daily reset matches the user's actual day
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function incrementJustifyCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(JUSTIFY_COUNT_KEY);
    const today = todayStr();
    let count = 0;
    if (raw) {
      const parsed = parseJson(raw);
      // Same day — keep counting; new day — reset
      count = isRecord(parsed) && parsed.date === today ? Math.round(asNumber(parsed.count, 0, 0, 1_000)) : 0;
    }
    const next = count + 1;
    await AsyncStorage.setItem(JUSTIFY_COUNT_KEY, JSON.stringify({ count: next, date: today }));
    return next;
  } catch {
    return 0;
  }
}

export async function getJustifyCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(JUSTIFY_COUNT_KEY);
    if (!raw) return 0;
    const parsed = parseJson(raw);
    return isRecord(parsed) && parsed.date === todayStr() ? Math.round(asNumber(parsed.count, 0, 0, 1_000)) : 0;
  } catch {
    return 0;
  }
}

// ── Lifetime total justify counter (never resets) ─────────────────
const TOTAL_JUSTIFY_KEY = '@girlmath_total_justifies';

export async function incrementTotalJustifyCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(TOTAL_JUSTIFY_KEY);
    const next = (raw ? (parseInt(raw, 10) || 0) : 0) + 1;
    await AsyncStorage.setItem(TOTAL_JUSTIFY_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

// ── Period expenses (resets each pay period) ──────────────────
const PERIODS_PER_MONTH: Record<PayFrequency, number> = {
  weekly: 4.33,
  biweekly: 2,
  monthly: 1,
};

function getPeriodStartDate(freq: PayFrequency): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (freq === 'monthly') {
    return new Date(year, month, 1).toISOString();
  }
  if (freq === 'biweekly') {
    // 2-week periods starting from the 1st and 15th
    const periodDay = day < 15 ? 1 : 15;
    return new Date(year, month, periodDay).toISOString();
  }
  // weekly — start of current week (Sunday)
  const dayOfWeek = now.getDay();
  const start = new Date(year, month, day - dayOfWeek);
  return start.toISOString();
}

export async function loadPeriodExpenses(freq: PayFrequency): Promise<PeriodExpenses> {
  try {
    const raw = await AsyncStorage.getItem(EXPENSES_KEY);
    const currentStart = getPeriodStartDate(freq);
    if (raw) {
      const parsed = sanitizePeriodExpenses(parseJson(raw), currentStart);
      // Same period → return it; new period → reset
      if (parsed) return parsed;
    }
    return { periodStart: currentStart, total: 0 };
  } catch {
    return { periodStart: getPeriodStartDate(freq), total: 0 };
  }
}

export async function addExpense(amount: number, freq: PayFrequency, category?: SpendCategory): Promise<PeriodExpenses> {
  try {
    const current = await loadPeriodExpenses(freq);
    const updated: PeriodExpenses = {
      ...current,
      total: Math.round((current.total + amount) * 100) / 100,
      byCategory: {
        ...current.byCategory,
        ...(category ? { [category]: Math.round(((current.byCategory?.[category] ?? 0) + amount) * 100) / 100 } : {}),
      },
    };
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return { periodStart: '', total: 0 };
  }
}

// ── Aura theme ─────────────────────────────────────────────
const AURA_THEME_KEY = '@girlmath_aura_theme';

export async function saveAuraTheme(theme: AuraTheme): Promise<void> {
  try {
    await AsyncStorage.setItem(AURA_THEME_KEY, theme);
  } catch {}
}

export async function loadAuraTheme(): Promise<AuraTheme> {
  try {
    const raw = await AsyncStorage.getItem(AURA_THEME_KEY);
    if (isOneOf(raw, AURA_THEMES)) return raw;
  } catch {}
  return 'default';
}

// ── Budget category limits (premium) ──────────────────────
const BUDGET_LIMITS_KEY = '@girlmath_budget_limits';

export async function loadBudgetLimits(): Promise<BudgetCategoryLimit[]> {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_LIMITS_KEY);
    return sanitizeArray(parseJson(raw), sanitizeBudgetLimit, 25);
  } catch {}
  return [];
}

export async function saveBudgetLimits(limits: BudgetCategoryLimit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BUDGET_LIMITS_KEY, JSON.stringify(limits));
  } catch {}
}

// ── Cost-per-use tracker ───────────────────────────────────
const CPU_KEY = '@girlmath_cpu';

export async function loadCostPerUseItems(): Promise<CostPerUseItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CPU_KEY);
    return sanitizeArray(parseJson(raw), sanitizeCostPerUseItem, 100);
  } catch {}
  return [];
}

export async function saveCostPerUseItems(items: CostPerUseItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CPU_KEY, JSON.stringify(items));
  } catch {}
}

export async function incrementCostPerUse(id: string): Promise<CostPerUseItem[]> {
  try {
    const items = await loadCostPerUseItems();
    const updated = items.map(i => i.id === id ? { ...i, uses: i.uses + 1 } : i);
    await saveCostPerUseItems(updated);
    return updated;
  } catch {
    return [];
  }
}

// ── Subscriptions ──────────────────────────────────────────
const SUBS_KEY = '@girlmath_subscriptions';

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    const raw = await AsyncStorage.getItem(SUBS_KEY);
    return sanitizeArray(parseJson(raw), sanitizeSubscription, 100);
  } catch {}
  return [];
}

export async function saveSubscriptions(subs: Subscription[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  } catch {}
}

// ── Savings jar ────────────────────────────────────────────
const JAR_KEY = '@girlmath_savings_jar';

export async function loadSavingsJar(): Promise<SavingsJarEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(JAR_KEY);
    return sanitizeArray(parseJson(raw), sanitizeSavingsJarEntry, 500);
  } catch {}
  return [];
}

export async function addToSavingsJar(entry: SavingsJarEntry): Promise<void> {
  try {
    const existing = await loadSavingsJar();
    await AsyncStorage.setItem(JAR_KEY, JSON.stringify([entry, ...existing]));
  } catch {}
}

export async function saveSavingsJar(entries: SavingsJarEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(JAR_KEY, JSON.stringify(entries));
  } catch {}
}

// ── Treat yourself budget ──────────────────────────────────
const TREAT_KEY = '@girlmath_treat_budget';

export async function loadTreatBudget(): Promise<TreatYourselfBudget> {
  try {
    const raw = await AsyncStorage.getItem(TREAT_KEY);
    return sanitizeTreatBudget(parseJson(raw)) ?? { monthlyLimit: 100, spent: 0, periodStart: new Date().toISOString() };
  } catch {}
  return { monthlyLimit: 100, spent: 0, periodStart: new Date().toISOString() };
}

export async function saveTreatBudget(budget: TreatYourselfBudget): Promise<void> {
  try {
    await AsyncStorage.setItem(TREAT_KEY, JSON.stringify(budget));
  } catch {}
}

export async function addTreatSpend(amount: number): Promise<TreatYourselfBudget> {
  try {
    const current = await loadTreatBudget();
    const updated = { ...current, spent: current.spent + amount };
    await saveTreatBudget(updated);
    return updated;
  } catch {
    return { monthlyLimit: 100, spent: 0, periodStart: new Date().toISOString() };
  }
}

// ── Aura score ─────────────────────────────────────────────
const AURA_SCORE_KEY = '@girlmath_aura_score';

export async function loadAuraScore(): Promise<AuraScore> {
  try {
    const raw = await AsyncStorage.getItem(AURA_SCORE_KEY);
    return sanitizeAuraScore(parseJson(raw)) ?? { score: 500, lastUpdated: new Date().toISOString() };
  } catch {}
  return { score: 500, lastUpdated: new Date().toISOString() };
}

export async function saveAuraScore(score: AuraScore): Promise<void> {
  try {
    await AsyncStorage.setItem(AURA_SCORE_KEY, JSON.stringify(score));
  } catch {}
}

/** Call after each logged expense. Adjusts score based on budget health. */
export async function updateAuraScore(spentPct: number): Promise<AuraScore> {
  const current = await loadAuraScore();
  // spentPct = purchasePct of spendable. Under 5% = gain, 5-15% = neutral, over 15% = lose
  let delta = 0;
  if (spentPct <= 2) delta = 15;
  else if (spentPct <= 5) delta = 8;
  else if (spentPct <= 10) delta = 0;
  else if (spentPct <= 15) delta = -8;
  else delta = -20;
  const newScore: AuraScore = {
    score: Math.max(0, Math.min(1000, current.score + delta)),
    lastUpdated: new Date().toISOString(),
  };
  await saveAuraScore(newScore);
  return newScore;
}

// ── Savings goals ────────────────────────────────────────────
const SAVINGS_GOALS_KEY = '@girlmath_savings_goals';

export async function loadSavingsGoals(): Promise<SavingsGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVINGS_GOALS_KEY);
    return sanitizeArray(parseJson(raw), sanitizeSavingsGoal, 100);
  } catch {}
  return [];
}

export async function saveSavingsGoals(goals: SavingsGoal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals));
  } catch {}
}

export async function contributeToGoal(goalId: string, amount: number): Promise<SavingsGoal[]> {
  try {
    const goals = await loadSavingsGoals();
    const updated = goals.map(g => {
      if (g.id !== goalId) return g;
      const newSaved = Math.min(g.savedAmount + amount, g.targetAmount);
      return { ...g, savedAmount: newSaved, isComplete: newSaved >= g.targetAmount };
    });
    await saveSavingsGoals(updated);
    return updated;
  } catch {
    return [];
  }
}

// ── Language preference ────────────────────────────────────────────
export async function loadLanguage(): Promise<SupportedLanguage | null> {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (!raw) return null;
    const lang = asString(raw, 5);
    return lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ? (lang as SupportedLanguage) : null;
  } catch {
    return null;
  }
}

export async function saveLanguage(lang: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
}
