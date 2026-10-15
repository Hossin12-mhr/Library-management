import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const requestedPage = Number(req.nextUrl.searchParams.get('page') || '1');
  const requestedPageSize = Number(req.nextUrl.searchParams.get('pageSize') || '24');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 24;
  const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined;
  const authorId = req.nextUrl.searchParams.get('authorId') || undefined;
  const where = (q || categoryId || authorId) ? {
    AND: [
      ...(q ? [{ OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { author: { contains: q, mode: 'insensitive' as const } },
        { topic: { contains: q, mode: 'insensitive' as const } },
        { isbn: { contains: q, mode: 'insensitive' as const } },
      ] }] : []),
      ...(categoryId ? [{ categoryId }] : []),
      ...(authorId ? [{ authorId }] : []),
    ],
  } : undefined;
  const paginationRequested = req.nextUrl.searchParams.has('page') || req.nextUrl.searchParams.has('pageSize');
  if (!paginationRequested) {
    const books = await prisma.book.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json(books, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } });
  }
  const [books, total] = await prisma.$transaction([
    prisma.book.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.book.count({ where }),
  ]);
  return NextResponse.json({ books, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } });
}
