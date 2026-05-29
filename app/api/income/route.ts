import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSchema = z.object({
  userId: z.string(),
  source: z.string().min(1).max(200),
  category: z.string().default('salary'),
  amount: z.number().positive(),
  local_currency: z.string().length(3).default('USD'),
  exchange_rate_to_base: z.number().positive().default(1.0),
  frequency: z.enum(['monthly', 'weekly', 'bi-weekly', 'one-time']).default('monthly'),
  received_at: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const incomes = await prisma.income.findMany({
    where: { userId },
    orderBy: { received_at: 'desc' },
  });

  return NextResponse.json(incomes);
}

export async function POST(req: NextRequest) {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const income = await prisma.income.create({
    data: { ...body.data, received_at: new Date(body.data.received_at) },
  });

  return NextResponse.json(income, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const income = await prisma.income.update({
    where: { id },
    data: { ...data, ...(data.received_at ? { received_at: new Date(data.received_at) } : {}) },
  });

  return NextResponse.json(income);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
