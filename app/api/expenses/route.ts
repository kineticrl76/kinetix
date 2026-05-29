import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSchema = z.object({
  userId: z.string(),
  merchant: z.string().min(1).max(200),
  category: z.string().default('general'),
  amount: z.number().positive(),
  local_currency: z.string().length(3).default('USD'),
  exchange_rate_to_base: z.number().positive().default(1.0),
  is_tax_deductible: z.boolean().default(false),
  transaction_date: z.string().datetime(),
  card_id: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const taxOnly = searchParams.get('taxOnly') === 'true';

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const expenses = await prisma.variableExpense.findMany({
    where: {
      userId,
      ...(from || to ? { transaction_date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(taxOnly ? { is_tax_deductible: true } : {}),
    },
    include: { receipt: true },
    orderBy: { transaction_date: 'desc' },
    take: 200,
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const expense = await prisma.variableExpense.create({
    data: { ...body.data, transaction_date: new Date(body.data.transaction_date) },
  });

  return NextResponse.json(expense, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const expense = await prisma.variableExpense.update({
    where: { id },
    data: { ...data, ...(data.transaction_date ? { transaction_date: new Date(data.transaction_date) } : {}) },
  });

  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // Bulk delete via request body: { userId, ids: string[] }
  if (!id) {
    const body = await req.json().catch(() => null);
    if (body?.ids && Array.isArray(body.ids) && body.userId) {
      const result = await prisma.variableExpense.deleteMany({
        where: { id: { in: body.ids }, userId: body.userId },
      });
      return NextResponse.json({ deleted: result.count });
    }
    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  }

  await prisma.variableExpense.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
