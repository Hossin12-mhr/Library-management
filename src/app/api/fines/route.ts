export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
export async function GET(){const u=await getCurrentUser();if(!u)return NextResponse.json({error:'ورود لازم است'},{status:401});return NextResponse.json(await prisma.fine.findMany({where:u.role==='ADMIN'?{}:{userId:u.id},include:{loan:{include:{book:true}},user:{select:{name:true,email:true,memberCode:true}}},orderBy:{createdAt:'desc'}}))}
