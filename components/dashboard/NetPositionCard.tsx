'use client';

import { formatCurrency, formatCompact } from '@/lib/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  totalSavings: number;
  monthlyIncome: number;
  monthlyFixed: number;
  monthlyNet: number;
  currency: string;
}

export default function NetPositionCard({ totalSavings, monthlyIncome, monthlyFixed, monthlyNet, currency }: Props) {
  const isPositive = monthlyNet > 0;
  const isNeutral = monthlyNet === 0;

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-red-500';

  const stats = [
    { label: 'Monthly Income', value: monthlyIncome, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Fixed Costs', value: monthlyFixed, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Monthly Net', value: monthlyNet, color: isPositive ? 'text-emerald-600' : 'text-red-500', bg: isPositive ? 'bg-emerald-50' : 'bg-red-50' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 border border-slate-100">
      {/* Total Savings headline */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Total Net Worth</p>
        <div className="flex items-end gap-3">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
            {formatCompact(totalSavings, currency)}
          </span>
          <span className={`flex items-center gap-1 text-sm font-semibold mb-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {formatCurrency(Math.abs(monthlyNet), currency)}/mo
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{formatCurrency(totalSavings, currency)} across all accounts</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm font-extrabold ${color} font-mono`}>{formatCompact(Math.abs(value), currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
