interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

const base = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white';

export function Field({ label, ...props }: InputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input className={base} {...props} />
    </div>
  );
}

export function Select({ label, options, ...props }: SelectProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select className={base} {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export function FormActions({ onCancel, loading, label = 'Save' }: { onCancel: () => void; loading?: boolean; label?: string }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
        {loading ? 'Saving…' : label}
      </button>
    </div>
  );
}
