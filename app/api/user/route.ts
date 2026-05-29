import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, base_currency: true, tax_config: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

const PatchSchema = z.object({
  userId: z.string().min(1),
  base_currency: z.string().length(3).toUpperCase(),
});

export async function PATCH(req: NextRequest) {
  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: body.data.userId },
    data: { base_currency: body.data.base_currency },
    select: { id: true, base_currency: true },
  });

  return NextResponse.json(user);
}
