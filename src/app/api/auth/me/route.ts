export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { prisma } from '@/lib/prisma';
import {NextResponse} from 'next/server';import {getCurrentUser} from '@/lib/auth';export async function GET(){const u=await getCurrentUser();if(!u)return NextResponse.json({user:null});const profile=await prisma.memberProfile.findUnique({where:{userId:u.id},select:{grade:true,className:true,address:true,guardianName:true}});return NextResponse.json({user:{id:u.id,name:u.name,email:u.email,role:u.role,memberCode:u.memberCode,phone:u.phone,profile}})}
