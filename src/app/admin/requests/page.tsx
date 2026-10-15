'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type Item={id:string,status:string,code?:string,book:{title:string},user:{name:string,email:string,memberCode?:string}};
export default function Requests(){
 const [items,setItems]=useState<Item[]>([]),[msg,setMsg]=useState(''),[busy,setBusy]=useState('');
 const load=async()=>{const r=await fetch('/api/requests',{cache:'no-store'});if(r.status===401){location.href='/login';return}const d=await r.json();setItems(Array.isArray(d)?d:[])};
 useEffect(()=>{load()},[]);
 async function act(id:string,path:string,body?:object){setBusy(id+path);const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});const d=await r.json();setMsg(r.ok?(d.message||'عملیات با موفقیت انجام شد'):(d.error||'عملیات ناموفق بود'));setBusy('');load()}
 return <main className='container page'><nav className='nav'><div><b>درخواست‌های امانت</b><span className='muted'>مدیریت درخواست اعضا و تحویل کتاب</span></div><Link className='btn secondary' href='/admin'>بازگشت</Link></nav><section className='card pad'>{msg&&<div className='alert'>{msg}</div>}<h1>درخواست‌ها</h1>{items.length===0?<p className='muted'>درخواستی ثبت نشده است.</p>:items.map(x=><div className='row' key={x.id}><div><b>{x.book.title}</b><small>{x.user.name} · {x.user.email} · کد عضو: {x.user.memberCode||'—'}</small><small>کد درخواست: {x.code||'—'}</small></div><div className='actions'>{x.status==='PENDING'?<><button disabled={!!busy} className='btn primary' onClick={()=>act(x.id,`/api/requests/${x.id}/review`,{action:'APPROVE'})}>تأیید</button><button disabled={!!busy} className='btn secondary' onClick={()=>act(x.id,`/api/requests/${x.id}/review`,{action:'REJECT'})}>رد</button></>:x.status==='APPROVED'?<button disabled={!!busy} className='btn primary' onClick={()=>act(x.id,`/api/requests/${x.id}/checkout`)}>ثبت تحویل کتاب</button>:<span className={'badge '+(x.status==='DELIVERED'?'ok':'')}>{x.status==='DELIVERED'?'تحویل‌شده':x.status}</span>}</div></div>)}</section></main> }
