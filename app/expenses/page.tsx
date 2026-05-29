'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Pencil, ShoppingCart, CheckCircle2, Circle, Filter, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/useAuth';
import { useCurrency } from '@/context/CurrencyContext';
import Modal from '@/components/ui/Modal';
import { Field, Select, Toggle, FormActions } from '@/components/ui/FormField';
import { format } from 'date-fns';

interface Expense {
  id: string; merchant: string; category: string; amount: number;
  local_currency: string; exchange_rate_to_base: number;
  is_tax_deductible: boolean; transaction_date: string;
  source: string; notes?: string; card_id?: string;
}

const empty = (): Partial<Expense> => ({
  merchant: '', category: 'general', amount: 0,
  local_currency: 'USD', exchange_rate_to_base: 1,
  is_tax_deductible: false,
  transaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  notes: '',
});

const CAT_OPTIONS = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

type SortKey = 'transaction_date' | 'merchant' | 'category' | 'amount' | 'source';

export default function ExpensesPage() {
  const { userId } = useAuth();
  const { currency: DEMO_CURRENCY, convertAmount } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Expense>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [taxOnly, setTaxOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/expenses?userId=${userId}${taxOnly ? '&taxOnly=true' : ''}`);
    if (res.ok) { setExpenses(await res.json()); setSelected(new Set()); }
  }, [taxOnly, userId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty()); setEditing(null); setModal(true); }
  function openEdit(e: Expense) {
    setForm({ ...e, transaction_date: format(new Date(e.transaction_date), "yyyy-MM-dd'T'HH:mm") });
    setEditing(e.id); setModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Permanently delete ${ids.length} expense${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    await fetch('/api/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId!, ids }),
    });
    setBulkDeleting(false);
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = {
      ...form, userId: userId!,
      amount: Number(form.amount),
      exchange_rate_to_base: Number(form.exchange_rate_to_base),
      transaction_date: new Date(form.transaction_date!).toISOString(),
    };
    if (editing) {
      await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) });
    } else {
      await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setSaving(false); setModal(false); load();
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(e => e.id)));
  }

  // Apply date range filter
  const filtered = useMemo(() => expenses.filter(e => {
    const d = new Date(e.transaction_date);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  }), [expenses, dateFrom, dateTo]);

  // Apply sort
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortKey === 'transaction_date') { av = a.transaction_date; bv = b.transaction_date; }
    else if (sortKey === 'amount') { av = a.amount * a.exchange_rate_to_base; bv = b.amount * b.exchange_rate_to_base; }
    else { av = (a[sortKey] ?? '').toString().toLowerCase(); bv = (b[sortKey] ?? '').toString().toLowerCase(); }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  }), [filtered, sortKey, sortDir]);

  const total = filtered.reduce((s, e) => s + convertAmount(e.amount, e.local_currency), 0);
  const deductible = filtered.filter(e => e.is_tax_deductible).reduce((s, e) => s + convertAmount(e.amount, e.local_currency), 0);
  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const hasFilter = dateFrom || dateTo;

  const COLS: { label: string; key: SortKey | null }[] = [
    { label: 'Date', key: 'transaction_date' },
    { label: 'Merchant', key: 'merchant' },
    { label: 'Category', key: 'category' },
    { label: 'Amount', key: 'amount' },
    { label: 'Tax?', key: null },
    { label: 'Source', key: 'source' },
    { label: '', key: null },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Variable Expenses</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} of {expenses.length} records · {formatCurrency(deductible, DEMO_CURRENCY)} deductible
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${hasFilter ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Filter {hasFilter && `(active)`}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer px-2">
            <input type="checkbox" checked={taxOnly} onChange={e => setTaxOnly(e.target.checked)} className="rounded" />
            Tax only
          </label>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-end gap-4 animate-fade-in">
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-1">From date</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-1">To date</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          {hasFilter && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 rounded-xl transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          {hasFilter && (
            <p className="text-xs text-amber-600 ml-auto self-center">
              Showing {filtered.length} of {expenses.length} records
            </p>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>{selected.size}</strong> expense{selected.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-white rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {bulkDeleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: total },
          { label: 'Tax Deductible', value: deductible },
          { label: 'Non-Deductible', value: total - deductible },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">{formatCurrency(s.value, DEMO_CURRENCY)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {/* Select all checkbox */}
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded cursor-pointer" />
                </th>
                {COLS.map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => key && handleSort(key)}
                    className={`px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide ${key ? 'cursor-pointer hover:text-slate-600 select-none' : ''}`}
                  >
                    {label}
                    {key && sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {hasFilter ? 'No expenses in this date range.' : 'No expenses yet. Add one above.'}
                </td></tr>
              )}
              {sorted.map(e => (
                <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${selected.has(e.id) ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{format(new Date(e.transaction_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[150px] truncate">{e.merchant}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full capitalize">{e.category}</span></td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatCurrency(convertAmount(e.amount, e.local_currency), DEMO_CURRENCY)}</td>
                  <td className="px-4 py-3">{e.is_tax_deductible ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-200" />}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{e.source}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Merchant / Description" value={form.merchant ?? ''} onChange={e => set('merchant', e.target.value)} required /></div>
            <Select label="Category" value={form.category ?? 'general'} onChange={e => set('category', e.target.value)} options={CAT_OPTIONS} />
            <Field label="Amount" type="number" step="0.01" min="0" value={form.amount ?? ''} onChange={e => set('amount', e.target.value)} required />
            <Field label="Currency" value={form.local_currency ?? DEMO_CURRENCY} onChange={e => set('local_currency', e.target.value)} maxLength={3} />
            <Field label="Exchange Rate to Base" type="number" step="0.0001" min="0" value={form.exchange_rate_to_base ?? 1} onChange={e => set('exchange_rate_to_base', e.target.value)} />
            <div className="col-span-2"><Field label="Date" type="datetime-local" value={form.transaction_date ?? ''} onChange={e => set('transaction_date', e.target.value)} required /></div>
            <div className="col-span-2"><Field label="Notes (optional)" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
            <div className="col-span-2"><Toggle label="Tax Deductible" checked={!!form.is_tax_deductible} onChange={v => set('is_tax_deductible', v)} /></div>
          </div>
          <FormActions onCancel={() => setModal(false)} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}
