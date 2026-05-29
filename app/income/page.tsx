'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { INCOME_CATEGORIES, INCOME_FREQUENCIES } from '@/lib/constants';
import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';
import Modal from '@/components/ui/Modal';
import { Field, Select, FormActions } from '@/components/ui/FormField';
import { format } from 'date-fns';

interface Income {
  id: string; source: string; category: string; amount: number;
  local_currency: string; exchange_rate_to_base: number;
  frequency: string; received_at: string; notes?: string;
}

const empty = (): Partial<Income> => ({
  source: '', category: 'salary', amount: 0,
  local_currency: 'USD', exchange_rate_to_base: 1,
  frequency: 'monthly', received_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '',
});

const CAT_OPT = INCOME_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
const FREQ_OPT = INCOME_FREQUENCIES.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }));

export default function IncomePage() {
  const { userId } = useAuth();
  const { currency: DEMO_CURRENCY, convertAmount } = useCurrency();
  const [records, setRecords] = useState<Income[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Income>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/income?userId=${userId}`);
    if (res.ok) setRecords(await res.json());
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty()); setEditing(null); setModal(true); }
  function openEdit(r: Income) { setForm({ ...r, received_at: format(new Date(r.received_at), "yyyy-MM-dd'T'HH:mm") }); setEditing(r.id); setModal(true); }

  async function handleDelete(id: string) {
    if (!confirm('Delete this income record?')) return;
    await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, userId: userId!, amount: Number(form.amount), exchange_rate_to_base: Number(form.exchange_rate_to_base), received_at: new Date(form.received_at!).toISOString() };
    if (editing) {
      await fetch('/api/income', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) });
    } else {
      await fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false); setModal(false); load();
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // All recorded income regardless of frequency
  const totalReceived = records.reduce((s, r) => s + convertAmount(r.amount, r.local_currency), 0);
  // Monthly recurring only (for budgeting)
  const monthlyRecurring = records.filter(r => r.frequency === 'monthly').reduce((s, r) => s + convertAmount(r.amount, r.local_currency), 0);

  // Annual estimate: annualize each record by its frequency
  function annualizedAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'monthly':    return amount * 12;
      case 'weekly':     return amount * 52;
      case 'bi-weekly':  return amount * 26;
      case 'one-time':   return amount; // count once as-is
      default:           return amount;
    }
  }
  const annualEstimate = records.reduce((s, r) => s + annualizedAmount(convertAmount(r.amount, r.local_currency), r.frequency), 0);
  const hasOneTimeSalaries = records.some(r => r.frequency === 'one-time' && r.source.toLowerCase().includes('salary'));

  const [sortKey, setSortKey] = useState<'received_at' | 'source' | 'category' | 'amount' | 'frequency'>('received_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = [...records].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortKey === 'received_at') { av = a.received_at; bv = b.received_at; }
    else if (sortKey === 'amount') { av = a.amount * a.exchange_rate_to_base; bv = b.amount * b.exchange_rate_to_base; }
    else { av = (a[sortKey] ?? '').toString().toLowerCase(); bv = (b[sortKey] ?? '').toString().toLowerCase(); }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Income</h1>
            <p className="text-sm text-slate-400">{records.length} sources · {formatCurrency(monthlyRecurring, DEMO_CURRENCY)}/mo recurring</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {/* Warning if salaries are tagged one-time */}
      {hasOneTimeSalaries && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 animate-fade-in">
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <p className="font-semibold">Some salary entries are tagged as "One-Time"</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Change their <strong>Frequency</strong> to <strong>Monthly</strong> so the Monthly Recurring and Annual Estimate calculate correctly.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Received', value: totalReceived, sub: 'All records combined' },
          { label: 'Monthly Recurring', value: monthlyRecurring, sub: 'Frequency = Monthly only' },
          { label: 'Annual Estimate', value: annualEstimate, sub: 'Monthly ×12 + one-time as-is' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">{formatCurrency(s.value, DEMO_CURRENCY)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {([
                  { label: 'Date', key: 'received_at' },
                  { label: 'Source', key: 'source' },
                  { label: 'Category', key: 'category' },
                  { label: 'Amount', key: 'amount' },
                  { label: 'Frequency', key: 'frequency' },
                  { label: '', key: null },
                ] as const).map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => key && handleSort(key as typeof sortKey)}
                    className={`px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide ${key ? 'cursor-pointer hover:text-slate-600 select-none' : ''}`}
                  >
                    {label}{key && sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No income records yet.</td></tr>}
              {sorted.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{format(new Date(r.received_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.source}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full capitalize">{r.category}</span></td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatCurrency(convertAmount(r.amount, r.local_currency), DEMO_CURRENCY)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full capitalize">{r.frequency}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} title={editing ? 'Edit Income' : 'Add Income'} onClose={() => setModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Source (e.g. Primary Salary)" value={form.source ?? ''} onChange={e => set('source', e.target.value)} required /></div>
            <Select label="Category" value={form.category ?? 'salary'} onChange={e => set('category', e.target.value)} options={CAT_OPT} />
            <Select label="Frequency" value={form.frequency ?? 'monthly'} onChange={e => set('frequency', e.target.value)} options={FREQ_OPT} />
            <Field label="Amount" type="number" step="0.01" min="0" value={form.amount ?? ''} onChange={e => set('amount', e.target.value)} required />
            <Field label="Currency" value={form.local_currency ?? DEMO_CURRENCY} onChange={e => set('local_currency', e.target.value)} maxLength={3} />
            <div className="col-span-2"><Field label="Date Received" type="datetime-local" value={form.received_at ?? ''} onChange={e => set('received_at', e.target.value)} required /></div>
            <div className="col-span-2"><Field label="Notes (optional)" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
