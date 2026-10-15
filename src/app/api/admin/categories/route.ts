import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { z } from 'zod';
const schema = z.object({ name: z.string().trim().min(2).max(80) });
export async function GET(){try{await requireRole('ADMIN');return NextResponse.json(await prisma.category.findMany({orderBy:{name:'asc'},include:{_count:{select:{books:true}}}}));}catch{return NextResponse.json({error:'دسترسی غیرمجاز'},{status:403})}}
export async function POST(req:Request){try{const admin=await requireRole('ADMIN');if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست نامعتبر'},{status:403});const data=schema.parse(await req.json());const category=await prisma.category.create({data});await prisma.auditLog.create({data:{userId:admin.id,action:'CREATE_CATEGORY',entity:'Category',entityId:category.id,metadata:JSON.stringify(data)}});return NextResponse.json(category,{status:201});}catch{return NextResponse.json({error:'دسته‌بندی تکراری یا نامعتبر است'},{status:400})}}
