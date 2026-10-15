import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

const rawSecret = process.env.AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && (!rawSecret || rawSecret.length < 32)) {
  throw new Error('AUTH_SECRET must be set to a 32+ character secret in production');
}
const secret = new TextEncoder().encode(rawSecret || 'development-only-secret-change-me-please-32');
const COOKIE_NAME = 'library_session';

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, sessionVersion: true, active: true } });
  if (!user || !user.active) throw new Error('USER_NOT_FOUND');
  return new SignJWT({ userId, role: user.role, sessionVersion: user.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function setSession(userId: string) {
  const token = await createSession(userId);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== 'string') return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) return null;
    if (typeof payload.sessionVersion !== 'number' || payload.sessionVersion !== user.sessionVersion) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireRole(role: 'ADMIN' | 'MEMBER') {
  const user = await getCurrentUser();
  if (!user || user.role !== role) throw new Error('UNAUTHORIZED');
  return user;
}
