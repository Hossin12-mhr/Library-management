export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(2000),
  type: z.enum(['INFO','SUCCESS','WARNING','ERROR']).default('INFO'),
  audience: z.enum(['ALL','ACTIVE']).default('ACTIVE'),
});

export async function POST(req: Request) {
  try {
    const admin = await requireRole('ADMIN');
    if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 403 });
    const data = schema.parse(await req.json());
    const users = await prisma.user.findMany({
      where: { role: 'MEMBER', ...(data.audience === 'ACTIVE' ? { active: true } : {}) },
      select: { id: true },
    });
    if (!users.length) return NextResponse.json({ error: 'عضوی برای ارسال اعلان وجود ندارد' }, { status: 409 });
    const result = await prisma.$transaction(async tx => {
      const created = await tx.notification.createMany({
        data: users.map(user => ({ userId: user.id, title: data.title, message: data.message, type: data.type })),
      });
      await tx.auditLog.create({
        data: { userId: admin.id, action: 'BROADCAST_NOTIFICATION', entity: 'Notification', metadata: JSON.stringify({ count: created.count, audience: data.audience, title: data.title }) },
      });
      return created;
    });
    return NextResponse.json({ count: result.count }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'اطلاعات اعلان نامعتبر است' }, { status: 400 });
    return NextResponse.json({ error: 'ارسال اعلان ناموفق بود' }, { status: 500 });
  }
}
