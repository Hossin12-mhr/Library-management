import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializable } from '@/lib/transaction';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  const { id } = await params;

  try {
    const result = await serializable(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) return { error: 'رزرو پیدا نشد', status: 404 } as const;
      if (reservation.userId !== user.id && user.role !== 'ADMIN') return { error: 'دسترسی غیرمجاز', status: 403 } as const;
      if (reservation.status !== 'WAITING') return { error: 'این رزرو دیگر فعال نیست', status: 409 } as const;

      await tx.reservation.update({ where: { id }, data: { status: 'CANCELLED', position: null } });
      const later = await tx.reservation.findMany({
        where: { bookId: reservation.bookId, status: 'WAITING', position: { gt: reservation.position } },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      // Clear positions first so the unique (bookId, position) constraint cannot
      // collide while the queue is being compacted. NULL positions are intentionally
      // allowed for cancelled/fulfilled reservations.
      for (const row of later) {
        await tx.reservation.update({ where: { id: row.id }, data: { position: null } });
      }
      const basePosition = reservation.position ?? 1;
      for (const [index, row] of later.entries()) {
        await tx.reservation.update({ where: { id: row.id }, data: { position: basePosition + index } });
      }
      const next = await tx.reservation.findFirst({
        where: { bookId: reservation.bookId, status: 'WAITING', position: 1 },
        include: { book: true },
      });
      if (next) {
        const dedupeKey = `reservation-queue-advanced:${next.id}:${reservation.id}`;
        await tx.notification.create({
          data: {
            userId: next.userId,
            type: 'INFO',
            title: 'نوبت رزرو شما جلو رفت',
            message: `نوبت شما برای «${next.book.title}» اکنون اول صف است.`,
            dedupeKey,
          },
        });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: 'CANCEL_RESERVATION', entity: 'Reservation', entityId: id } });
      return { ok: true } as const;
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'لغو رزرو انجام نشد' }, { status: 409 });
  }
}
