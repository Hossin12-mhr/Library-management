import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import bcrypt from 'bcryptjs';
import { enforceRateLimit, clientKey } from '@/lib/security';
const schema=z.object({name:z.string().min(2).max(80),phone:z.string().max(30).optional().or(z.literal('')),grade:z.string().trim().max(40).optional().or(z.literal('')),className:z.string().trim().max(80).optional().or(z.literal('')),address:z.string().trim().max(300).optional().or(z.literal('')),guardianName:z.string().trim().max(120).optional().or(z.literal(''))});
const passwordSchema=z.object({currentPassword:z.string().min(1).max(200),newPassword:z.string().min(12).max(200)});
export async function PATCH(req:Request){if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});const user=await getCurrentUser();if(!user)return NextResponse.json({error:'نیاز به ورود'}, {status:401});try{const body=schema.parse(await req.json());const {name,phone,grade,className,address,guardianName}=body;
    const updated=await prisma.$transaction(async tx=>{
      const account=await tx.user.update({where:{id:user.id},data:{name,phone},select:{id:true,name:true,email:true,phone:true,memberCode:true,role:true}});
      await tx.memberProfile.upsert({where:{userId:user.id},update:{grade:grade||null,className:className||null,address:address||null,guardianName:guardianName||null},create:{userId:user.id,grade:grade||null,className:className||null,address:address||null,guardianName:guardianName||null}});
      return account;
    });await prisma.auditLog.create({data:{userId:user.id,action:'UPDATE_PROFILE',entity:'User',entityId:user.id,metadata:JSON.stringify({nameChanged:body.name!==user.name,phoneChanged:body.phone!==user.phone, profileChanged:true})}});return NextResponse.json({user:updated});}catch{return NextResponse.json({error:'اطلاعات واردشده معتبر نیست'},{status:400});}}

export async function POST(req:Request){
  if(!assertSameOrigin(req)) return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:'نیاز به ورود'},{status:401});
  const limit=await enforceRateLimit(`password-change:${user.id}`, 5, 15*60*1000);
  if(!limit.allowed) return NextResponse.json({error:'تعداد تلاش‌ها بیش از حد مجاز است', retryAfter: limit.retryAfter},{status:429,headers:{'Retry-After':String(limit.retryAfter ?? 900)}});
  try {
    const body=passwordSchema.parse(await req.json());
    const ok=await bcrypt.compare(body.currentPassword,user.passwordHash);
    if(!ok) return NextResponse.json({error:'رمز عبور فعلی نادرست است'},{status:400});
    const passwordHash=await bcrypt.hash(body.newPassword,12);
    await prisma.user.update({where:{id:user.id},data:{passwordHash:{set:passwordHash},sessionVersion:{increment:1}}});
    await prisma.auditLog.create({data:{userId:user.id,action:'CHANGE_PASSWORD',entity:'User',entityId:user.id}});
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:'رمز جدید باید حداقل ۱۲ کاراکتر باشد'},{status:400}); }
}
