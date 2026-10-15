import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { z } from 'zod';
const schema = z.object({ name: z.string().trim().min(2).max(80) });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const admin=await requireRole('ADMIN'); if(!assertSameOrigin(req)) return NextResponse.json({error:'درخواست نامعتبر'},{status:403}); const {id}=await params; const data=schema.parse(await req.json()); const category=await prisma.category.update({where:{id},data}); await prisma.auditLog.create({data:{userId:admin.id,action:'UPDATE_CATEGORY',entity:'Category',entityId:id,metadata:JSON.stringify(data)}}); return NextResponse.json(category); }
  catch { return NextResponse.json({error:'دسته‌بندی پیدا نشد یا نامعتبر است'},{status:400}); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const admin=await requireRole('ADMIN'); if(!assertSameOrigin(req)) return NextResponse.json({error:'درخواست نامعتبر'},{status:403}); const {id}=await params; const count=await prisma.book.count({where:{categoryId:id}}); if(count) return NextResponse.json({error:'ابتدا دسته‌بندی کتاب‌های این گروه را تغییر دهید'},{status:409}); await prisma.category.delete({where:{id}}); await prisma.auditLog.create({data:{userId:admin.id,action:'DELETE_CATEGORY',entity:'Category',entityId:id}}); return NextResponse.json({ok:true}); }
  catch { return NextResponse.json({error:'دسته‌بندی پیدا نشد'},{status:404}); }
}
