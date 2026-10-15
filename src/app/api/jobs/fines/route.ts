import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {getLibraryConfig} from '@/lib/config';
async function run(req:Request){
  const auth=req.headers.get('authorization');
  if(!process.env.CRON_SECRET || auth!==`Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:'غیرمجاز'},{status:401});
  const config=await getLibraryConfig();
  const now=new Date();
  const overdue=await prisma.loan.findMany({where:{status:'ACTIVE',dueDate:{lt:now}},select:{id:true,userId:true,dueDate:true}});
  let updated=0;
  for(const loan of overdue){
    const days=Math.max(1,Math.ceil((now.getTime()-loan.dueDate.getTime())/86400000));
    const amount=days*config.dailyFine;
    await prisma.$transaction([
      prisma.loan.update({where:{id:loan.id},data:{status:'OVERDUE'}}),
      prisma.fine.upsert({where:{loanId_reason:{loanId:loan.id,reason:'تاخیر'}},update:{amount},create:{loanId:loan.id,userId:loan.userId,amount,reason:'تاخیر'}})
    ]);
    updated++;
  }
  return NextResponse.json({ok:true,processed:updated},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){ return run(req); }
