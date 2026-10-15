export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { assertSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['UNPAID', 'PAID', 'WAIVED']).optional(),
});
const updateSchema = z.object({ id: z.string().min(1), status: z.enum(['PAID', 'WAIVED']) });

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'پارامترهای نامعتبر' }, { status: 400 });
    const { page, pageSize, status } = parsed.data;
    const where = status ? { status } : {};
    const [items, total] = await prisma.$transaction([
      prisma.fine.findMany({
        where,
        include: { user: { select: { name: true, email: true, memberCode: true } }, loan: { select: { code: true, book: { select: { title: true } } } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.fine.count({ where }),
    ]);
    return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 }); }
}

export async function PATCH(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id, status } = updateSchema.parse(await req.json());
    const fine = await prisma.fine.update({ where: { id }, data: { status, paidAt: status === 'PAID' ? new Date() : null } });
    await prisma.auditLog.create({ data: { userId: admin.id, action: status === 'PAID' ? 'MARK_FINE_PAID' : 'WAIVE_FINE', entity: 'Fine', entityId: id } });
    return NextResponse.json(fine, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 }); }
}
