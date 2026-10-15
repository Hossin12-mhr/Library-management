import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
const rawSecret = process.env.AUTH_SECRET;
const secret = new TextEncoder().encode(rawSecret || 'development-only-secret');
export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && (!rawSecret || rawSecret.length < 32)) return NextResponse.json({error:'AUTH_SECRET is not configured securely'},{status:500});
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/admin') && !path.startsWith('/member')) return NextResponse.next();
  const token = req.cookies.get('library_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role;
    if (path.startsWith('/admin') && role !== 'ADMIN') return NextResponse.redirect(new URL('/member', req.url));
    if (path.startsWith('/member') && role !== 'MEMBER') return NextResponse.redirect(new URL('/admin', req.url));
    return NextResponse.next();
  } catch { return NextResponse.redirect(new URL('/login', req.url)); }
}
export const config = { matcher: ['/admin/:path*', '/member/:path*'] };
