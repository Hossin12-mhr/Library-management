import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { serializable } from '@/lib/transaction';

const schema = z.object({
  status: z.enum(['AVAILABLE', 'LOST', 'DAMAGED']),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN');
    const { id } = await params;
    const book = await prisma.book.findUnique({ where: { id }, select: { id: true } });
    if (!book) return NextResponse.json({ error: 'کتاب پیدا نشد' }, { status: 404 });
    const items = await prisma.bookCopy.findMany({ where: { bookId: id }, orderBy: { createdAt: 'asc' }, select: { id: true, code: true, status: true, createdAt: true } });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const result = await serializable(async tx => {
      const copy = await tx.bookCopy.findUnique({ where: { id }, include: { book: true } });
      if (!copy) return { error: 'نسخه پیدا نشد', statusCode: 404 } as const;
      if (copy.status === 'LOANED') return { error: 'نسخه‌ای که در امانت است فقط از مسیر بازگشت کتاب آزاد می‌شود', statusCode: 409 } as const;
      if (copy.status === status) return { copy } as const;
      const wasAvailable = copy.status === 'AVAILABLE';
      const becomesAvailable = status === 'AVAILABLE';
      const nextAvailableStock = copy.book.availableStock + (becomesAvailable ? 1 : 0) - (wasAvailable ? 1 : 0);
      if (nextAvailableStock < 0 || nextAvailableStock > copy.book.totalStock) return { error: 'موجودی کتاب نامعتبر می‌شود', statusCode: 409 } as const;
      const updated = await tx.bookCopy.update({ where: { id }, data: { status } });
      await tx.book.update({ where: { id: copy.bookId }, data: { availableStock: nextAvailableStock } });
      await tx.auditLog.create({ data: { userId: admin.id, action: 'UPDATE_BOOK_COPY', entity: 'BookCopy', entityId: id, metadata: JSON.stringify({ from: copy.status, to: status, bookId: copy.bookId }) } });
      return { copy: updated } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.statusCode });
    return NextResponse.json(result.copy);
  } catch {
    return NextResponse.json({ error: 'وضعیت نسخه نامعتبر است' }, { status: 400 });
  }
}
