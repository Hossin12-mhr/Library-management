'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function BookDetails({ params }: { params: Promise<{ id: string }> }) {
  const [book,setBook]=useState<any>(null),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{params.then(({id})=>fetch('/api/books/'+id).then(async r=>{if(!r.ok) throw new Error(); return r.json()}).then(setBook).catch(()=>setMsg('کتاب پیدا نشد')).finally(()=>setLoading(false)))},[params]);
  async function action(path:string){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookId:book.id})});const d=await r.json();if(r.status===401){location.href='/login';return}setMsg(d.error||'عملیات با موفقیت انجام شد')}
  if(loading)return <main className="container page"><div className="card pad">در حال بارگذاری...</div></main>;
  if(!book)return <main className="container page"><div className="card pad">{msg||'کتاب پیدا نشد'}</div></main>;
  return <main className="container page"><nav className="nav"><Link href="/catalog"><b>← بازگشت به کتاب‌ها</b></Link><Link href="/login">ورود</Link></nav><article className="card pad detail"><span className="badge">{book.category?.name||'عمومی'}</span><h1>{book.title}</h1><p className="muted">نویسنده: {book.author}{book.topic&&` · موضوع: ${book.topic}`}</p>{book.description&&<p className="description">{book.description}</p>}<div className="detailsGrid"><div><small>ناشر</small><b>{book.publisher||'—'}</b></div><div><small>سال انتشار</small><b>{book.publishedYear||'—'}</b></div><div><small>ISBN</small><b>{book.isbn||'—'}</b></div><div><small>موجودی</small><b>{book.availableStock} از {book.totalStock}</b></div></div>{msg&&<div className="alert">{msg}</div>}<div className="actions">{book.availableStock>0?<button className="btn primary" onClick={()=>action('/api/requests')}>درخواست امانت</button>:<button className="btn secondary" onClick={()=>action('/api/reservations')}>رزرو کتاب</button>}</div></article></main>
}
