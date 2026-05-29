# KinetIX — Personal Financial Command Center

## Stack
- **Framework:** Next.js 15 (App Router, server + client components)
- **Database:** PostgreSQL via Prisma ORM (SQLite for local dev via DATABASE_URL)
- **Styling:** Tailwind CSS + JetBrains Mono for numbers
- **Charts:** Recharts (client-only, loaded via dynamic import)
- **AI:** Groq API (configurable via VISION_API_URL/KEY) — used for receipt OCR, SMS parsing, quick-log NLP, and PDF statement parsing
- **PWA:** manifest.json + service worker headers in next.config.ts

## Architecture: The 5 Financial Pillars
1. **Income** → `incomes` table
2. **Fixed Liabilities** → `fixed_liabilities` table (insurances, subscriptions, due dates)
3. **Variable Expenses** → `variable_expenses` table (is_tax_deductible toggle, source tracking)
4. **Savings & Investments** → `savings_accounts` table
5. **Financial Goals** → `financial_goals` table (target_amount, current_amount, progress %)

## Key Modules
- `lib/currency.ts` — `convertToBaseCurrency()`, `sumInBaseCurrency()`, `formatCurrency()`
- `lib/forecast.ts` — `buildMonthlySnapshots()`, `calculateForecast()` (12/24/36m projections)
- `lib/taxCalculator.ts` — `calculateTaxSummary()` from user's `tax_config` JSON
- `lib/smsParser.ts` — `parseSmsTransaction()` + `isInternalTransfer()` for statement imports

## API Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/forecast` | GET | Main dashboard aggregation (net position, trends, tax, goals) |
| `/api/quick-log` | POST | NLP → structured expense (Groq LLM) |
| `/api/webhook/sms` | POST | Bank SMS → auto-categorized expense (token auth) |
| `/api/upload-receipt` | POST | Image → OCR → link to expense (Vision LLM) |
| `/api/import-statement` | POST | PDF → text extract → bulk expense insert |
| `/api/expenses` | GET/POST/PATCH/DELETE | Variable expenses CRUD |
| `/api/income` | GET/POST/PATCH/DELETE | Income CRUD |
| `/api/liabilities` | GET/POST/PATCH/DELETE | Fixed liabilities CRUD |
| `/api/savings` | GET/POST/PATCH/DELETE | Savings accounts CRUD |
| `/api/goals` | GET/POST/PATCH/DELETE | Financial goals CRUD |

## Multi-Currency
Every monetary record stores `local_currency` + `exchange_rate_to_base`. The dashboard always converts to the user's `base_currency` using `convertToBaseCurrency(amount, exchange_rate_to_base)`.

## Security
- SMS webhook protected by `X-Webhook-Token` header (compare to `SMS_WEBHOOK_TOKEN` env var)
- No secrets hardcoded — all via `.env`
- Input validated with Zod on all POST endpoints
- File upload: type + size guards on receipt and PDF uploads

## Development Setup
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys
npm install
npm run db:migrate
npm run db:seed    # creates demo user + sample data
npm run dev
```

## Production Checklist
- [ ] Set DATABASE_URL to PostgreSQL connection string
- [ ] Set VISION_API_KEY (Groq key) and VISION_API_URL
- [ ] Set SMS_WEBHOOK_TOKEN to a strong random string
- [ ] Replace DEMO_USER_ID in app/page.tsx with real auth session
- [ ] Swap local file storage in upload-receipt for S3/Cloudflare R2
- [ ] Add icons: public/icon-192.png and public/icon-512.png for PWA
- [ ] Add NextAuth.js or Clerk for user authentication

## Coding Standards
- Async/await for all DB and API calls
- Zod validation on all POST/PATCH body inputs
- No raw SQL — Prisma ORM only
- `formatCurrency()` for all displayed monetary values
- Mark all interactive components with `'use client'`
