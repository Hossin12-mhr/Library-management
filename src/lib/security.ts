import { prisma } from './prisma';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function enforceRateLimit(key: string, max = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt <= now) {
    if (row) {
      const reset = await prisma.rateLimit.updateMany({ where: { key, resetAt: row.resetAt }, data: { count: 1, resetAt } });
      if (reset.count) return { allowed: true, remaining: max - 1 };
    } else {
      try { await prisma.rateLimit.create({ data: { key, count: 1, resetAt } }); return { allowed: true, remaining: max - 1 }; } catch { /* concurrent creator retries below */ }
    }
    return enforceRateLimit(key, max, windowMs);
  }
  if (row.count >= max) return { allowed: false, remaining: 0, retryAfter: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
  const updated = await prisma.rateLimit.updateMany({ where: { key, count: row.count }, data: { count: { increment: 1 } } });
  if (!updated.count) return enforceRateLimit(key, max, windowMs);
  return { allowed: true, remaining: max - row.count - 1 };
}

export function clientKey(req: Request, suffix: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${suffix}:${ip}`;
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  try { return new URL(origin).host === host; } catch { return false; }
}
