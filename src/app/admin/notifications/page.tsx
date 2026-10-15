'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function AdminNotifications() {
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO', audience: 'ACTIVE' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    setMsg(r.ok ? `اعلان برای ${d.count} عضو ارسال شد.` : (d.error || 'خطا در ارسال اعلان'));
    if (r.ok) setForm({ title: '', message: '', type: 'INFO', audience: 'ACTIVE' });
    setBusy(false);
  }
  return <main className="container page"><nav className="nav"><div><b>اعلان همگانی</b><span className="muted">ارسال پیام به اعضای کتابخانه</span></div><Link className="btn secondary" href="/admin">بازگشت</Link></nav><form className="card form" onSubmit={submit}><label>عنوان<input className="input" maxLength={160} required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>پیام<textarea className="input" rows={6} maxLength={2000} required value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label><label>نوع<select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="INFO">اطلاع‌رسانی</option><option value="SUCCESS">موفقیت</option><option value="WARNING">هشدار</option><option value="ERROR">مهم</option></select></label><label>گیرندگان<select className="input" value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="ACTIVE">اعضای فعال</option><option value="ALL">همه اعضا</option></select></label><button className="btn primary" disabled={busy}>{busy?'در حال ارسال…':'ارسال اعلان'}</button>{msg&&<div className="alert">{msg}</div>}</form></main>;
}
