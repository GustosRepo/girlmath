import { MoneyContext, SpendableResult, PayFrequency } from '../types';

/**
 * How many of this pay-frequency fit in one month.
 */
const PERIODS_PER_MONTH: Record<PayFrequency, number> = {
  weekly: 4.33,
  biweekly: 2,
  monthly: 1,
};

/**
 * Compute spendable cash per period and per month.
 * periodExpenses = total already logged this pay period.
 */
export function computeSpendable(
  ctx: MoneyContext,
  purchasePrice: number,
  periodExpenses: number = 0,
): SpendableResult {
  const periodsPerMonth = PERIODS_PER_MONTH[ctx.payFrequency] ?? PERIODS_PER_MONTH['biweekly'];

  // Guard against undefined/NaN from old schema versions in AsyncStorage
  const pay = ctx.payAmount ?? 0;
  const rent = ctx.rent ?? 0;
  const car = ctx.carNote ?? 0;
  const bills = ctx.billsTotal ?? 0;
  const savingsPct = ctx.savingsGoalPct ?? 0;
  const spent = periodExpenses ?? 0;

  const monthlyBills = rent + car + bills;
  const billsPerPeriod = monthlyBills / periodsPerMonth;
  const savingsPerPeriod = pay * (savingsPct / 100);
  const perPeriod = pay - billsPerPeriod - savingsPerPeriod - spent;
  const monthly = perPeriod * periodsPerMonth;
  const purchasePct = perPeriod > 0 ? (purchasePrice / perPeriod) * 100 : 999;

  return {
    perPeriod: Math.round(perPeriod * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    purchasePct: Math.round(purchasePct * 10) / 10,
  };
}

/**
 * Format a dollar amount nicely.
 */
export function fmt$(n: number): string {
  const safe = typeof n === 'number' && isFinite(n) ? n : 0;
  if (safe < 0) return '-$' + Math.abs(safe).toFixed(2);
  return '$' + safe.toFixed(2);
}
