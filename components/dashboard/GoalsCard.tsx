'use client';

import { formatCurrency } from '@/lib/currency';
import { Target, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

interface Goal {
  id: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  is_completed: boolean;
  progress: number;
  months_remaining: number;
  local_currency: string;
  exchange_rate_to_base: number;
}

interface Props {
  goals: Goal[];
  currency: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  emergency_fund: 'bg-blue-500',
  vacation: 'bg-purple-500',
  home: 'bg-amber-500',
  retirement: 'bg-indigo-500',
  education: 'bg-teal-500',
  vehicle: 'bg-orange-500',
  business: 'bg-brand-500',
  general: 'bg-slate-400',
};

export default function GoalsCard({ goals, currency }: Props) {
  const { convertAmount } = useCurrency();
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
          <Target className="w-4.5 h-4.5 text-violet-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Financial Goals</p>
          <p className="text-sm font-semibold text-slate-700">{goals.length} active goal{goals.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No goals set yet</p>
        ) : (
          goals.map(goal => {
            const barColor = CATEGORY_COLORS[goal.category] ?? 'bg-brand-500';
            const pct = Math.round(goal.progress * 100);

            return (
              <div key={goal.id}>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {goal.is_completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{goal.name}</p>
                      <p className="text-xs text-slate-400">
                        {goal.months_remaining > 0 ? `${goal.months_remaining} months left` : 'Target date passed'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      {formatCurrency(convertAmount(goal.current_amount, goal.local_currency), currency)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      / {formatCurrency(convertAmount(goal.target_amount, goal.local_currency), currency)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-right">{pct}% complete</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
