import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';
import { assertSameOrigin } from '@/lib/security';

const querySchema = z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const updateSchema = z.object({ userId: z.string().min(1), active: z.boolean() });

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const url = new URL(req.url);
    const parsed = querySchema.parse({ q: url.searchParams.get('q') || undefined, page: url.searchParams.get('page') || undefined, pageSize: url.searchParams.get('pageSize') || undefined });
    const { q, page, pageSize } = parsed;
    const where = { role: 'MEMBER' as const, ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }, { memberCode: { contains: q, mode: 'insensitive' as const } }] } : {}) };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, memberCode: true, active: true, createdAt: true, profile: { select: { grade: true, className: true } }, _count: { select: { loans: true } } },
      orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    if (url.searchParams.get('format') === 'csv') {
      const allUsers = await prisma.user.findMany({ where, select: { name: true, email: true, memberCode: true, active: true, createdAt: true, profile: { select: { grade: true, className: true } }, _count: { select: { loans: true } } }, orderBy: { createdAt: 'desc' } });
      const csv = ['name,email,memberCode,active,createdAt,grade,className,loanCount', ...allUsers.map(u => [u.name, u.email, u.memberCode ?? '', u.active ? 'true' : 'false', u.createdAt.toISOString(), u.profile?.grade ?? '', u.profile?.className ?? '', u._count.loans].map(v => { const s=String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('\"','\"\"')}"` : s; }).join(','))].join('\n') + '\n';
      return new Response('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="members.csv"', 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ items: users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 }); }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireRole('ADMIN');
    if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 403 });
    const data = updateSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true, role: true, name: true } });
    if (!user || user.role !== 'MEMBER') return NextResponse.json({ error: 'عضو پیدا نشد' }, { status: 404 });
    const updated = await prisma.user.update({ where: { id: user.id }, data: { active: data.active, sessionVersion: { increment: 1 } }, select: { id: true, active: true } });
    await prisma.auditLog.create({ data: { userId: admin.id, action: data.active ? 'ACTIVATE_MEMBER' : 'DEACTIVATE_MEMBER', entity: 'User', entityId: user.id, metadata: JSON.stringify({ name: user.name }) } });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: 'اطلاعات نامعتبر است' }, { status: 400 }); }
}
