import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'درخواست غیرمجاز است' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  const { id } = await params;
  const request = await prisma.loanRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: 'درخواست پیدا نشد' }, { status: 404 });
  if (request.userId !== user.id && user.role !== 'ADMIN') return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  if (request.status !== 'PENDING') return NextResponse.json({ error: 'فقط درخواست در انتظار قابل لغو است' }, { status: 409 });
  await prisma.loanRequest.update({ where: { id }, data: { status: 'CANCELLED', reviewedAt: new Date() } });
  await prisma.auditLog.create({ data: { userId: user.id, action: 'CANCEL_LOAN_REQUEST', entity: 'LoanRequest', entityId: id } });
  return NextResponse.json({ ok: true });
}
