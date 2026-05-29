'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { SAVINGS_TYPES } from '@/lib/constants';
import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';
import Modal from '@/components/ui/Modal';
import { Field, Select, FormActions } from '@/components/ui/FormField';
import { format } from 'date-fns';

interface SavingsAccount {
  id: string; name: string; institution: string; account_type: string;
  balance: number; local_currency: string; exchange_rate_to_base: number;
  last_updated: string; notes?: string;
}

const TYPE_COLORS: Record<string, string> = {
  savings: 'bg-sky-50 text-sky-600', checking: 'bg-blue-50 text-blue-600',
  investment: 'bg-violet-50 text-violet-600', retirement: 'bg-indigo-50 text-indigo-600',
  crypto: 'bg-orange-50 text-orange-600', real_estate: 'bg-amber-50 text-amber-600',
  emergency: 'bg-emerald-50 text-emerald-600',
};

const empty = (): Partial<SavingsAccount> => ({
  name: '', institution: '', account_type: 'savings',
  balance: 0, local_currency: 'USD', exchange_rate_to_base: 1, notes: '',
});

const TYPE_OPT = SAVINGS_TYPES.map(t => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }));

export default function SavingsPage() {
  const { userId } = useAuth();
  const { currency: DEMO_CURRENCY, convertAmount } = useCurrency();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<SavingsAccount>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/savings?userId=${userId}`);
    if (res.ok) setAccounts(await res.json());
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty()); setEditing(null); setModal(true); }
  function openEdit(a: SavingsAccount) { setForm({ ...a }); setEditing(a.id); setModal(true); }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return;
    await fetch(`/api/savings?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, userId: userId!, balance: Number(form.balance), exchange_rate_to_base: Number(form.exchange_rate_to_base) };
    if (editing) {
      await fetch('/api/savings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) });
    } else {
      await fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false); setModal(false); load();
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const totalBase = accounts.reduce((s, a) => s + convertAmount(a.balance, a.local_currency), 0);

  // Group by type for summary
  const byType = SAVINGS_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = accounts.filter(a => a.account_type === t).reduce((s, a) => s + convertAmount(a.balance, a.local_currency), 0);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Savings & Investments</h1>
            <p className="text-sm text-slate-400">{accounts.length} accounts · {formatCurrency(totalBase, DEMO_CURRENCY)} total</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Total + type breakdown */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Total Net Worth</p>
        <p className="text-3xl font-extrabold text-slate-900 font-mono mb-4">{formatCurrency(totalBase, DEMO_CURRENCY)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SAVINGS_TYPES.filter(t => byType[t] > 0).map(t => (
            <div key={t} className="text-center">
              <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-1 ${TYPE_COLORS[t] ?? 'bg-slate-100 text-slate-500'}`}>{t.replace('_', ' ')}</span>
              <p className="text-sm font-bold text-slate-800 font-mono">{formatCurrency(byType[t], DEMO_CURRENCY)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Account', 'Institution', 'Type', 'Balance', 'Last Updated', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accounts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No accounts yet.</td></tr>}
              {accounts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-500">{a.institution}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${TYPE_COLORS[a.account_type] ?? 'bg-slate-100 text-slate-500'}`}>{a.account_type.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 font-mono font-bold text-sky-600">{formatCurrency(convertAmount(a.balance, a.local_currency), DEMO_CURRENCY)}</td>
                  <td className="px-4 py-3 text-slate-400">{format(new Date(a.last_updated), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} title={editing ? 'Edit Account' : 'Add Account'} onClose={() => setModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Account Name (e.g. Emergency Fund)" value={form.name ?? ''} onChange={e => set('name', e.target.value)} required /></div>
            <div className="col-span-2"><Field label="Institution (e.g. Chase Bank)" value={form.institution ?? ''} onChange={e => set('institution', e.target.value)} required /></div>
            <Select label="Account Type" value={form.account_type ?? 'savings'} onChange={e => set('account_type', e.target.value)} options={TYPE_OPT} />
            <Field label="Current Balance" type="number" step="0.01" min="0" value={form.balance ?? ''} onChange={e => set('balance', e.target.value)} required />
            <Field label="Currency" value={form.local_currency ?? DEMO_CURRENCY} onChange={e => set('local_currency', e.target.value)} maxLength={3} />
            <Field label="Exchange Rate to Base" type="number" step="0.0001" min="0" value={form.exchange_rate_to_base ?? 1} onChange={e => set('exchange_rate_to_base', e.target.value)} />
            <div className="col-span-2"><Field label="Notes (optional)" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
