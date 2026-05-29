'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Rates map: 1 USD = X of each currency
interface Rates { [code: string]: number }

interface CurrencyContextType {
  currency: string;
  switchCurrency: (code: string) => Promise<void>;
  convertAmount: (amount: number, fromCurrency: string) => number;
  rates: Rates;
  ratesReady: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  switchCurrency: async () => {},
  convertAmount: (a) => a,
  rates: { USD: 1 },
  ratesReady: false,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState<Rates>({ USD: 1 });
  const [ratesReady, setRatesReady] = useState(false);

  // Fetch live exchange rates via our own API proxy (avoids browser SSL issues)
  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rates) {
          setRates(data.rates);
          setRatesReady(true);
        }
      })
      .catch(() => setRatesReady(true));
  }, []);

  // Load user's saved base_currency once session is ready
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/user?userId=${session.user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.base_currency) setCurrency(data.base_currency); })
      .catch(() => {});
  }, [session?.user?.id]);

  const switchCurrency = useCallback(async (code: string) => {
    if (!session?.user?.id || code === currency) return;
    setCurrency(code);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id, base_currency: code }),
    });
  }, [session?.user?.id, currency]);

  // Convert amount from any currency to the current display currency
  // Formula: amount / fromRate * toRate  (both relative to USD)
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!fromCurrency || fromCurrency === currency || !ratesReady) return amount;
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[currency] ?? 1;
    return (amount / fromRate) * toRate;
  }, [rates, currency, ratesReady]);

  return (
    <CurrencyContext.Provider value={{ currency, switchCurrency, convertAmount, rates, ratesReady }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
