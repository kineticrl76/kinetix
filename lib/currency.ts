// All monetary amounts are stored with local_currency + exchange_rate_to_base.
// The dashboard always operates in the user's base_currency using these utilities.

export function convertToBaseCurrency(
  amount: number,
  exchangeRateToBase: number
): number {
  return parseFloat((amount * exchangeRateToBase).toFixed(2));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompact(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export interface CurrencyRecord {
  amount: number;
  exchange_rate_to_base: number;
}

export function sumInBaseCurrency(records: CurrencyRecord[]): number {
  return parseFloat(
    records
      .reduce((sum, r) => sum + convertToBaseCurrency(r.amount, r.exchange_rate_to_base), 0)
      .toFixed(2)
  );
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
] as const;
