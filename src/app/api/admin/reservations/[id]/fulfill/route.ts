import {assertSameOrigin} from '@/lib/security';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializable } from '@/lib/transaction';
import { getLibraryConfig } from '@/lib/config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const config = await getLibraryConfig();
    const { id } = await params;
    const result = await serializable(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id }, include: { book: true, user: true } });
      if (!reservation) return { error: 'رزرو پیدا نشد', status: 404 } as const;
      if (!reservation.user.active) return { error: 'حساب عضو غیرفعال است', status: 409 } as const;
      if (reservation.status !== 'WAITING') return { error: 'این رزرو فعال نیست', status: 409 } as const;
      if (reservation.position !== 1) return { error: 'ابتدا نوبت‌های قبل باید تعیین تکلیف شوند', status: 409 } as const;
      if (reservation.book.availableStock < 1) return { error: 'کتاب موجود نیست', status: 409 } as const;
      const active = await tx.loan.count({ where: { userId: reservation.userId, status: 'ACTIVE' } });
      if (active >= config.maxActiveLoans) return { error: 'عضو به سقف امانت فعال رسیده است', status: 409 } as const;
      const duplicate = await tx.loan.findFirst({ where: { userId: reservation.userId, bookId: reservation.bookId, status: 'ACTIVE' } });
      if (duplicate) return { error: 'عضو این کتاب را در حال امانت دارد', status: 409 } as const;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + config.loanDays);
      const copy = await tx.bookCopy.findFirst({ where: { bookId: reservation.bookId, status: 'AVAILABLE' }, orderBy: { createdAt: 'asc' } });
      if (!copy) return { error: 'نسخه فیزیکی قابل تحویل پیدا نشد؛ ابتدا موجودی کتاب را بررسی کنید', status: 409 } as const;
      const loan = await tx.loan.create({ data: { code: `LN-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`, userId: reservation.userId, bookId: reservation.bookId, copyId: copy.id, dueDate } });
      await tx.bookCopy.update({ where: { id: copy.id }, data: { status: 'LOANED' } });
      await tx.book.update({ where: { id: reservation.bookId }, data: { availableStock: { decrement: 1 } } });
      await tx.reservation.update({ where: { id }, data: { status: 'FULFILLED', position: null } });
      const later = await tx.reservation.findMany({ where: { bookId: reservation.bookId, status: 'WAITING', position: { gt: 1 } }, orderBy: { position: 'asc' }, select: { id: true } });
      // Clear queue positions before compacting to avoid unique-index collisions.
      for (const row of later) await tx.reservation.update({ where: { id: row.id }, data: { position: null } });
      for (const [index, row] of later.entries()) await tx.reservation.update({ where: { id: row.id }, data: { position: index + 1 } });
      await tx.notification.create({ data: { userId: reservation.userId, type: 'SUCCESS', title: 'رزرو به امانت تبدیل شد', message: `کتاب «${reservation.book.title}» تحویل شد. کد امانت: ${loan.code}` } });
      await tx.auditLog.create({ data: { userId: admin.id, action: 'FULFILL_RESERVATION', entity: 'Reservation', entityId: id } });
      return { loan } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز یا عملیات نامعتبر' }, { status: 400 }); }
}
