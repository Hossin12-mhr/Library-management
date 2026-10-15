'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type ListResponse<T>={items:T[];pagination?:{total:number;totalPages:number}};

export default function Admin(){
 const [stats,setStats]=useState<any>(null),[reqs,setReqs]=useState<any[]>([]),[loans,setLoans]=useState<any[]>([]),[users,setUsers]=useState<any[]>([]),[books,setBooks]=useState<any[]>([]),[code,setCode]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[tab,setTab]=useState('overview');
 const load=async()=>{
   setLoading(true);setError('');
   try{
     const responses=await Promise.all([
       fetch('/api/auth/me',{cache:'no-store'}),
       fetch('/api/admin/stats',{cache:'no-store'}),
       fetch('/api/requests',{cache:'no-store'}),
       fetch('/api/loans?page=1&pageSize=50',{cache:'no-store'}),
       fetch('/api/admin/users?page=1&pageSize=50',{cache:'no-store'}),
       fetch('/api/admin/books?page=1&pageSize=50',{cache:'no-store'})
     ]);
     if(!responses[0].ok){location.href='/login';return}
     const data=await Promise.all(responses.map(r=>r.json()));
     if(!responses[1].ok)throw new Error(data[1]?.error||'خطا در دریافت آمار');
     if(!responses[2].ok)throw new Error(data[2]?.error||'خطا در دریافت درخواست‌ها');
     if(!responses[3].ok)throw new Error(data[3]?.error||'خطا در دریافت امانت‌ها');
     if(!responses[4].ok)throw new Error(data[4]?.error||'خطا در دریافت اعضا');
     if(!responses[5].ok)throw new Error(data[5]?.error||'خطا در دریافت کتاب‌ها');
     setStats(data[1]);setReqs(Array.isArray(data[2])?data[2]:[]);setLoans((data[3] as ListResponse<any>)?.items||[]);setUsers((data[4] as ListResponse<any>)?.items||[]);setBooks((data[5] as ListResponse<any>)?.items||[]);
   }catch(e:any){setError(e?.message||'خطا در بارگذاری داشبورد')}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);
 async function review(id:string,action:'APPROVE'|'REJECT'){const r=await fetch('/api/requests/'+id+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const d=await r.json();setMsg(d.error||'عملیات انجام شد');load()};
 async function ret(){if(!code.trim())return;const r=await fetch('/api/loans/return',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const d=await r.json();setMsg(d.error||`بازگشت ثبت شد؛ جریمه: ${(d.fine||0).toLocaleString('fa-IR')} تومان`);setCode('');load()};
 const pendingRequests=reqs.filter(r=>r.status==='PENDING'||r.status==='APPROVED');
 const content=(()=>{
   if(loading) return <section className="card pad"><p>در حال بارگذاری داشبورد…</p></section>;
   if(tab==='overview') return <><h1>نمای کلی</h1><div className="stats">{[['کتاب‌ها',stats?.books],['اعضا',stats?.members],['امانت فعال',stats?.active],['درخواست در انتظار',stats?.pending],['جریمه پرداخت‌نشده',(stats?.unpaidFines||0).toLocaleString('fa-IR')+' تومان']].map(([a,b])=><div className="card pad" key={String(a)}><small>{a}</small><strong>{b??'—'}</strong></div>)}</div><section className="card pad"><h2>بازگشت سریع</h2><div className="inline"><label className="srOnly" htmlFor="return-code">کد امانت</label><input id="return-code" className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="کد امانت LN-..."/><button className="btn primary" onClick={ret}>ثبت بازگشت</button></div></section></>;
   if(tab==='requests') return <section className="card pad"><h1>درخواست‌های امانت</h1>{pendingRequests.length===0?<p className="muted">درخواستی برای بررسی یا تحویل نیست.</p>:pendingRequests.map(r=>r.status==='PENDING'?<div className="row" key={r.id}><div><b>{r.book.title}</b><small>{r.user.name} · {r.user.email} · {r.code}</small></div><div><button className="btn primary" onClick={()=>review(r.id,'APPROVE')}>تأیید درخواست</button>{' '}<button className="btn secondary" onClick={()=>review(r.id,'REJECT')}>رد</button></div></div>:<div className="row" key={r.id}><div><b>{r.book.title}</b><small>{r.user.name} · {r.user.email} · {r.code}</small></div><button className="btn primary" onClick={async()=>{const x=await fetch('/api/requests/'+r.id+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'}});const d=await x.json();setMsg(d.error||'کتاب تحویل شد');load()}}>ثبت تحویل</button></div>)}</section>;
   if(tab==='loans') return <section className="card pad"><h1>امانت‌ها</h1>{loans.length===0?<p className="muted">امانتی پیدا نشد.</p>:loans.map(l=><div className="row" key={l.id}><div><b>{l.book.title}</b><small>{l.user.name} · {l.user.memberCode}</small></div><div className="alignEnd"><code>{l.code}</code><small>سررسید {new Date(l.dueDate).toLocaleDateString('fa-IR')}</small></div></div>)}</section>;
   if(tab==='books') return <Books books={books} reload={load}/>;
   return <section className="card pad"><h1>اعضا</h1>{users.length===0?<p className="muted">عضوی پیدا نشد.</p>:users.map(u=><div className="row" key={u.id}><div><b>{u.name}</b><small>{u.email} · {u.memberCode}</small></div><span>{u._count.loans} امانت</span></div>)}</section>;
 })();
 return <main className="container page"><nav className="nav"><div><b>مدیریت کتابخانه</b><span className="muted">داشبورد مدیر</span></div><div className="navlinks"><Link href="/catalog">مشاهده سایت</Link><button className="btn secondary" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});location.href='/'}}>خروج</button></div></nav><div className="adminLayout"><aside className="card sidebar"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>نمای کلی</button><button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>درخواست‌ها ({pendingRequests.length})</button><button className={tab==='loans'?'active':''} onClick={()=>setTab('loans')}>امانت‌ها</button><button className={tab==='books'?'active':''} onClick={()=>setTab('books')}>کتاب‌ها ({books.length})</button><button className={tab==='users'?'active':''} onClick={()=>setTab('users')}>اعضا ({users.length})</button><Link className="sideLink" href="/admin/fines">جریمه‌ها</Link><Link className="sideLink" href="/admin/reservations">رزروها</Link><Link className="sideLink" href="/admin/reports">گزارش‌ها</Link><Link className="sideLink" href="/admin/categories">دسته‌بندی‌ها</Link><Link className="sideLink" href="/admin/authors">نویسندگان</Link><Link className="sideLink" href="/admin/audit">گزارش فعالیت‌ها</Link><Link className="sideLink" href="/admin/notifications">اعلان همگانی</Link><Link className="sideLink" href="/admin/settings">تنظیمات</Link></aside><section className="content">{error&&<div className="alert error" role="alert">{error}<button className="btn secondary" style={{marginInlineStart:8}} onClick={load}>تلاش دوباره</button></div>}{msg&&<div className="alert">{msg}</div>}{content}</section></div></main>
}
function Books({books,reload}:{books:any[],reload:()=>void}){const [form,setForm]=useState({title:'',author:'',totalStock:1,description:''}),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');async function add(){setBusy(true);const r=await fetch('/api/admin/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,totalStock:Number(form.totalStock)})});const d=await r.json();setMsg(d.error||'کتاب اضافه شد');if(r.ok){setForm({title:'',author:'',totalStock:1,description:''});reload()}setBusy(false)}return <section className="card pad"><h1>مدیریت کتاب‌ها</h1><div className="formGrid"><label>عنوان<input className="input" aria-label="عنوان کتاب" placeholder="عنوان" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>نویسنده<input className="input" aria-label="نویسنده کتاب" placeholder="نویسنده" value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></label><label>موجودی<input className="input" aria-label="موجودی کتاب" type="number" min="0" placeholder="موجودی" value={form.totalStock} onChange={e=>setForm({...form,totalStock:Number(e.target.value)})}/></label><label>توضیحات<input className="input" aria-label="توضیحات کتاب" placeholder="توضیحات" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="btn primary" disabled={busy} onClick={add}>افزودن کتاب</button></div>{msg&&<p className="muted">{msg}</p>}<div>{books.map(b=><div className="row" key={b.id}><div><b>{b.title}</b><small>{b.author} · {b.category?.name||'بدون دسته'}</small></div><span>{b.availableStock}/{b.totalStock}</span></div>)}</div></section>}
