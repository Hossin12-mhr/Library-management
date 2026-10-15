import { assertSameOrigin } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const schema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(160),
  isbn: z.string().max(32).optional().nullable(),
  publisher: z.string().max(160).optional().nullable(),
  publishedYear: z.number().int().min(0).max(3000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  topic: z.string().max(160).optional().nullable(),
  coverUrl: z.string().url().refine(v => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }).optional().nullable(),
  totalStock: z.number().int().min(0).max(100000),
  categoryId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const requestedPage = Number(req.nextUrl.searchParams.get('page') || '1');
    const requestedPageSize = Number(req.nextUrl.searchParams.get('pageSize') || '25');
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 25;
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const where = q ? { OR: [
      { title: { contains: q, mode: 'insensitive' as const } },
      { author: { contains: q, mode: 'insensitive' as const } },
      { topic: { contains: q, mode: 'insensitive' as const } },
      { isbn: { contains: q, mode: 'insensitive' as const } },
    ] } : undefined;
    const [items, total] = await prisma.$transaction([
      prisma.book.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.book.count({ where }),
    ]);
    return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 }); }
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const d = schema.parse(await req.json());
    const b = await prisma.$transaction(async (tx) => {
      const authorRef = await tx.author.upsert({ where: { name: d.author }, update: {}, create: { name: d.author } });
      const book = await tx.book.create({ data: { ...d, authorId: authorRef.id, availableStock: d.totalStock } });
      if (d.totalStock > 0) await tx.bookCopy.createMany({ data: Array.from({ length: d.totalStock }, (_, i) => ({ bookId: book.id, code: `CP-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}-${i + 1}` })) });
      return book;
    });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE_BOOK', entity: 'Book', entityId: b.id } });
    return NextResponse.json(b, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code === 'P2002' ? 'ISBN تکراری است' : 'اطلاعات کتاب نامعتبر است' }, { status: 400 });
  }
}
