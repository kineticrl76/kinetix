import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildMonthlySnapshots, calculateForecast } from '@/lib/forecast';
import { sumInBaseCurrency, type CurrencyRecord } from '@/lib/currency';
import { calculateTaxSummary, type TaxConfig } from '@/lib/taxCalculator';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().min(1),
  months: z.coerce.number().min(1).max(36).default(6),
});

function toRecord(amount: number, exchange_rate_to_base: number): CurrencyRecord {
  return { amount, exchange_rate_to_base };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

  const { userId, months } = query.data;

  const [user, incomes, expenses, savings, goals, liabilities] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.income.findMany({ where: { userId }, orderBy: { received_at: 'asc' } }),
    prisma.variableExpense.findMany({ where: { userId }, orderBy: { transaction_date: 'asc' } }),
    prisma.savingsAccount.findMany({ where: { userId } }),
    prisma.financialGoal.findMany({ where: { userId } }),
    prisma.fixedLiability.findMany({ where: { userId, is_active: true } }),
  ]);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Net position
  const totalSavings = sumInBaseCurrency(
    savings.map(s => toRecord(s.balance, s.exchange_rate_to_base))
  );
  const monthlyIncome = sumInBaseCurrency(
    incomes
      .filter(i => i.frequency === 'monthly')
      .map(i => toRecord(i.amount, i.exchange_rate_to_base))
  );
  const monthlyFixed = sumInBaseCurrency(
    liabilities
      .filter(l => l.billing_cycle === 'monthly')
      .map(l => toRecord(l.amount, l.exchange_rate_to_base))
  );

  // Trend snapshots
  const snapshots = buildMonthlySnapshots(
    incomes.map(i => ({
      amount: i.amount,
      exchange_rate_to_base: i.exchange_rate_to_base,
      received_at: i.received_at,
    })),
    expenses.map(e => ({
      amount: e.amount,
      exchange_rate_to_base: e.exchange_rate_to_base,
      transaction_date: e.transaction_date,
    })),
    months
  );

  const forecast = calculateForecast(snapshots, totalSavings);

  // Tax summary
  const deductibleTotal = sumInBaseCurrency(
    expenses
      .filter(e => e.is_tax_deductible)
      .map(e => toRecord(e.amount, e.exchange_rate_to_base))
  );
  let taxConfigs: TaxConfig[] = [];
  try { taxConfigs = JSON.parse(user.tax_config) as TaxConfig[]; } catch { /* use empty */ }
  const tax = calculateTaxSummary(monthlyIncome * 12, deductibleTotal, taxConfigs);

  return NextResponse.json({
    user: { base_currency: user.base_currency, tax_config: user.tax_config },
    netPosition: { totalSavings, monthlyIncome, monthlyFixed, monthlyNet: monthlyIncome - monthlyFixed },
    snapshots,
    forecast,
    tax,
    goals: goals.map(g => ({
      ...g,
      progress: g.target_amount > 0 ? Math.min(1, g.current_amount / g.target_amount) : 0,
      months_remaining: Math.max(0, Math.ceil((g.target_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))),
    })),
    upcomingPayments: liabilities
      .filter(l => l.is_active)
      .sort((a, b) => a.next_payment_date.getTime() - b.next_payment_date.getTime())
      .slice(0, 5),
  });
}
