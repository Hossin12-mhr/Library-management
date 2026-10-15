import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { serializable } from '@/lib/transaction';

const schema = z.object({ status: z.enum(['AVAILABLE', 'LOST', 'DAMAGED']) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; copyId: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id, copyId } = await params;
    const { status } = schema.parse(await req.json());
    const result = await serializable(async tx => {
      const copy = await tx.bookCopy.findUnique({ where: { id: copyId }, include: { book: true } });
      if (!copy || copy.bookId !== id) return { error: 'نسخه پیدا نشد', statusCode: 404 } as const;
      if (copy.status === 'LOANED') return { error: 'نسخه در امانت است و فقط با بازگشت کتاب آزاد می‌شود', statusCode: 409 } as const;
      if (copy.status === status) return { copy } as const;
      const nextAvailable = copy.book.availableStock + (status === 'AVAILABLE' ? 1 : 0) - (copy.status === 'AVAILABLE' ? 1 : 0);
      if (nextAvailable < 0 || nextAvailable > copy.book.totalStock) return { error: 'موجودی کتاب نامعتبر می‌شود', statusCode: 409 } as const;
      const updated = await tx.bookCopy.update({ where: { id: copyId }, data: { status } });
      await tx.book.update({ where: { id }, data: { availableStock: nextAvailable } });
      await tx.auditLog.create({ data: { userId: admin.id, action: 'UPDATE_BOOK_COPY', entity: 'BookCopy', entityId: copyId, metadata: JSON.stringify({ from: copy.status, to: status, bookId: id }) } });
      return { copy: updated } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.statusCode });
    return NextResponse.json({ copy: result.copy }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'وضعیت نسخه نامعتبر است' }, { status: 400 });
  }
}
