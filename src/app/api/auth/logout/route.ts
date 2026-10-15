import {NextResponse} from 'next/server';import {clearSession} from '@/lib/auth';import {assertSameOrigin} from '@/lib/security';
export async function POST(req:Request){if(!assertSameOrigin(req))return NextResponse.json({error:'درخواست غیرمجاز است'},{status:403});await clearSession();return NextResponse.json({ok:true})}
