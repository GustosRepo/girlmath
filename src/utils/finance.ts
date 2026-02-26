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
 */
export function computeSpendable(
  ctx: MoneyContext,
  purchasePrice: number,
): SpendableResult {
  const periodsPerMonth = PERIODS_PER_MONTH[ctx.payFrequency];

  // Allocate monthly bills across each pay period
  const monthlyBills = ctx.rent + ctx.carNote + ctx.billsTotal;
  const billsPerPeriod = monthlyBills / periodsPerMonth;

  // Savings deduction per period
  const savingsPerPeriod = ctx.payAmount * (ctx.savingsGoalPct / 100);

  const perPeriod = ctx.payAmount - billsPerPeriod - savingsPerPeriod;

  const monthly = perPeriod * periodsPerMonth;

  const purchasePct =
    perPeriod > 0 ? (purchasePrice / perPeriod) * 100 : 999;

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
  if (n < 0) return '-$' + Math.abs(n).toFixed(2);
  return '$' + n.toFixed(2);
}
