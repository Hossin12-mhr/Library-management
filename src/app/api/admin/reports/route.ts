import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

function csvEscape(value: unknown) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const [
      books, members, activeLoans, overdueLoans, pendingRequests, waitingReservations,
      unpaidFines, returnedLoans, totalStock, availableStock, lowStock, paidFines,
      totalRequests, fulfilledReservations,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.count({ where: { status: 'OVERDUE' } }),
      prisma.loanRequest.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'WAITING' } }),
      prisma.fine.aggregate({ where: { status: 'UNPAID' }, _sum: { amount: true } }),
      prisma.loan.count({ where: { status: 'RETURNED' } }),
      prisma.book.aggregate({ _sum: { totalStock: true } }),
      prisma.book.aggregate({ _sum: { availableStock: true } }),
      prisma.book.count({ where: { availableStock: { lte: 1 } } }),
      prisma.fine.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.loanRequest.count(),
      prisma.reservation.count({ where: { status: 'FULFILLED' } }),
    ]);

    const data = {
      books, members, totalStock: totalStock._sum.totalStock ?? 0, availableStock: availableStock._sum.availableStock ?? 0,
      lowStock, activeLoans, overdueLoans, pendingRequests, totalRequests, waitingReservations, fulfilledReservations,
      unpaidFines: unpaidFines._sum.amount ?? 0, paidFines: paidFines._sum.amount ?? 0, returnedLoans,
    };

    if (new URL(req.url).searchParams.get('format') === 'csv') {
      const csv = ['metric,value', ...Object.entries(data).map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`)].join('\n') + '\n';
      return new Response('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="library-report.csv"', 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}
