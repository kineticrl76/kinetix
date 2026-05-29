import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { format } from 'date-fns';

const BodySchema = z.object({
  text: z.string().min(1).max(500),
  userId: z.string().min(1),
  base_currency: z.string().length(3).default('USD'),
});

interface QuickLogParsed {
  amount: number;
  description: string;
  payment_method: string;
  date: string; // YYYY-MM-DD
  category: string;
  is_tax_deductible: boolean;
}

async function parseWithLLM(text: string, today: string): Promise<QuickLogParsed> {
  const apiUrl = process.env.VISION_API_URL;
  const apiKey = process.env.VISION_API_KEY;
  const model = process.env.VISION_MODEL ?? 'llama-3.3-70b-versatile';

  if (!apiUrl || !apiKey) throw new Error('AI API not configured');

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a financial transaction parser. Today's date is ${today}.
Parse the user's natural language input and return ONLY a valid JSON object with these exact fields:
{
  "amount": <positive float>,
  "description": "<merchant or item name, max 100 chars>",
  "payment_method": "<Cash | Card | Bank Transfer | Unknown>",
  "date": "<YYYY-MM-DD — resolve relative terms like 'yesterday', 'last Friday', 'today' using today's date>",
  "category": "<one of: food | transport | entertainment | shopping | health | business | utilities | general>",
  "is_tax_deductible": <true if this sounds like a business expense, false otherwise>
}
Return only the JSON. No explanation.`,
        },
        { role: 'user', content: text },
      ],
      max_tokens: 256,
      temperature: 0,
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.statusText}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in LLM response');
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { text, userId, base_currency } = body.data;
  const today = format(new Date(), 'yyyy-MM-dd');

  let parsed: QuickLogParsed;
  try {
    parsed = await parseWithLLM(text, today);
  } catch (err) {
    console.error('Quick-log LLM error:', err);
    return NextResponse.json({ error: 'Could not parse the input. Try being more specific, e.g. "Spent 45 on dinner at McDonald\'s yesterday"' }, { status: 422 });
  }

  if (!parsed.amount || parsed.amount <= 0) {
    return NextResponse.json({ error: 'Could not detect an amount in your input' }, { status: 422 });
  }

  const expense = await prisma.variableExpense.create({
    data: {
      userId,
      merchant: parsed.description,
      category: parsed.category ?? 'general',
      amount: parsed.amount,
      local_currency: base_currency,
      exchange_rate_to_base: 1.0,
      is_tax_deductible: parsed.is_tax_deductible ?? false,
      transaction_date: new Date(parsed.date ?? today),
      notes: `Quick logged: "${text}" | Payment: ${parsed.payment_method}`,
      source: 'manual',
    },
  });

  return NextResponse.json({ expense, parsed }, { status: 201 });
}
