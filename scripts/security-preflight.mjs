import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src', 'app', 'api');
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry === 'route.ts') files.push(full);
  }
}
walk(root);
const failures = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const methods = ['POST','PUT','PATCH','DELETE'].filter(m => new RegExp(`(?:async\\s+)?function\\s+${m}\\b`).test(text));
  if (!methods.length) continue;
  const isJob = file.includes(`${join('api','jobs')}${join('')}`) || file.includes('/api/jobs/');
  if (!isJob && !text.includes('assertSameOrigin')) failures.push(`${file}: mutation route missing same-origin protection`);
  const isPublicAuth = file.includes('/api/auth/login/') || file.includes('/api/auth/register/') || file.includes('/api/auth/logout/');
  if (!isJob && !isPublicAuth && !text.includes('getCurrentUser') && !text.includes('requireRole')) failures.push(`${file}: mutation route has no visible server authorization guard`);
  const privateDataApi = ['/api/requests/route.ts','/api/reservations/route.ts','/api/fines/route.ts','/api/notifications/route.ts','/api/loans/route.ts'].some(p => file.endsWith(p)) || file.endsWith('/api/auth/me/route.ts');
  if (privateDataApi && !text.includes("force-dynamic") && !text.includes("no-store")) failures.push(`${file}: private data API must opt out of caching`);
  const isAdminApi = file.includes('/api/admin/');
  if (isAdminApi && !text.includes("requireRole('ADMIN')")) failures.push(`${file}: admin API route missing explicit ADMIN authorization guard`);
  if (/console\.log\(/.test(text)) failures.push(`${file}: console.log found in API route`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
const cronRoutes = ['src/app/api/jobs/fines/route.ts','src/app/api/jobs/notifications/route.ts'];
for (const p of cronRoutes) {
  const text = readFileSync(join(process.cwd(), p), 'utf8');
  if (!text.includes('export async function POST')) failures.push(`${p}: cron endpoint must expose POST`);
  if (text.includes('export async function GET')) failures.push(`${p}: cron endpoint must not expose GET side effects`);
  if (!text.includes('no-store')) failures.push(`${p}: cron response must disable caching`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Security preflight passed: ${files.length} API routes scanned.`);
