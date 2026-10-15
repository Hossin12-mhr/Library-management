'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Book={id:string,title:string,author:string,topic?:string,description?:string,availableStock:number,totalStock:number,category?:{name:string}};
type Category={id:string,name:string};
type CatalogResponse={books:Book[];total:number;page:number;pageSize:number;totalPages:number};
type Author={id:string,name:string};

export default function Catalog(){
  const [books,setBooks]=useState<Book[]>([]),[q,setQ]=useState(''),[category,setCategory]=useState(''),[categories,setCategories]=useState<Category[]>([]),[authors,setAuthors]=useState<Author[]>([]),[authorId,setAuthorId]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[page,setPage]=useState(1),[totalPages,setTotalPages]=useState(1);
  const load=async(nextPage=page)=>{
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams({page:String(nextPage),pageSize:'24'});if(q.trim())params.set('q',q.trim());if(category)params.set('categoryId',category);if(authorId)params.set('authorId',authorId);
      const r=await fetch('/api/books?'+params.toString(),{cache:'no-store'});const d=await r.json();
      if(!r.ok)throw new Error(d.error||'دریافت فهرست کتاب‌ها ناموفق بود');
      const data=d as CatalogResponse;setBooks(Array.isArray(data.books)?data.books:[]);setPage(data.page||nextPage);setTotalPages(Math.max(1,data.totalPages||1));
    }catch(e:any){setBooks([]);setError(e?.message||'دریافت فهرست کتاب‌ها ناموفق بود')}
    finally{setLoading(false)}
  };
  useEffect(()=>{fetch('/api/categories',{cache:'force-cache'}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(d=>setCategories(Array.isArray(d)?d:[])).catch(()=>setCategories([]));fetch('/api/authors',{cache:'force-cache'}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(d=>setAuthors(Array.isArray(d)?d:[])).catch(()=>setAuthors([]));load(1)},[]);
  async function request(id:string){const r=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookId:id})});const d=await r.json();if(r.status===401){location.href='/login';return}setMsg(d.error||'درخواست ثبت شد');if(r.ok)load(page)}
  async function reserve(id:string){const r=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookId:id})});const d=await r.json();if(r.status===401){location.href='/login';return}setMsg(d.error||'رزرو ثبت شد');if(r.ok)load(page)}
  return <main className="container page"><nav className="nav"><div><Link href="/"><b>کتابخانه مدرسه</b></Link></div><div className="navlinks"><Link href="/login">ورود</Link><Link className="btn primary" href="/register">عضویت</Link></div></nav><section className="heroMini"><div><span className="eyebrow">کتابخانه</span><h1>فهرست کتاب‌ها</h1><p>کتاب موردنظر را جستجو کنید و برای امانت یا رزرو اقدام کنید.</p></div></section><div className="card pad"><div className="inline"><input aria-label="جستجوی کتاب‌ها" className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(1)} placeholder="عنوان، نویسنده، موضوع یا ISBN..."/><select aria-label="دسته‌بندی" className="input" value={category} onChange={e=>{setCategory(e.target.value);load(1)}}><option value="">همه دسته‌ها</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="نویسنده" className="input" value={authorId} onChange={e=>{setAuthorId(e.target.value);load(1)}}><option value="">همه نویسندگان</option>{authors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="btn primary" onClick={()=>load(1)} disabled={loading}>جستجو</button></div></div>{msg&&<div className="alert" role="status">{msg}</div>}{error?<div className="alert error" role="alert">{error}</div>:loading?<div className="card pad">در حال بارگذاری کتاب‌ها…</div>:books.length===0?<div className="card pad"><h2>کتابی پیدا نشد</h2><p className="muted">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p></div>:<><div className="bookGrid">{books.map(b=><article className="card book" key={b.id}><span className="badge">{b.category?.name||'عمومی'}</span><Link href={`/book/${b.id}`}><h2>{b.title}</h2></Link><p className="muted">{b.author}{b.topic&&` · ${b.topic}`}</p><p>{b.description||'توضیحی برای این کتاب ثبت نشده است.'}</p><strong>{b.availableStock>0?`موجودی ${b.availableStock} نسخه`:'فعلاً ناموجود'}</strong><div className="actions">{b.availableStock>0?<button className="btn primary" onClick={()=>request(b.id)}>درخواست امانت</button>:<button className="btn secondary" onClick={()=>reserve(b.id)}>رزرو کتاب</button>}</div></article>)}</div><div className="actions" style={{marginTop:20,justifyContent:'space-between'}}><button className="btn secondary" disabled={page<=1||loading} onClick={()=>load(page-1)}>صفحه قبل</button><span>صفحه {page} از {totalPages}</span><button className="btn secondary" disabled={page>=totalPages||loading} onClick={()=>load(page+1)}>صفحه بعد</button></div></>}</main>
}
