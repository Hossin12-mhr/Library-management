import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await requireRole('ADMIN');
    const books = await prisma.book.findMany({
      select: {
        id: true,
        title: true,
        totalStock: true,
        availableStock: true,
        _count: { select: { copies: true } },
        copies: { select: { status: true } },
      },
      orderBy: { title: 'asc' },
    });

    const items = books.map((book) => {
      const availableCopies = book.copies.filter((copy) => copy.status === 'AVAILABLE').length;
      const expectedTotal = book._count.copies;
      const totalMatches = book.totalStock === expectedTotal;
      const availableMatches = book.availableStock === availableCopies;
      return {
        id: book.id,
        title: book.title,
        totalStock: book.totalStock,
        copyCount: expectedTotal,
        availableStock: book.availableStock,
        availableCopies,
        healthy: totalMatches && availableMatches,
        issue: !totalMatches && !availableMatches
          ? 'TOTAL_AND_AVAILABLE_MISMATCH'
          : !totalMatches
            ? 'TOTAL_STOCK_MISMATCH'
            : !availableMatches
              ? 'AVAILABLE_STOCK_MISMATCH'
              : null,
      };
    });

    const mismatches = items.filter((item) => !item.healthy);
    return NextResponse.json({
      healthy: mismatches.length === 0,
      checkedBooks: items.length,
      mismatchCount: mismatches.length,
      mismatches,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}
