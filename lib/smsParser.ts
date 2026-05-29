export interface ParsedSmsTransaction {
  amount: number;
  currency: string;
  merchant: string;
  date: Date;
  card_id: string | null;
  is_tax_deductible: boolean;
  raw: string;
}

// Keywords that suggest a business/tax-deductible expense
const BUSINESS_KEYWORDS = [
  'amazon web services', 'aws', 'microsoft', 'google workspace', 'adobe',
  'slack', 'zoom', 'dropbox', 'github', 'notion', 'figma', 'canva',
  'office 365', 'linkedin', 'shopify', 'stripe', 'twilio', 'sendgrid',
  'digitalocean', 'heroku', 'cloudflare', 'namecheap', 'godaddy',
];

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '₱': 'PHP',
  '¥': 'JPY', 'S$': 'SGD', 'A$': 'AUD', 'C$': 'CAD',
};

// Regex patterns covering common international bank SMS formats
const PATTERNS = [
  // "debited/charged/withdrawn PHP 1,500.00 at/from MERCHANT on DD/MM/YYYY"
  /(?:debited|charged|withdrawn|spent)\s+(?:with\s+)?([A-Z]{2,3}|[\$€£₱¥])\s*([\d,]+\.?\d*)\s+(?:at|from|to)\s+([A-Za-z0-9\s&'.,\-]+?)(?:\s+on\s+([\d\/\-]+))?(?:\.|$)/i,
  // "purchase of $50.00 at MERCHANT"
  /(?:purchase|payment|txn)\s+of\s+([A-Z]{2,3}|[\$€£₱¥])\s*([\d,]+\.?\d*)\s+(?:at|to|for)\s+([A-Za-z0-9\s&'.,\-]+)/i,
  // "Card xxxx1234: $125.50 at MERCHANT on 2024-01-15"
  /[Cc]ard\s+[Xx*]+(\d{4})[:\s]+([A-Z]{2,3}|[\$€£₱¥])\s*([\d,]+\.?\d*)\s+at\s+([A-Za-z0-9\s&'.,\-]+)/i,
  // "You spent USD 200 on MERCHANT. Card: xxxx1234"
  /(?:You\s+)?(?:spent|paid|sent)\s+([A-Z]{2,3}|[\$€£₱¥])\s*([\d,]+\.?\d*)\s+on\s+([A-Za-z0-9\s&'.,\-]+)/i,
  // "DEBIT: $75.00 MERCHANT 01/15/2024 Card 1234"
  /DEBIT[:\s]+([A-Z]{2,3}|[\$€£₱¥])\s*([\d,]+\.?\d*)\s+([A-Za-z0-9\s&'.,\-]+?)\s+([\d\/\-]+)/i,
];

function parseCurrency(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return CURRENCY_SYMBOL_MAP[raw.trim()] ?? 'USD';
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

function parseDate(raw?: string): Date {
  if (!raw) return new Date();
  const cleaned = raw.trim();
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isTaxDeductible(merchant: string): boolean {
  const lower = merchant.toLowerCase();
  return BUSINESS_KEYWORDS.some((kw) => lower.includes(kw));
}

export function parseSmsTransaction(sms: string): ParsedSmsTransaction | null {
  const text = sms.trim();

  // Pattern 0 & 1: debit/purchase without card ID
  for (const pattern of [PATTERNS[0], PATTERNS[1], PATTERNS[3]]) {
    const match = text.match(pattern);
    if (match) {
      const currency = parseCurrency(match[1]);
      const amount = parseAmount(match[2]);
      const merchant = match[3].trim().replace(/\s+/g, ' ');
      const date = parseDate(match[4]);
      return { amount, currency, merchant, date, card_id: null, is_tax_deductible: isTaxDeductible(merchant), raw: text };
    }
  }

  // Pattern 2: card-based "Card xxxx: amount at merchant"
  const cardMatch = text.match(PATTERNS[2]);
  if (cardMatch) {
    const card_id = cardMatch[1];
    const currency = parseCurrency(cardMatch[2]);
    const amount = parseAmount(cardMatch[3]);
    const merchant = cardMatch[4].trim().replace(/\s+/g, ' ');
    return { amount, currency, merchant, date: new Date(), card_id, is_tax_deductible: isTaxDeductible(merchant), raw: text };
  }

  // Pattern 4: DEBIT: format
  const debitMatch = text.match(PATTERNS[4]);
  if (debitMatch) {
    const currency = parseCurrency(debitMatch[1]);
    const amount = parseAmount(debitMatch[2]);
    const merchant = debitMatch[3].trim();
    const date = parseDate(debitMatch[4]);
    return { amount, currency, merchant, date, card_id: null, is_tax_deductible: isTaxDeductible(merchant), raw: text };
  }

  return null;
}

// Keywords to filter out internal/transfer transactions in statement imports
export const TRANSFER_KEYWORDS = [
  'transfer', 'internal', 'own account', 'self transfer',
  'fund transfer', 'inter-bank transfer', 'payment to self',
  'account credit', 'autopay from', 'balance forward',
];

export function isInternalTransfer(description: string): boolean {
  const lower = description.toLowerCase();
  return TRANSFER_KEYWORDS.some((kw) => lower.includes(kw));
}
