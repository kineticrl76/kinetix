import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSmsTransaction } from '@/lib/smsParser';
import { z } from 'zod';

const BodySchema = z.object({
  message: z.string().min(1).max(1000),
  from: z.string().optional(),
  userId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Token-based security
  const token = req.headers.get('x-webhook-token');
  if (!process.env.SMS_WEBHOOK_TOKEN || token !== process.env.SMS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseSmsTransaction(body.message);

  // Log raw SMS regardless of parse success
  const log = await prisma.smsLog.create({
    data: {
      raw_message: body.message,
      parsed_data: parsed ?? undefined,
      status: parsed ? 'pending' : 'unmatched',
      source_phone: body.from,
    },
  });

  if (!parsed) {
    return NextResponse.json({ status: 'unmatched', logId: log.id, message: 'Could not parse SMS' }, { status: 200 });
  }

  // Create Variable Expense from parsed data
  const expense = await prisma.variableExpense.create({
    data: {
      userId: body.userId,
      merchant: parsed.merchant,
      category: parsed.is_tax_deductible ? 'business' : 'general',
      amount: parsed.amount,
      local_currency: parsed.currency,
      exchange_rate_to_base: 1.0, // caller should pass actual rate if multi-currency
      is_tax_deductible: parsed.is_tax_deductible,
      transaction_date: parsed.date,
      card_id: parsed.card_id,
      source: 'sms',
    },
  });

  // Update log with matched expense ID
  await prisma.smsLog.update({
    where: { id: log.id },
    data: { status: 'matched', expense_id: expense.id },
  });

  return NextResponse.json({ status: 'matched', expenseId: expense.id, parsed }, { status: 201 });
}
