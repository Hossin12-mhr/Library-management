'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="container page"><section className="card pad narrow"><h1>خطایی رخ داد</h1><p className="muted">مشکلی در نمایش این صفحه پیش آمد. دوباره تلاش کنید.</p><button className="btn primary" onClick={()=>reset()}>تلاش دوباره</button></section></main>}
