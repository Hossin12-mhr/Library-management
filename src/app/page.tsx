import Link from 'next/link';
import { getLibraryConfig } from '@/lib/config';

export default async function Home() {
  const libraryConfig = await getLibraryConfig();

  return (
    <main>
      <header className="container" style={{ padding: '22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <strong>{libraryConfig.libraryName}</strong>
        <Link href="/catalog">فهرست کتاب‌ها</Link>
      </header>
      <section style={{ padding: '80px 0 100px', background: 'linear-gradient(135deg,#eef3ff,#fff)' }}>
        <div className="container">
          <span className="eyebrow">{libraryConfig.schoolName}</span>
          <h1 style={{ fontSize: 'clamp(38px,7vw,72px)', lineHeight: 1.15, margin: '18px 0' }}>کتاب مورد علاقه‌ات را پیدا کن و امانت بگیر.</h1>
          <p style={{ fontSize: 18, maxWidth: 700, lineHeight: 2 }}>جستجوی کتاب، درخواست امانت، پیگیری موعد بازگشت و مدیریت کامل کتابخانه در یک سامانهٔ یکپارچه.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Link className="btn primary" href="/login">ورود اعضا</Link>
            <Link className="btn secondary" href="/login?admin=1">ورود مدیر</Link>
            <Link className="btn secondary" href="/catalog">مشاهده کتاب‌ها</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
