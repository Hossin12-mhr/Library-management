'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Loan = { id:string; code:string; status:string; startDate:string; dueDate:string; returnedAt:string|null; book:{title:string;author:string} };
type LoanResponse = { items: Loan[]; pagination: { page:number; pageSize:number; total:number; totalPages:number } };
export default function MemberHistory(){
  const [loans,setLoans]=useState<Loan[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{fetch('/api/loans').then(async r=>{if(!r.ok){location.href='/login';return} const data: LoanResponse=await r.json(); setLoans(data.items); setLoading(false)})},[]);
  return <main className="container page"><nav className="nav"><div><b>تاریخچه امانت</b><span className="muted">سوابق حساب شما</span></div><div className="navlinks"><Link href="/member">پنل عضو</Link><Link href="/catalog">کتاب‌ها</Link></div></nav>
    <section className="card pad"><h1>تاریخچه امانت‌ها</h1>{loading?<p className="muted">در حال بارگذاری...</p>:loans.length===0?<p className="muted">هنوز سابقه‌ای ثبت نشده است.</p>:loans.map(l=><div className="row" key={l.id}><div><b>{l.book.title}</b><small>{l.book.author} · کد {l.code}</small></div><div className="alignEnd"><span className={'badge '+(l.status==='RETURNED'?'ok':l.status==='OVERDUE'?'danger':'')}>{l.status==='RETURNED'?'بازگردانده‌شده':l.status==='OVERDUE'?'معوق':'فعال'}</span><small>شروع: {new Date(l.startDate).toLocaleDateString('fa-IR')}</small><small>سررسید: {new Date(l.dueDate).toLocaleDateString('fa-IR')}</small>{l.returnedAt&&<small>بازگشت: {new Date(l.returnedAt).toLocaleDateString('fa-IR')}</small>}</div></div>)}</section>
  </main>
}
