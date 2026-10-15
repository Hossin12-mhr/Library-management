import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const url = new URL(req.url);
    const parsed = querySchema.parse({ page: url.searchParams.get('page') ?? undefined, pageSize: url.searchParams.get('pageSize') ?? undefined });
    const { page, pageSize } = parsed;
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { name: true, email: true } } } }),
      prisma.auditLog.count(),
    ]);
    return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}
