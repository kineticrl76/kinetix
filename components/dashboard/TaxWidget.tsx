'use client';

import { formatCurrency } from '@/lib/currency';
import { TaxSummary } from '@/lib/taxCalculator';
import { Receipt, Download } from 'lucide-react';

interface Props {
  tax: TaxSummary;
  currency: string;
  userId: string;
}

export default function TaxWidget({ tax, currency, userId }: Props) {
  const effectivePct = (tax.effectiveRate * 100).toFixed(1);

  function handleExport() {
    // Placeholder — wire to a /api/export-tax-package endpoint
    alert('Export Tax Package feature coming soon. Will generate a CSV/ZIP of deductible transactions and receipts.');
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tax Estimate</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono">
              {formatCurrency(tax.estimatedTaxOwed, currency)}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
          {effectivePct}% effective
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Gross Income (annual)</span>
          <span className="font-semibold text-slate-700 font-mono">{formatCurrency(tax.grossIncome, currency)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Tax Deductions</span>
          <span className="font-semibold text-emerald-600 font-mono">−{formatCurrency(tax.totalDeductible, currency)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
          <span className="text-slate-700 font-semibold">Taxable Income</span>
          <span className="font-bold text-slate-900 font-mono">{formatCurrency(tax.taxableIncome, currency)}</span>
        </div>
      </div>

      {/* Breakdown */}
      {tax.breakdown.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {tax.breakdown.map(b => (
            <div key={b.tax_name} className="flex justify-between text-xs">
              <span className="text-slate-500">{b.tax_name}</span>
              <span className="text-red-500 font-semibold font-mono">{formatCurrency(b.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Export button (placeholder) */}
      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-500 hover:text-brand-600 rounded-xl text-xs font-semibold transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export Tax Package (CSV/ZIP)
      </button>
    </div>
  );
}
