import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSchema = z.object({
  userId: z.string(),
  name: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  account_type: z.string().default('savings'),
  balance: z.number().min(0),
  local_currency: z.string().length(3).default('USD'),
  exchange_rate_to_base: z.number().positive().default(1.0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const accounts = await prisma.savingsAccount.findMany({
    where: { userId },
    orderBy: { account_type: 'asc' },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const account = await prisma.savingsAccount.create({ data: body.data });
  return NextResponse.json(account, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const account = await prisma.savingsAccount.update({
    where: { id },
    data: { ...data, last_updated: new Date() },
  });

  return NextResponse.json(account);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.savingsAccount.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
