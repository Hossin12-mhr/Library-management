import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const querySchema = z.object({ code: z.string().trim().toUpperCase().min(3).max(64) });

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const parsed = querySchema.safeParse({ code: new URL(req.url).searchParams.get('code') ?? '' });
    if (!parsed.success) return NextResponse.json({ error: 'کد امانت نامعتبر است' }, { status: 400 });
    const loan = await prisma.loan.findUnique({
      where: { code: parsed.data.code },
      select: {
        id: true, code: true, status: true, startDate: true, dueDate: true, returnedAt: true,
        user: { select: { id: true, name: true, email: true, memberCode: true, active: true } },
        book: { select: { id: true, title: true, author: true, isbn: true } },
        fines: { select: { amount: true, reason: true, status: true, createdAt: true, paidAt: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!loan) return NextResponse.json({ valid: false, error: 'کد امانت پیدا نشد' }, { status: 404 });
    return NextResponse.json({ valid: true, loan }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}
