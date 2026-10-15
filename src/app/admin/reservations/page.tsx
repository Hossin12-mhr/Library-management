'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function AdminReservations() {
  const [rows, setRows] = useState<any[]>([]); const [message, setMessage] = useState('');
  const load = async () => { const r = await fetch('/api/reservations'); const d = await r.json(); setRows(Array.isArray(d) ? d : []); };
  useEffect(() => { load(); }, []);
  async function fulfill(id: string) { const r = await fetch(`/api/admin/reservations/${id}/fulfill`, { method: 'POST' }); const d = await r.json(); setMessage(d.error || 'رزرو به امانت تبدیل شد'); if (r.ok) load(); }
  return <main className="container page"><nav className="nav"><div><b>رزروها</b><span className="muted">مدیریت صف رزرو</span></div><Link href="/admin" className="btn secondary">بازگشت به مدیریت</Link></nav><section className="card pad"><h1>صف رزرو کتاب‌ها</h1>{message && <div className="alert">{message}</div>}{rows.length === 0 ? <p className="muted">رزروی ثبت نشده است.</p> : rows.filter(r => r.status === 'WAITING').sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map(r => <div className="row" key={r.id}><div><b>{r.book.title}</b><small>{r.user.name} · {r.user.memberCode || r.user.email}</small></div><div className="alignEnd"><span className="badge">نوبت {r.position}</span>{r.position === 1 && <button className="btn primary" onClick={() => fulfill(r.id)}>تحویل و ثبت امانت</button>}</div></div>)}</section></main>;
}
