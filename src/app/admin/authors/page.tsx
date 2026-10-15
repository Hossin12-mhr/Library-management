'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Author = { id: string; name: string; _count?: { books: number } };

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/authors', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'خطا در دریافت نویسندگان');
      setAuthors(Array.isArray(d) ? d : []);
    } catch (e: any) { setMsg(e.message || 'خطا در دریافت نویسندگان'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setMsg('');
    const r = await fetch(editing ? `/api/authors/${editing}` : '/api/authors', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || 'عملیات ناموفق بود'); return; }
    setMsg(editing ? 'نویسنده ویرایش شد.' : 'نویسنده اضافه شد.');
    setName(''); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف نویسنده انجام شود؟')) return;
    const r = await fetch(`/api/authors/${id}`, { method: 'DELETE' });
    const d = await r.json();
    setMsg(d.error || 'نویسنده حذف شد.');
    if (r.ok) load();
  };

  return <main className="container page">
    <nav className="nav"><div><Link href="/admin"><b>مدیریت کتابخانه</b></Link><span className="muted"> / نویسندگان</span></div><Link className="btn secondary" href="/admin">بازگشت</Link></nav>
    <section className="card pad">
      <h1>{editing ? 'ویرایش نویسنده' : 'افزودن نویسنده'}</h1>
      <div className="inline">
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="نام نویسنده" maxLength={120} />
        <button className="btn primary" onClick={save} disabled={!name.trim()}>{editing ? 'ذخیره' : 'افزودن'}</button>
        {editing && <button className="btn secondary" onClick={() => { setEditing(null); setName(''); }}>انصراف</button>}
      </div>
      {msg && <div className="alert" role="status">{msg}</div>}
    </section>
    <section className="card pad">
      <div className="nav"><h2>فهرست نویسندگان</h2><span className="muted">{loading ? 'در حال بارگذاری…' : `${authors.length} نویسنده`}</span></div>
      {loading ? <p>در حال بارگذاری…</p> : authors.length === 0 ? <p className="muted">نویسنده‌ای ثبت نشده است.</p> : authors.map(a => <div className="row" key={a.id}><div><b>{a.name}</b><small>{a._count?.books || 0} کتاب</small></div><div className="actions"><button className="btn secondary" onClick={() => { setEditing(a.id); setName(a.name); }}>ویرایش</button><button className="btn secondary" onClick={() => remove(a.id)}>حذف</button></div></div>)}
    </section>
  </main>;
}
