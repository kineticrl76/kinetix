'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  userId: string;
  baseCurrency: string;
  onLogged?: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function QuickLogBar({ userId, baseCurrency, onLogged }: Props) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), userId, base_currency: baseCurrency }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Could not parse input');
        return;
      }

      const { parsed } = data;
      setStatus('success');
      setMessage(`Logged $${parsed.amount} at ${parsed.description} on ${parsed.date}`);
      setText('');
      onLogged?.();
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-200" />
        <span className="text-indigo-100 text-xs font-semibold uppercase tracking-widest">AI Quick Log</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. 'Spent 45 on dinner with cash yesterday' or 'Paid 120 for AWS last Friday'"
          disabled={status === 'loading'}
          className="flex-1 px-4 py-2.5 bg-white/15 border border-white/20 text-white placeholder-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 disabled:opacity-60 transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || status === 'loading'}
          className="px-5 py-2.5 bg-white text-brand-700 font-bold text-sm rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log It'}
        </button>
      </form>

      {/* Status feedback */}
      {status === 'success' && (
        <div className="mt-2 flex items-center gap-2 text-green-300 text-xs animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {message}
        </div>
      )}
      {status === 'error' && (
        <div className="mt-2 flex items-center gap-2 text-red-300 text-xs animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {message}
        </div>
      )}
    </div>
  );
}
