import {assertSameOrigin} from '@/lib/security';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const schema = z.object({
  title:z.string().trim().min(1).max(200), author:z.string().trim().min(1).max(160),
  isbn:z.string().trim().max(32).optional().nullable(), publisher:z.string().trim().max(160).optional().nullable(),
  publishedYear:z.number().int().min(0).max(3000).optional().nullable(), description:z.string().max(5000).optional().nullable(),
  topic:z.string().trim().max(160).optional().nullable(), coverUrl:z.string().url().refine(v=>{try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:'}catch{return false}}).optional().nullable(), totalStock:z.number().int().min(0).max(100000), categoryId:z.string().optional().nullable()
});

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});
  try{
    const admin=await requireRole('ADMIN'); const {id}=await params; const d=schema.parse(await req.json());
    const old=await prisma.book.findUnique({where:{id},include:{copies:{select:{id:true,status:true}}}}); if(!old)return NextResponse.json({error:'کتاب پیدا نشد'},{status:404});
    const nonAvailableCopies=old.copies.filter(c=>c.status!=='AVAILABLE').length;
    if(d.totalStock<nonAvailableCopies)return NextResponse.json({error:`موجودی کل نمی‌تواند کمتر از ${nonAvailableCopies} نسخه غیرقابل‌دسترس باشد`},{status:409});
    const b=await prisma.$transaction(async tx=>{
      const authorRef=await tx.author.upsert({where:{name:d.author},update:{},create:{name:d.author}});
      const copyCount=old.copies.length;
      if(d.totalStock>copyCount) await tx.bookCopy.createMany({data:Array.from({length:d.totalStock-copyCount},(_,i)=>({bookId:id,code:`CP-${crypto.randomUUID().replaceAll('-', '').slice(0,12).toUpperCase()}-${copyCount+i+1}`}))});
      if(d.totalStock<copyCount){
        const removable=copyCount-d.totalStock;
        const availableCopies=await tx.bookCopy.findMany({where:{bookId:id,status:'AVAILABLE'},orderBy:{createdAt:'desc'},take:removable,select:{id:true}});
        if(availableCopies.length<removable) throw new Error('CANNOT_REDUCE_INVENTORY');
        await tx.bookCopy.deleteMany({where:{id:{in:availableCopies.map(x=>x.id)}}});
      }
      const available=await tx.bookCopy.count({where:{bookId:id,status:'AVAILABLE'}});
      return tx.book.update({where:{id},data:{...d,authorId:authorRef.id,availableStock:available}});
    });
    await prisma.auditLog.create({data:{userId:admin.id,action:'UPDATE_BOOK',entity:'Book',entityId:id}});
    return NextResponse.json(b);
  }catch(e:any){if(e?.message==='CANNOT_REDUCE_INVENTORY') return NextResponse.json({error:'برای کاهش موجودی، ابتدا نسخه‌های غیرقابل‌امانت را به‌صورت جداگانه تعیین تکلیف کنید.'},{status:409}); return NextResponse.json({error:e?.code==='P2002'?'ISBN تکراری است':'اطلاعات نامعتبر است'},{status:400});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});
  try{
    const admin=await requireRole('ADMIN'); const {id}=await params;
    const [loans,requests,reservations]=await Promise.all([
      prisma.loan.count({where:{bookId:id}}), prisma.loanRequest.count({where:{bookId:id}}), prisma.reservation.count({where:{bookId:id}})
    ]);
    if(loans||requests||reservations)return NextResponse.json({error:'کتابی که سابقه امانت، درخواست یا رزرو دارد حذف نمی‌شود؛ آن را ویرایش کنید.'},{status:409});
    await prisma.book.delete({where:{id}}); await prisma.auditLog.create({data:{userId:admin.id,action:'DELETE_BOOK',entity:'Book',entityId:id}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:'کتاب پیدا نشد'},{status:404});}
}
