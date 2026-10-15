import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializable } from '@/lib/transaction';
import { requireRole } from '@/lib/auth';
import { getLibraryConfig } from '@/lib/config';
import { assertSameOrigin } from '@/lib/security';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;
    const config = await getLibraryConfig();
    const result = await serializable(async (tx) => {
      const request = await tx.loanRequest.findUnique({ where: { id }, include: { book: { include: { copies: true } }, user: true } });
      if (!request) return { error: 'درخواست پیدا نشد', status: 404 } as const;
      if (!request.user.active) return { error: 'حساب عضو غیرفعال است', status: 409 } as const;
      if (request.status !== 'APPROVED') return { error: request.status === 'DELIVERED' ? 'این درخواست قبلاً تحویل شده است' : 'فقط درخواست تأییدشده قابل تحویل است', status: 409 } as const;
      if (request.book.availableStock < 1) return { error: 'کتاب دیگر موجود نیست', status: 409 } as const;
      const active = await tx.loan.count({ where: { userId: request.userId, status: 'ACTIVE' } });
      if (active >= config.maxActiveLoans) return { error: 'عضو به سقف امانت فعال رسیده است', status: 409 } as const;
      const duplicate = await tx.loan.findFirst({ where: { userId: request.userId, bookId: request.bookId, status: 'ACTIVE' } });
      if (duplicate) return { error: 'عضو این کتاب را در حال امانت دارد', status: 409 } as const;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + config.loanDays);
      const copy = await tx.bookCopy.findFirst({ where: { bookId: request.bookId, status: 'AVAILABLE' }, orderBy: { createdAt: 'asc' } });
      if (!copy) return { error: 'نسخه فیزیکی قابل تحویل پیدا نشد؛ ابتدا موجودی کتاب را بررسی کنید', status: 409 } as const;
      const loan = await tx.loan.create({ data: { code: `LN-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`, userId: request.userId, bookId: request.bookId, copyId: copy.id, dueDate } });
      await tx.bookCopy.update({ where: { id: copy.id }, data: { status: 'LOANED' } });
      await tx.book.update({ where: { id: request.bookId }, data: { availableStock: { decrement: 1 } } });
      await tx.loanRequest.update({ where: { id }, data: { status: 'DELIVERED' } });
      await tx.notification.create({ data: { userId: request.userId, type: 'SUCCESS', title: 'کتاب تحویل شد', message: `کتاب «${request.book.title}» تحویل شد. کد امانت: ${loan.code}` } });
      await tx.auditLog.create({ data: { userId: admin.id, action: 'CHECKOUT_LOAN', entity: 'Loan', entityId: loan.id, metadata: JSON.stringify({ requestId: id }) } });
      return { loan } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز یا عملیات نامعتبر' }, { status: 400 });
  }
}
