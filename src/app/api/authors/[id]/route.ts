import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { z } from 'zod';

const schema = z.object({ name: z.string().trim().min(2).max(120) });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;
    const data = schema.parse(await req.json());
    const author = await prisma.author.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'UPDATE_AUTHOR', entity: 'Author', entityId: id, metadata: JSON.stringify(data) } });
    return NextResponse.json(author);
  } catch { return NextResponse.json({ error: 'نویسنده پیدا نشد یا نامعتبر است' }, { status: 400 }); }
}

export async function DELETE(req: Request, { params }: Params) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;
    const author = await prisma.author.findUnique({ where: { id }, include: { _count: { select: { books: true } } } });
    if (!author) return NextResponse.json({ error: 'نویسنده پیدا نشد' }, { status: 404 });
    if (author._count.books > 0) return NextResponse.json({ error: 'نویسنده‌ای که کتاب دارد حذف نمی‌شود؛ ابتدا کتاب‌ها را به نویسنده دیگری منتقل کنید.' }, { status: 409 });
    await prisma.author.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'DELETE_AUTHOR', entity: 'Author', entityId: id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'حذف نویسنده ناموفق بود' }, { status: 400 }); }
}
