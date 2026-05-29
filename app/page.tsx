'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DollarSign, ArrowDownCircle, ShoppingCart, PiggyBank, AlertCircle, RefreshCw } from 'lucide-react';

import NetPositionCard from '@/components/dashboard/NetPositionCard';
import PillarCard from '@/components/dashboard/PillarCard';
import TaxWidget from '@/components/dashboard/TaxWidget';
import GoalsCard from '@/components/dashboard/GoalsCard';
import TimeRangeFilter from '@/components/dashboard/TimeRangeFilter';
import ForecastWidget from '@/components/dashboard/ForecastWidget';
import QuickLogBar from '@/components/dashboard/QuickLogBar';
import ReceiptUpload from '@/components/ReceiptUpload';
import StatementImport from '@/components/StatementImport';

// Recharts requires client-only rendering
const TrendsChart = dynamic(() => import('@/components/dashboard/TrendsChart'), { ssr: false });

import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';

interface DashboardData {
  user: { base_currency: string; tax_config: any[] };
  netPosition: { totalSavings: number; monthlyIncome: number; monthlyFixed: number; monthlyNet: number };
  snapshots: any[];
  forecast: any;
  tax: any;
  goals: any[];
  upcomingPayments: any[];
}

export default function DashboardPage() {
  const { userId } = useAuth();
  const { currency, convertAmount } = useCurrency();

  // Dashboard amounts come from the API in the user's stored base currency (e.g. AED)
  // This converts them to the current display currency using live rates
  const fromBase = (amount: number) =>
    data ? convertAmount(amount, data.user.base_currency) : amount;
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/forecast?userId=${userId}&months=${months}`);
      if (!res.ok) throw new Error('Failed to load dashboard data');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [months, userId]); // userId in deps so callback updates when session loads

  useEffect(() => { if (userId) fetchDashboard(); }, [fetchDashboard, userId]);


  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Quick Log Bar ──────────────────────────────────────────── */}
      <QuickLogBar userId={userId!} baseCurrency={currency} onLogged={fetchDashboard} />

      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Financial Overview</h1>
          <p className="text-sm text-slate-400">Your personal command center</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeFilter value={months} onChange={setMonths} />
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Error state ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load data</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* ── Skeleton loader ───────────────────────────────────────── */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-slate-100" />
          ))}
        </div>
      )}

      {/* ── Main dashboard ────────────────────────────────────────── */}
      {data && (
        <>
          {/* Row 1: Net Position + Tax + Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <NetPositionCard
                totalSavings={fromBase(data.netPosition.totalSavings)}
                monthlyIncome={fromBase(data.netPosition.monthlyIncome)}
                monthlyFixed={fromBase(data.netPosition.monthlyFixed)}
                monthlyNet={fromBase(data.netPosition.monthlyNet)}
                currency={currency}
              />
            </div>
            <TaxWidget
              tax={{
                ...data.tax,
                grossIncome: fromBase(data.tax.grossIncome),
                totalDeductible: fromBase(data.tax.totalDeductible),
                taxableIncome: fromBase(data.tax.taxableIncome),
                estimatedTaxOwed: fromBase(data.tax.estimatedTaxOwed),
                breakdown: data.tax.breakdown.map((b: { tax_name: string; amount: number }) => ({
                  ...b, amount: fromBase(b.amount),
                })),
              }}
              currency={currency}
              userId={userId!}
            />
            <ForecastWidget
              forecast={{
                ...data.forecast,
                avgMonthlySavings: fromBase(data.forecast.avgMonthlySavings),
                projection12m: fromBase(data.forecast.projection12m),
                projection24m: fromBase(data.forecast.projection24m),
                projection36m: fromBase(data.forecast.projection36m),
              }}
              currency={currency}
            />
          </div>

          {/* Row 2: Trends Chart */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Income vs Expenses — Last {months} Month{months !== 1 ? 's' : ''}
              </p>
            </div>
            <TrendsChart
              snapshots={data.snapshots.map((s: any) => ({
                ...s,
                income: fromBase(s.income),
                expenses: fromBase(s.expenses),
                net: fromBase(s.net),
              }))}
              currency={currency}
            />
          </div>

          {/* Row 3: The 5 Financial Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Pillar 1: Income */}
            <PillarCard
              title="Income"
              icon={DollarSign}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              total={fromBase(data.netPosition.monthlyIncome)}
              currency={currency}
              items={[]}
              emptyText="No income records"
              footer={
                <a href="/income" className="text-xs text-brand-500 font-semibold hover:underline">
                  Manage income →
                </a>
              }
            />

            {/* Pillar 2: Fixed Liabilities */}
            <PillarCard
              title="Fixed Costs"
              icon={ArrowDownCircle}
              iconColor="text-red-500"
              iconBg="bg-red-50"
              total={fromBase(data.netPosition.monthlyFixed)}
              currency={currency}
              items={data.upcomingPayments.map(p => ({
                label: p.name,
                value: convertAmount(p.amount, p.local_currency),
                sub: `Due ${new Date(p.next_payment_date).toLocaleDateString()}`,
                badge: p.billing_cycle,
                badgeColor: 'bg-red-50 text-red-500',
              }))}
              emptyText="No liabilities"
              footer={
                <a href="/liabilities" className="text-xs text-brand-500 font-semibold hover:underline">
                  Manage liabilities →
                </a>
              }
            />

            {/* Pillar 3: Variable Expenses */}
            <PillarCard
              title="Variable Expenses"
              icon={ShoppingCart}
              iconColor="text-amber-500"
              iconBg="bg-amber-50"
              total={0}
              currency={currency}
              items={[]}
              emptyText="Log expenses above"
              footer={
                <a href="/expenses" className="text-xs text-brand-500 font-semibold hover:underline">
                  View all expenses →
                </a>
              }
            />

            {/* Pillar 4: Savings */}
            <PillarCard
              title="Savings"
              icon={PiggyBank}
              iconColor="text-sky-500"
              iconBg="bg-sky-50"
              total={fromBase(data.netPosition.totalSavings)}
              currency={currency}
              items={[]}
              emptyText="No accounts yet"
              footer={
                <a href="/savings" className="text-xs text-brand-500 font-semibold hover:underline">
                  Manage accounts →
                </a>
              }
            />
          </div>

          {/* Row 4: Goals + Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GoalsCard goals={data.goals} currency={currency} />
            </div>
            <div className="space-y-4">
              <ReceiptUpload userId={userId!} onSuccess={fetchDashboard} />
              <StatementImport userId={userId!} baseCurrency={currency} onImported={fetchDashboard} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
