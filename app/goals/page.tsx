'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Target, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { GOAL_CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';
import Modal from '@/components/ui/Modal';
import { Field, Select, Toggle, FormActions } from '@/components/ui/FormField';
import { format } from 'date-fns';

interface Goal {
  id: string; name: string; category: string;
  target_amount: number; current_amount: number;
  local_currency: string; exchange_rate_to_base: number;
  target_date: string; is_completed: boolean; notes?: string;
  progress: number; months_remaining: number;
}

const COLORS: Record<string, string> = {
  emergency_fund: 'bg-blue-500', vacation: 'bg-purple-500', home: 'bg-amber-500',
  retirement: 'bg-indigo-500', education: 'bg-teal-500', vehicle: 'bg-orange-500',
  business: 'bg-brand-500', general: 'bg-slate-400',
};

const toDateInput = (d: string) => format(new Date(d), "yyyy-MM-dd'T'HH:mm");
const empty = (): Partial<Goal> => ({
  name: '', category: 'general', target_amount: 0, current_amount: 0,
  local_currency: 'USD', exchange_rate_to_base: 1,
  target_date: toDateInput(new Date(Date.now() + 365 * 86400000).toISOString()),
  is_completed: false, notes: '',
});

const CAT_OPT = GOAL_CATEGORIES.map(c => ({ value: c, label: c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }));

export default function GoalsPage() {
  const { userId } = useAuth();
  const { currency: DEMO_CURRENCY, convertAmount } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Goal>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/goals?userId=${userId}`);
    if (res.ok) setGoals(await res.json());
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty()); setEditing(null); setModal(true); }
  function openEdit(g: Goal) { setForm({ ...g, target_date: toDateInput(g.target_date) }); setEditing(g.id); setModal(true); }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = {
      ...form, userId: userId!,
      target_amount: Number(form.target_amount), current_amount: Number(form.current_amount),
      exchange_rate_to_base: Number(form.exchange_rate_to_base),
      target_date: new Date(form.target_date!).toISOString(),
    };
    if (editing) {
      await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) });
    } else {
      await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false); setModal(false); load();
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const active = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);
  const totalNeeded = active.reduce((s, g) => s + (g.target_amount - g.current_amount) * g.exchange_rate_to_base, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Financial Goals</h1>
            <p className="text-sm text-slate-400">{active.length} active · {completed.length} completed</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Still needed strip */}
      {active.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Still Needed Across Active Goals</p>
          <p className="text-2xl font-extrabold text-violet-600 font-mono mt-1">{formatCurrency(totalNeeded, DEMO_CURRENCY)}</p>
        </div>
      )}

      {/* Goal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map(g => {
          const pct = Math.round(g.progress * 100);
          const bar = COLORS[g.category] ?? 'bg-brand-500';
          const baseTarget = convertAmount(g.target_amount, g.local_currency);
          const baseCurrent = convertAmount(g.current_amount, g.local_currency);
          return (
            <div key={g.id} className={`bg-white rounded-2xl shadow-card border border-slate-100 p-5 flex flex-col gap-3 ${g.is_completed ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {g.is_completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <p className="font-bold text-slate-900">{g.name}</p>
                  </div>
                  <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full capitalize">{g.category.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">{formatCurrency(baseCurrent, DEMO_CURRENCY)} saved</span>
                  <span className="font-semibold text-slate-700">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5 text-slate-400">
                  <span>Target: {formatCurrency(baseTarget, DEMO_CURRENCY)}</span>
                  <span>{g.months_remaining > 0 ? `${g.months_remaining}mo left` : 'Overdue'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400">Due {format(new Date(g.target_date), 'MMM d, yyyy')}</p>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-card border border-slate-100 p-8 text-center">
            <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400">No goals yet. Add your first financial goal above.</p>
          </div>
        )}
      </div>

      <Modal open={modal} title={editing ? 'Edit Goal' : 'Add Goal'} onClose={() => setModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Goal Name (e.g. Japan Vacation)" value={form.name ?? ''} onChange={e => set('name', e.target.value)} required /></div>
            <Select label="Category" value={form.category ?? 'general'} onChange={e => set('category', e.target.value)} options={CAT_OPT} />
            <Field label="Currency" value={form.local_currency ?? DEMO_CURRENCY} onChange={e => set('local_currency', e.target.value)} maxLength={3} />
            <Field label="Target Amount" type="number" step="0.01" min="0" value={form.target_amount ?? ''} onChange={e => set('target_amount', e.target.value)} required />
            <Field label="Current Amount" type="number" step="0.01" min="0" value={form.current_amount ?? ''} onChange={e => set('current_amount', e.target.value)} />
            <div className="col-span-2"><Field label="Target Date" type="datetime-local" value={form.target_date ?? ''} onChange={e => set('target_date', e.target.value)} required /></div>
            <div className="col-span-2"><Field label="Notes (optional)" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
            <div className="col-span-2"><Toggle label="Mark as Completed" checked={!!form.is_completed} onChange={v => set('is_completed', v)} /></div>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
