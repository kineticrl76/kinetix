'use client';

import { useState, useRef } from 'react';
import { FileText, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface Props {
  userId: string;
  baseCurrency: string;
  onImported?: (count: number) => void;
}

export default function StatementImport({ userId, baseCurrency, onImported }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ imported: number; duplicates_skipped: number; skipped_credits: number } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Default: last 3 months
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM'));

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') { setStatus('error'); setError('Only PDF files are accepted'); return; }
    if (file.size > 20 * 1024 * 1024) { setStatus('error'); setError('File too large (max 20 MB)'); return; }

    setStatus('uploading');
    setResult(null);
    setError('');

    const form = new FormData();
    form.append('statement', file);
    form.append('userId', userId);
    form.append('currency', baseCurrency);
    form.append('date_from', dateFrom + '-01');
    form.append('date_to', dateTo + '-31');

    try {
      const res = await fetch('/api/import-statement', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) { setStatus('error'); setError(data.error ?? 'Import failed'); return; }

      setStatus('success');
      setResult(data);
      onImported?.(data.imported);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
          <FileText className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Import Bank Statement</p>
          <p className="text-xs text-slate-400">PDF · AI-parsed · filters transfers & duplicates</p>
        </div>
      </div>

      {/* Statement date range — tells LLM what dates to expect */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Statement From
          </label>
          <input
            type="month"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Statement To
          </label>
          <input
            type="month"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-500 hover:text-brand-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {status === 'uploading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Parsing PDF with AI (may take ~1 min)…</>
        ) : (
          <><Upload className="w-4 h-4" /> Upload Bank Statement (PDF)</>
        )}
      </button>

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      {status === 'success' && result && (
        <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-xl p-3 animate-fade-in space-y-0.5">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {result.imported} transaction{result.imported !== 1 ? 's' : ''} imported
          </div>
          {result.duplicates_skipped > 0 && (
            <p className="text-slate-400 pl-5">{result.duplicates_skipped} duplicates skipped (already in database)</p>
          )}
          {result.skipped_credits > 0 && (
            <p className="text-slate-400 pl-5">{result.skipped_credits} credits/transfers skipped</p>
          )}
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-xl p-3 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
