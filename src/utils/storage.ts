import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState, MoneyContext, PersonalityMode, BillReminder, HistoryEntry } from '../types';

const KEY = '@girlmath_state';
const BILLS_KEY = '@girlmath_bills';
const HISTORY_KEY = '@girlmath_history';

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
