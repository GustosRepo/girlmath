import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState, MoneyContext, PersonalityMode, BillReminder, HistoryEntry, PeriodExpenses, PayFrequency, SpendCategory, BudgetCategoryLimit, AuraTheme, CostPerUseItem, Subscription, SavingsJarEntry, TreatYourselfBudget, AuraScore, SavingsGoal } from '../types';

const KEY = '@girlmath_state';
const BILLS_KEY = '@girlmath_bills';
const HISTORY_KEY = '@girlmath_history';
const EXPENSES_KEY = '@girlmath_expenses';

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
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
    if (raw) return JSON.parse(raw) as BillReminder[];
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
    if (raw) return JSON.parse(raw) as HistoryEntry[];
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
      const parsed = JSON.parse(raw);
      // Same day — keep counting; new day — reset
      count = parsed.date === today ? parsed.count : 0;
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
    const parsed = JSON.parse(raw);
    return parsed.date === todayStr() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

// ── Lifetime total justify counter (never resets) ─────────────────
const TOTAL_JUSTIFY_KEY = '@girlmath_total_justifies';

export async function incrementTotalJustifyCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(TOTAL_JUSTIFY_KEY);
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
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
      const parsed = JSON.parse(raw) as PeriodExpenses;
      // Same period → return it; new period → reset
      if (parsed.periodStart === currentStart) return parsed;
    }
    return { periodStart: currentStart, total: 0 };
  } catch {
    return { periodStart: getPeriodStartDate(freq), total: 0 };
  }
}

export async function addExpense(amount: number, freq: PayFrequency, category?: SpendCategory): Promise<PeriodExpenses> {
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
    if (raw) return raw as AuraTheme;
  } catch {}
  return 'default';
}

// ── Budget category limits (premium) ──────────────────────
const BUDGET_LIMITS_KEY = '@girlmath_budget_limits';

export async function loadBudgetLimits(): Promise<BudgetCategoryLimit[]> {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_LIMITS_KEY);
    if (raw) return JSON.parse(raw) as BudgetCategoryLimit[];
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
    if (raw) return JSON.parse(raw) as CostPerUseItem[];
  } catch {}
  return [];
}

export async function saveCostPerUseItems(items: CostPerUseItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CPU_KEY, JSON.stringify(items));
  } catch {}
}

export async function incrementCostPerUse(id: string): Promise<CostPerUseItem[]> {
  const items = await loadCostPerUseItems();
  const updated = items.map(i => i.id === id ? { ...i, uses: i.uses + 1 } : i);
  await saveCostPerUseItems(updated);
  return updated;
}

// ── Subscriptions ──────────────────────────────────────────
const SUBS_KEY = '@girlmath_subscriptions';

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    const raw = await AsyncStorage.getItem(SUBS_KEY);
    if (raw) return JSON.parse(raw) as Subscription[];
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
    if (raw) return JSON.parse(raw) as SavingsJarEntry[];
  } catch {}
  return [];
}

export async function addToSavingsJar(entry: SavingsJarEntry): Promise<void> {
  const existing = await loadSavingsJar();
  await AsyncStorage.setItem(JAR_KEY, JSON.stringify([entry, ...existing]));
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
    if (raw) return JSON.parse(raw) as TreatYourselfBudget;
  } catch {}
  return { monthlyLimit: 100, spent: 0, periodStart: new Date().toISOString() };
}

export async function saveTreatBudget(budget: TreatYourselfBudget): Promise<void> {
  try {
    await AsyncStorage.setItem(TREAT_KEY, JSON.stringify(budget));
  } catch {}
}

export async function addTreatSpend(amount: number): Promise<TreatYourselfBudget> {
  const current = await loadTreatBudget();
  const updated = { ...current, spent: current.spent + amount };
  await saveTreatBudget(updated);
  return updated;
}

// ── Aura score ─────────────────────────────────────────────
const AURA_SCORE_KEY = '@girlmath_aura_score';

export async function loadAuraScore(): Promise<AuraScore> {
  try {
    const raw = await AsyncStorage.getItem(AURA_SCORE_KEY);
    if (raw) return JSON.parse(raw) as AuraScore;
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
    if (raw) return JSON.parse(raw) as SavingsGoal[];
  } catch {}
  return [];
}

export async function saveSavingsGoals(goals: SavingsGoal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals));
  } catch {}
}

export async function contributeToGoal(goalId: string, amount: number): Promise<SavingsGoal[]> {
  const goals = await loadSavingsGoals();
  const updated = goals.map(g => {
    if (g.id !== goalId) return g;
    const newSaved = Math.min(g.savedAmount + amount, g.targetAmount);
    return { ...g, savedAmount: newSaved, isComplete: newSaved >= g.targetAmount };
  });
  await saveSavingsGoals(updated);
  return updated;
}
