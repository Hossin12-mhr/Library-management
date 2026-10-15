'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

export default function Audit(){
 const [logs,setLogs]=useState<any[]>([]),[page,setPage]=useState(1),[totalPages,setTotalPages]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(p=page){setLoading(true);setError('');try{const r=await fetch(`/api/admin/audit?page=${p}&pageSize=50`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'خطا');setLogs(d.items||[]);setTotalPages(d.pagination?.totalPages||1)}catch(e:any){setError(e.message||'خطا در دریافت گزارش')}finally{setLoading(false)}}
 useEffect(()=>{load(1)},[]);
 return <main className="container page"><nav className="nav"><b>گزارش فعالیت‌ها</b><Link className="btn secondary" href="/admin">بازگشت</Link></nav><section className="card pad">{error?<div className="alert error" role="alert">{error}</div>:loading?<p>در حال بارگذاری…</p>:logs.length===0?<p className="muted">گزارشی ثبت نشده است.</p>:logs.map(x=><div className="row" key={x.id}><div><b>{x.action}</b><small>{x.entity}{x.entityId?` · ${x.entityId}`:''} · {x.user?.name||'سیستم'}</small></div><time>{new Date(x.createdAt).toLocaleString('fa-IR')}</time></div>)}<div className="actions" style={{marginTop:16,justifyContent:'space-between'}}><button className="btn secondary" disabled={page<=1||loading} onClick={()=>{const p=page-1;setPage(p);load(p)}}>صفحه قبل</button><span>صفحه {page} از {totalPages}</span><button className="btn secondary" disabled={page>=totalPages||loading} onClick={()=>{const p=page+1;setPage(p);load(p)}}>صفحه بعد</button></div></section></main>
}
