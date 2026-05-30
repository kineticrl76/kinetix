'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === 'string' ? data.error : 'Sign up failed. Please try again.');
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration
    await signIn('credentials', {
      email: form.email, password: form.password, redirect: false,
    });

    router.push('/');
    router.refresh();
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            KinetI<span className="text-brand-500">X</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
          <h1 className="text-xl font-extrabold text-slate-900 mb-1">Create account</h1>
          <p className="text-sm text-slate-400 mb-6">Start your financial command center</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </div>
            )}

            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Doe' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '8+ characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  required
                  minLength={key === 'password' ? 8 : 1}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}

            {/* Password strength hint */}
            {form.password.length > 0 && (
              <div className={`flex items-center gap-1.5 text-xs ${form.password.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {form.password.length >= 8 ? 'Strong password' : `${8 - form.password.length} more characters needed`}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
