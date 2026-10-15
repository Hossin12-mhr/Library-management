import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { z } from 'zod';

const schema = z.object({ name: z.string().trim().min(2).max(120) });

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const authors = await prisma.author.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    take: 200,
    select: { id: true, name: true, _count: { select: { books: true } } },
  });
  return NextResponse.json(authors, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 403 });
  try {
    const admin = await requireRole('ADMIN');
    const data = schema.parse(await req.json());
    const author = await prisma.author.create({ data });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE_AUTHOR', entity: 'Author', entityId: author.id, metadata: JSON.stringify(data) } });
    return NextResponse.json(author, { status: 201 });
  } catch { return NextResponse.json({ error: 'نویسنده تکراری یا نامعتبر است' }, { status: 400 }); }
}
