-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "base_currency" TEXT NOT NULL DEFAULT 'USD',
    "tax_config" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'salary',
    "amount" REAL NOT NULL,
    "local_currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate_to_base" REAL NOT NULL DEFAULT 1.0,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "received_at" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixed_liabilities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'subscription',
    "amount" REAL NOT NULL,
    "local_currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate_to_base" REAL NOT NULL DEFAULT 1.0,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "next_payment_date" DATETIME NOT NULL,
    "renewal_date" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fixed_liabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "variable_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "amount" REAL NOT NULL,
    "local_currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate_to_base" REAL NOT NULL DEFAULT 1.0,
    "is_tax_deductible" BOOLEAN NOT NULL DEFAULT false,
    "transaction_date" DATETIME NOT NULL,
    "card_id" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "variable_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "raw_text" TEXT,
    "parsed_data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipts_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "variable_expenses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "savings_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'savings',
    "balance" REAL NOT NULL DEFAULT 0,
    "local_currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate_to_base" REAL NOT NULL DEFAULT 1.0,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "savings_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "target_amount" REAL NOT NULL,
    "current_amount" REAL NOT NULL DEFAULT 0,
    "local_currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate_to_base" REAL NOT NULL DEFAULT 1.0,
    "target_date" DATETIME NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "financial_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raw_message" TEXT NOT NULL,
    "parsed_data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expense_id" TEXT,
    "source_phone" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "incomes_userId_received_at_idx" ON "incomes"("userId", "received_at");

-- CreateIndex
CREATE INDEX "fixed_liabilities_userId_next_payment_date_idx" ON "fixed_liabilities"("userId", "next_payment_date");

-- CreateIndex
CREATE INDEX "variable_expenses_userId_transaction_date_idx" ON "variable_expenses"("userId", "transaction_date");

-- CreateIndex
CREATE INDEX "variable_expenses_userId_is_tax_deductible_idx" ON "variable_expenses"("userId", "is_tax_deductible");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_expenseId_key" ON "receipts"("expenseId");

-- CreateIndex
CREATE INDEX "sms_logs_status_idx" ON "sms_logs"("status");
