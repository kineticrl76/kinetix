'use client';

import { MonthlySnapshot } from '@/lib/forecast';
import { formatCurrency } from '@/lib/currency';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface Props {
  snapshots: MonthlySnapshot[];
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-mono font-bold">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendsChart({ snapshots, currency }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No trend data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={snapshots} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          width={38}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="plainline"
        />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#10b981' }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#ef4444"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#ef4444' }}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net Savings"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 5, fill: '#6366f1' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
