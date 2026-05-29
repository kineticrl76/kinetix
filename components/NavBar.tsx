'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Target, CreditCard, TrendingUp,
  ArrowDownCircle, PiggyBank, Menu, X, Zap,
  LogOut, ChevronDown, User, Globe, Check,
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/liabilities', label: 'Liabilities', icon: ArrowDownCircle },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/goals', label: 'Goals', icon: Target },
];

export default function NavBar() {
  const { data: session } = useSession();
  const { currency: currentCurrency, switchCurrency } = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  async function handleCurrencySwitch(code: string) {
    if (code === currentCurrency || switching) return;
    setSwitching(true);
    setCurrencyOpen(false);
    await switchCurrency(code);
    setSwitching(false);
  }

  const activeCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);

  return (
    <header className="sticky top-0 z-40 bg-navy-800 border-b border-white/5 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">
              KinetI<span className="text-brand-500">X</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side: Currency + User */}
          <div className="flex items-center gap-2">

            {/* Currency switcher */}
            {session && (
              <div className="relative">
                <button
                  onClick={() => setCurrencyOpen(o => !o)}
                  disabled={switching}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-sm font-mono font-bold disabled:opacity-50"
                  title="Switch display currency"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {activeCurrency?.symbol ?? ''} {currentCurrency}
                </button>

                {currencyOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-fade-in overflow-hidden">
                    <p className="px-4 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      Display Currency
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      {SUPPORTED_CURRENCIES.map(({ code, symbol, name }) => (
                        <button
                          key={code}
                          onClick={() => handleCurrencySwitch(code)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${code === currentCurrency ? 'text-brand-600 font-semibold' : 'text-slate-700'}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-slate-400 w-6 text-right">{symbol}</span>
                            <span>{code}</span>
                            <span className="text-slate-400 text-xs">{name}</span>
                          </span>
                          {code === currentCurrency && <Check className="w-3.5 h-3.5 text-brand-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User avatar dropdown */}
            {session && (
              <div className="relative">
                <button
                  onClick={() => setUserOpen(o => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  {session.user?.image ? (
                    <img src={session.user.image} alt="avatar" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-slate-300 max-w-[120px] truncate">
                    {session.user?.name ?? session.user?.email}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{session.user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {!session && (
              <Link href="/auth/signin" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <User className="w-4 h-4" /> Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-slate-300 hover:text-white p-2"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-navy-800 px-4 py-3 space-y-1 animate-fade-in">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          {/* Mobile currency switcher */}
          {session && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Display Currency</p>
              <div className="grid grid-cols-3 gap-1.5">
                {SUPPORTED_CURRENCIES.map(({ code, symbol }) => (
                  <button
                    key={code}
                    onClick={() => { handleCurrencySwitch(code); setMenuOpen(false); }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-colors ${code === currentCurrency ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                  >
                    {symbol} {code}
                  </button>
                ))}
              </div>
            </div>
          )}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      )}

      {/* Close dropdowns on outside click */}
      {(userOpen || currencyOpen) && (
        <div className="fixed inset-0 z-[-1]" onClick={() => { setUserOpen(false); setCurrencyOpen(false); }} />
      )}
    </header>
  );
}
