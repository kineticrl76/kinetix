import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSchema = z.object({
  userId: z.string(),
  name: z.string().min(1).max(200),
  category: z.string().default('general'),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  local_currency: z.string().length(3).default('USD'),
  exchange_rate_to_base: z.number().positive().default(1.0),
  target_date: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: { target_date: 'asc' },
  });

  return NextResponse.json(
    goals.map(g => ({
      ...g,
      progress: g.target_amount > 0 ? Math.min(1, g.current_amount / g.target_amount) : 0,
      months_remaining: Math.max(0, Math.ceil((g.target_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const goal = await prisma.financialGoal.create({
    data: { ...body.data, target_date: new Date(body.data.target_date) },
  });

  return NextResponse.json(goal, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const goal = await prisma.financialGoal.update({
    where: { id },
    data: { ...data, ...(data.target_date ? { target_date: new Date(data.target_date) } : {}) },
  });

  return NextResponse.json(goal);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.financialGoal.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
