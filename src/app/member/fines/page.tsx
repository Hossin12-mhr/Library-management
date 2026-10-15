'use client';
import { useEffect,useState } from 'react';
export default function Fines(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{fetch('/api/fines').then(r=>r.json()).then(setRows)},[]);return <main className="container"><h1>جریمه‌ها</h1><div className="list">{rows.map(f=><div className="card row" key={f.id}><div><b>{f.amount.toLocaleString('fa-IR')} تومان</b><small>{f.reason}</small></div><span>{f.status==='UNPAID'?'پرداخت‌نشده':f.status==='PAID'?'پرداخت‌شده':'بخشوده'}</span></div>)}{rows.length===0&&<div className="card">جریمه‌ای ندارید.</div>}</div></main>}
