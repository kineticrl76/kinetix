'use client';

interface Props {
  value: number;
  onChange: (months: number) => void;
}

const OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
];

export default function TimeRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.months}
          onClick={() => onChange(opt.months)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            value === opt.months
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
