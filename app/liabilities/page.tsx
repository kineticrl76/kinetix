'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { LIABILITY_CATEGORIES, BILLING_CYCLES } from '@/lib/constants';
import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';
import Modal from '@/components/ui/Modal';
import { Field, Select, Toggle, FormActions } from '@/components/ui/FormField';
import { format, differenceInDays } from 'date-fns';

interface Liability {
  id: string; name: string; category: string; amount: number;
  local_currency: string; exchange_rate_to_base: number;
  billing_cycle: string; next_payment_date: string;
  renewal_date?: string; is_active: boolean; notes?: string;
}

const toDateInput = (d: string) => format(new Date(d), "yyyy-MM-dd'T'HH:mm");
const empty = (): Partial<Liability> => ({
  name: '', category: 'subscription', amount: 0,
  local_currency: 'USD', exchange_rate_to_base: 1,
  billing_cycle: 'monthly', next_payment_date: toDateInput(new Date().toISOString()),
  is_active: true, notes: '',
});

const CAT_OPT = LIABILITY_CATEGORIES.map(c => ({ value: c, label: c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
const CYCLE_OPT = BILLING_CYCLES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

export default function LiabilitiesPage() {
  const { userId } = useAuth();
  const { currency: DEMO_CURRENCY, convertAmount } = useCurrency();
  const [records, setRecords] = useState<Liability[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Liability>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/liabilities?userId=${userId}`);
    if (res.ok) setRecords(await res.json());
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty()); setEditing(null); setModal(true); }
  function openEdit(r: Liability) { setForm({ ...r, next_payment_date: toDateInput(r.next_payment_date), renewal_date: r.renewal_date ? toDateInput(r.renewal_date) : '' }); setEditing(r.id); setModal(true); }

  async function handleDelete(id: string) {
    if (!confirm('Delete this liability?')) return;
    await fetch(`/api/liabilities?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = {
      ...form, userId: userId!,
      amount: Number(form.amount), exchange_rate_to_base: Number(form.exchange_rate_to_base),
      next_payment_date: new Date(form.next_payment_date!).toISOString(),
      ...(form.renewal_date ? { renewal_date: new Date(form.renewal_date).toISOString() } : {}),
    };
    if (editing) {
      await fetch('/api/liabilities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) });
    } else {
      await fetch('/api/liabilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false); setModal(false); load();
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const monthlyTotal = records.filter(r => r.is_active && r.billing_cycle === 'monthly').reduce((s, r) => s + convertAmount(r.amount, r.local_currency), 0);
  const upcoming = records.filter(r => r.is_active && differenceInDays(new Date(r.next_payment_date), new Date()) <= 7).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Fixed Liabilities</h1>
            <p className="text-sm text-slate-400">{records.length} items · {upcoming} due within 7 days</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Liability
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Outflow', value: monthlyTotal, color: 'text-red-500' },
          { label: 'Annual Outflow', value: monthlyTotal * 12, color: 'text-red-500' },
          { label: 'Active Subscriptions', value: records.filter(r => r.is_active).length, color: 'text-slate-900', isCt: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-extrabold font-mono mt-1 ${s.color}`}>{s.isCt ? s.value : formatCurrency(s.value as number, DEMO_CURRENCY)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Name', 'Category', 'Amount', 'Cycle', 'Next Due', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No liabilities yet.</td></tr>}
              {records.map(r => {
                const daysUntil = differenceInDays(new Date(r.next_payment_date), new Date());
                const urgent = daysUntil <= 7 && r.is_active;
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${!r.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full capitalize">{r.category.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 font-mono font-bold text-red-500">{formatCurrency(convertAmount(r.amount, r.local_currency), DEMO_CURRENCY)}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{r.billing_cycle}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`flex items-center gap-1 ${urgent ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                        {urgent && <AlertTriangle className="w-3.5 h-3.5" />}
                        {format(new Date(r.next_payment_date), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${r.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} title={editing ? 'Edit Liability' : 'Add Liability'} onClose={() => setModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Name (e.g. Netflix, Health Insurance)" value={form.name ?? ''} onChange={e => set('name', e.target.value)} required /></div>
            <Select label="Category" value={form.category ?? 'subscription'} onChange={e => set('category', e.target.value)} options={CAT_OPT} />
            <Select label="Billing Cycle" value={form.billing_cycle ?? 'monthly'} onChange={e => set('billing_cycle', e.target.value)} options={CYCLE_OPT} />
            <Field label="Amount" type="number" step="0.01" min="0" value={form.amount ?? ''} onChange={e => set('amount', e.target.value)} required />
            <Field label="Currency" value={form.local_currency ?? DEMO_CURRENCY} onChange={e => set('local_currency', e.target.value)} maxLength={3} />
            <div className="col-span-2"><Field label="Next Payment Date" type="datetime-local" value={form.next_payment_date ?? ''} onChange={e => set('next_payment_date', e.target.value)} required /></div>
            <div className="col-span-2"><Field label="Renewal Date (optional)" type="datetime-local" value={form.renewal_date ?? ''} onChange={e => set('renewal_date', e.target.value)} /></div>
            <div className="col-span-2"><Field label="Notes (optional)" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
            <div className="col-span-2"><Toggle label="Active" checked={!!form.is_active} onChange={v => set('is_active', v)} /></div>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
