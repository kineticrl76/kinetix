'use client';

import { formatCurrency } from '@/lib/currency';
import { LucideIcon } from 'lucide-react';

interface Item {
  label: string;
  value: number;
  sub?: string;
  badge?: string;
  badgeColor?: string;
}

interface Props {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  total: number;
  currency: string;
  items: Item[];
  emptyText?: string;
  footer?: React.ReactNode;
}

export default function PillarCard({ title, icon: Icon, iconColor, iconBg, total, currency, items, emptyText, footer }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono leading-tight">
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 px-5 pb-2 space-y-2 overflow-y-auto max-h-44">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">{emptyText ?? 'No items yet'}</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                {item.sub && <p className="text-xs text-slate-400">{item.sub}</p>}
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.badgeColor ?? 'bg-slate-100 text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formatCurrency(item.value, currency)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {footer && <div className="px-5 py-3 border-t border-slate-50">{footer}</div>}
    </div>
  );
}
