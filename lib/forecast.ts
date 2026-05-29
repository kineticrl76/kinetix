import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface MonthlySnapshot {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2025"
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // 0–1
}

export interface ForecastResult {
  avgMonthlySavings: number;
  avgSavingsRate: number;
  projection12m: number;
  projection24m: number;
  projection36m: number;
}

export function buildMonthlySnapshots(
  incomeRecords: { amount: number; exchange_rate_to_base: number; received_at: Date }[],
  expenseRecords: { amount: number; exchange_rate_to_base: number; transaction_date: Date }[],
  monthsBack: number
): MonthlySnapshot[] {
  const snapshots: MonthlySnapshot[] = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = subMonths(now, i);
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    const key = format(ref, 'yyyy-MM');
    const label = format(ref, 'MMM yyyy');

    const income = incomeRecords
      .filter(r => r.received_at >= start && r.received_at <= end)
      .reduce((s, r) => s + r.amount * r.exchange_rate_to_base, 0);

    const expenses = expenseRecords
      .filter(r => r.transaction_date >= start && r.transaction_date <= end)
      .reduce((s, r) => s + r.amount * r.exchange_rate_to_base, 0);

    const net = income - expenses;
    const savingsRate = income > 0 ? net / income : 0;

    snapshots.push({ month: key, label, income, expenses, net, savingsRate });
  }

  return snapshots;
}

export function calculateForecast(
  snapshots: MonthlySnapshot[],
  currentTotalSavings: number
): ForecastResult {
  if (snapshots.length === 0) {
    return { avgMonthlySavings: 0, avgSavingsRate: 0, projection12m: currentTotalSavings, projection24m: currentTotalSavings, projection36m: currentTotalSavings };
  }

  const avgMonthlySavings = snapshots.reduce((s, m) => s + m.net, 0) / snapshots.length;
  const avgSavingsRate = snapshots.reduce((s, m) => s + m.savingsRate, 0) / snapshots.length;

  return {
    avgMonthlySavings,
    avgSavingsRate,
    projection12m: currentTotalSavings + avgMonthlySavings * 12,
    projection24m: currentTotalSavings + avgMonthlySavings * 24,
    projection36m: currentTotalSavings + avgMonthlySavings * 36,
  };
}
