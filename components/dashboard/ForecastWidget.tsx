'use client';

import { ForecastResult } from '@/lib/forecast';
import { formatCurrency, formatCompact } from '@/lib/currency';
import { TrendingUp } from 'lucide-react';

interface Props {
  forecast: ForecastResult;
  currency: string;
}

export default function ForecastWidget({ forecast, currency }: Props) {
  const savingsRatePct = (forecast.avgSavingsRate * 100).toFixed(1);

  const projections = [
    { label: '12 months', value: forecast.projection12m },
    { label: '24 months', value: forecast.projection24m },
    { label: '36 months', value: forecast.projection36m },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-4.5 h-4.5 text-sky-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Savings Forecast</p>
          <p className="text-sm font-semibold text-slate-700">
            Avg savings rate:{' '}
            <span className="text-emerald-600 font-extrabold">{savingsRatePct}%</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Avg monthly savings: <span className="font-semibold text-slate-600 font-mono">{formatCurrency(forecast.avgMonthlySavings, currency)}</span>
      </p>

      <div className="space-y-3">
        {projections.map(({ label, value }, i) => {
          const widths = ['w-1/3', 'w-2/3', 'w-full'];
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">{label}</span>
                <span className="font-extrabold text-slate-900 font-mono">{formatCompact(value, currency)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${widths[i]} bg-gradient-to-r from-sky-400 to-brand-500 rounded-full`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
