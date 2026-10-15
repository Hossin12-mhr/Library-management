import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['ACTIVE', 'OVERDUE', 'RETURNED']).optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'پارامترهای نامعتبر' }, { status: 400 });
  const { page, pageSize, status } = parsed.data;
  const where = {
    ...(user.role === 'ADMIN' ? {} : { userId: user.id }),
    ...(status ? { status } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.loan.findMany({
      where,
      include: { book: true, user: { select: { name: true, email: true, memberCode: true } } },
      orderBy: { dueDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loan.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
