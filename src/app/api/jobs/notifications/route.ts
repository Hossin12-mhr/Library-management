import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Daily job: notify members about loans due soon. Protected by CRON_SECRET. */
async function run(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + 3 * 86400000);
  const loans = await prisma.loan.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] }, dueDate: { gt: now, lte: until } },
    select: { id: true, userId: true, book: { select: { title: true } }, dueDate: true },
  });

  let created = 0;
  for (const loan of loans) {
    const days = Math.max(1, Math.ceil((loan.dueDate.getTime() - now.getTime()) / 86400000));
    const title = 'یادآوری سررسید امانت';
    const dayKey = loan.dueDate.toISOString().slice(0, 10);
    const dedupeKey = `due-reminder:${loan.id}:${dayKey}`;
    const message = `امانت «${loan.book.title}» حدود ${days} روز دیگر سررسید می‌شود.`;
    try {
      await prisma.notification.create({
        data: { userId: loan.userId, type: 'WARNING', title, message, dedupeKey },
      });
      created++;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && (error as {code?: string}).code === 'P2002')) throw error;
    }
  }
  return NextResponse.json({ ok: true, processed: loans.length, created }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) { return run(req); }
