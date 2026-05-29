import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSchema = z.object({
  userId: z.string(),
  name: z.string().min(1).max(200),
  category: z.string().default('subscription'),
  amount: z.number().positive(),
  local_currency: z.string().length(3).default('USD'),
  exchange_rate_to_base: z.number().positive().default(1.0),
  billing_cycle: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).default('monthly'),
  next_payment_date: z.string().datetime(),
  renewal_date: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const liabilities = await prisma.fixedLiability.findMany({
    where: { userId },
    orderBy: { next_payment_date: 'asc' },
  });

  return NextResponse.json(liabilities);
}

export async function POST(req: NextRequest) {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { renewal_date, next_payment_date, ...rest } = body.data;
  const liability = await prisma.fixedLiability.create({
    data: {
      ...rest,
      next_payment_date: new Date(next_payment_date),
      ...(renewal_date ? { renewal_date: new Date(renewal_date) } : {}),
    },
  });

  return NextResponse.json(liability, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const liability = await prisma.fixedLiability.update({
    where: { id },
    data: {
      ...data,
      ...(data.next_payment_date ? { next_payment_date: new Date(data.next_payment_date) } : {}),
      ...(data.renewal_date ? { renewal_date: new Date(data.renewal_date) } : {}),
    },
  });

  return NextResponse.json(liability);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.fixedLiability.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
