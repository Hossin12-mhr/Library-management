export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { assertSameOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { serializable } from '@/lib/transaction';
import { requireRole } from '@/lib/auth';

const urlSchema = z.string().refine((value) => !value || /^https?:\/\//i.test(value), 'logoUrl must use http(s)');
const schema = z.object({
  schoolName: z.string().trim().min(2).max(100),
  libraryName: z.string().trim().min(2).max(100),
  logoUrl: urlSchema.pipe(z.string().max(500)),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  loanDays: z.number().int().min(1).max(365),
  dailyFine: z.number().int().min(0).max(1000000),
  maxActiveLoans: z.number().int().min(1).max(20),
});

export async function GET() {
  try {
    await requireRole('ADMIN');
    const rows = await prisma.setting.findMany();
    return NextResponse.json(Object.fromEntries(rows.map((x) => [x.key, x.value])), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }
}

export async function PUT(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  let admin;
  try { admin = await requireRole('ADMIN'); } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 }); }
  try {
    const data = schema.parse(await req.json());
    await serializable(async (tx) => {
      for (const [key, value] of Object.entries(data)) {
        await tx.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
      }
      await tx.auditLog.create({ data: { userId: admin.id, action: 'UPDATE_SETTINGS', entity: 'Setting', metadata: JSON.stringify(data) } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'اطلاعات تنظیمات نامعتبر است' }, { status: 400 });
  }
}
