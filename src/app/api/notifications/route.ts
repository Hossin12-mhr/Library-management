import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {assertSameOrigin} from '@/lib/security';
import {z} from 'zod';

const querySchema=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)});
const patchSchema=z.object({all:z.boolean().optional(),id:z.string().min(1).max(100).optional()}).refine(v=>Boolean(v.all)||Boolean(v.id),{message:'notification target required'});

export async function GET(req:Request){
  const u=await getCurrentUser();
  if(!u)return NextResponse.json({error:'نیاز به ورود'},{status:401});
  try{
    const url=new URL(req.url);
    const {page,pageSize}=querySchema.parse({page:url.searchParams.get('page')||undefined,pageSize:url.searchParams.get('pageSize')||undefined});
    const where={userId:u.id};
    const [notifications,total,unread]=await prisma.$transaction([
      prisma.notification.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*pageSize,take:pageSize}),
      prisma.notification.count({where}),
      prisma.notification.count({where:{userId:u.id,readAt:null}}),
    ]);
    return NextResponse.json({items:notifications,unread,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'درخواست نامعتبر است'},{status:400});}
}

export async function PATCH(req:Request){
  if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});
  const u=await getCurrentUser();
  if(!u)return NextResponse.json({error:'نیاز به ورود'},{status:401});
  try{
    const body=patchSchema.parse(await req.json());
    if(body.all) await prisma.notification.updateMany({where:{userId:u.id,readAt:null},data:{readAt:new Date()}});
    else await prisma.notification.updateMany({where:{id:body.id!,userId:u.id},data:{readAt:new Date()}});
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'درخواست نامعتبر است'},{status:400});}
}
