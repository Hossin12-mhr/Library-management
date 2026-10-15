import {assertSameOrigin} from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializable } from '@/lib/transaction';
import { getCurrentUser } from '@/lib/auth';
import { getLibraryConfig } from '@/lib/config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  if (user.role !== 'MEMBER') return NextResponse.json({ error: 'فقط اعضا می‌توانند تمدید کنند' }, { status: 403 });
  const { id } = await params;
  const config = await getLibraryConfig();
  try {
    const result = await serializable(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id }, include: { book: true } });
      if (!loan || loan.userId !== user.id) return { error: 'امانت پیدا نشد', status: 404 } as const;
      if (loan.status !== 'ACTIVE') return { error: 'این امانت فعال نیست', status: 409 } as const;
      if (loan.extensionCount >= 1) return { error: 'این امانت قبلاً یک‌بار تمدید شده است', status: 409 } as const;
      const hasWaitingReservation = await tx.reservation.count({ where: { bookId: loan.bookId, status: 'WAITING' } });
      if (hasWaitingReservation > 0) return { error: 'به‌دلیل وجود رزرو در صف، تمدید امکان‌پذیر نیست', status: 409 } as const;
      const due = new Date(loan.dueDate);
      due.setDate(due.getDate() + config.loanDays);
      const updated = await tx.loan.update({ where: { id }, data: { dueDate: due, extensionCount: { increment: 1 } } });
      await tx.notification.create({ data: { userId: user.id, type: 'SUCCESS', title: 'امانت تمدید شد', message: `مهلت امانت «${loan.book.title}» تا ${due.toLocaleDateString('fa-IR')} تمدید شد.` } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'EXTEND_LOAN', entity: 'Loan', entityId: id } });
      return { loan: updated } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: 'تمدید امانت انجام نشد' }, { status: 409 }); }
}
