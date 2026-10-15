import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const reservationCancel = path.join(root, 'src/app/api/reservations/[id]/route.ts');
const reservationFulfill = path.join(root, 'src/app/api/admin/reservations/[id]/fulfill/route.ts');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
if (!/^  app:\n/m.test(compose) || !/^  postgres:\n/m.test(compose) || !/^volumes:\n/m.test(compose)) {
  throw new Error('docker-compose.yml service/volume structure is invalid');
}
if (!/healthcheck:\n(?:.|\n)*127\.0\.0\.1:3000\/api\/health/.test(compose)) {
  throw new Error('docker-compose.yml app healthcheck is missing');
}
console.log('Docker Compose production structure audit: PASS');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageJson.engines?.node !== '>=22.0.0 <23') {
  throw new Error('package.json must declare Node.js >=22.0.0 for the production runtime.');
}
if (!packageJson.engines?.npm) {
  throw new Error('package.json must declare a supported npm engine.');
}
const dockerNode = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
if (!/^FROM node:22-alpine/m.test(dockerNode)) {
  throw new Error('Dockerfile must use the supported Node.js 22 Alpine runtime.');
}
console.log('Runtime version alignment audit: PASS');

const required = [
  '.npmrc',
  'package.json', 'prisma/schema.prisma', 'prisma/seed.ts',
  'src/lib/auth.ts', 'src/lib/security.ts', 'src/lib/transaction.ts', 'src/middleware.ts',
  'src/app/catalog/page.tsx', 'src/app/member/page.tsx', 'src/app/admin/page.tsx',
  'src/app/api/health/route.ts', 'src/app/api/health/ready/route.ts',
  'src/app/api/admin/loans/lookup/route.ts',
  'src/app/api/admin/books/[id]/copies/[copyId]/route.ts',
  'src/app/api/admin/inventory/health/route.ts',
  'src/app/api/authors/route.ts', 'src/app/api/authors/[id]/route.ts', 'src/app/admin/authors/page.tsx',
];
const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
const forbidden = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/fake|mock|TODO:\s*fake/i.test(text)) forbidden.push(path.relative(root, full));
    }
  }
}
walk(path.join(root, 'src'));
if (forbidden.length) {
  console.error('Potential fake/mock markers:', forbidden.join(', '));
  process.exit(1);
}
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
if (!/model\s+BookCopy\s+\{/.test(schema) || !/model\s+MemberProfile\s+\{/.test(schema) || !/model\s+Author\s+\{/.test(schema)) {
  console.error('Inventory, member-profile, or author domain model missing.');
  process.exit(1);
}
if (!/sessionVersion\s+Int\s+@default\(0\)/.test(schema)) {
  console.error('Session invalidation field missing from User model.');
  process.exit(1);
}
const auth = fs.readFileSync(path.join(root, 'src/lib/auth.ts'), 'utf8');
if (!auth.includes('const rawSecret = process.env.AUTH_SECRET') || !auth.includes('(!rawSecret || rawSecret.length < 32)')) {
  console.error('Production authentication secret must be mandatory and length-validated.');
  process.exit(1);
}
if (!auth.includes('sessionVersion') || !auth.includes('!user.active')) {
  console.error('Session invalidation/active-user checks missing from auth.');
  process.exit(1);
}
const copyMutation = fs.readFileSync(path.join(root, 'src/app/api/admin/books/[id]/copies/[copyId]/route.ts'), 'utf8');
if (!copyMutation.includes("requireRole('ADMIN')") || !copyMutation.includes('assertSameOrigin') || !copyMutation.includes('serializable')) {
  console.error('Book-copy mutation endpoint is not sufficiently protected.');
  process.exit(1);
}
const lookup = fs.readFileSync(path.join(root, 'src/app/api/admin/loans/lookup/route.ts'), 'utf8');
if (!lookup.includes("requireRole('ADMIN')") || !lookup.includes('no-store') || !lookup.includes('valid: false')) {
  console.error('Admin loan-code verification endpoint is not sufficiently protected.');
  process.exit(1);
}
const inventoryHealth = fs.readFileSync(path.join(root, 'src/app/api/admin/inventory/health/route.ts'), 'utf8');
if (!inventoryHealth.includes("requireRole('ADMIN')") || !inventoryHealth.includes('no-store') || !inventoryHealth.includes('mismatchCount')) {
  console.error('Inventory health endpoint is not sufficiently protected.');
  process.exit(1);
}

const privateApiPaths = [
  'src/app/api/requests/route.ts',
  'src/app/api/reservations/route.ts',
  'src/app/api/fines/route.ts',
  'src/app/api/notifications/route.ts',
  'src/app/api/loans/route.ts',
  'src/app/api/auth/me/route.ts',
];
for (const p of privateApiPaths) {
  const text = fs.readFileSync(path.join(root, p), 'utf8');
  if (!text.includes('force-dynamic') && !text.includes('no-store')) {
    console.error(`Private API cache protection missing: ${p}`);
    process.exit(1);
  }
}

console.log(`Project audit passed: ${required.length} required files present.`);

const bookRoute = fs.readFileSync(path.join(root, 'src/app/api/admin/books/[id]/route.ts'), 'utf8');
if (!bookRoute.includes("tx.bookCopy.count({where:{bookId:id,status:'AVAILABLE'}})") || !bookRoute.includes('nonAvailableCopies')) {
  console.error('Book update inventory reconciliation is missing.');
  process.exit(1);
}
console.log('Inventory reconciliation audit: PASS');

const authorMutation = fs.readFileSync(path.join(root, 'src/app/api/authors/[id]/route.ts'), 'utf8');
if (!authorMutation.includes("requireRole('ADMIN')") || !authorMutation.includes('assertSameOrigin') || !authorMutation.includes('DELETE')) {
  console.error('Author mutation endpoint is not sufficiently protected.');
  process.exit(1);
}
const publicBooks = fs.readFileSync(path.join(root, 'src/app/api/books/route.ts'), 'utf8');
if (!publicBooks.includes('authorId') || !publicBooks.includes('categoryId')) {
  console.error('Public catalog author/category filtering is missing.');
  process.exit(1);
}
console.log('Author management and catalog filtering audit: PASS');

const adminPage = fs.readFileSync(path.join(root, 'src/app/admin/page.tsx'), 'utf8');
if (!adminPage.includes("data[3] as ListResponse<any>") || !adminPage.includes("data[4] as ListResponse<any>") || !adminPage.includes("data[5] as ListResponse<any>")) { console.error('Admin dashboard must unwrap paginated list APIs.'); process.exit(1); }
const checkout = fs.readFileSync(path.join(root, 'src/app/api/requests/[id]/checkout/route.ts'), 'utf8');
if (!checkout.includes("if (!copy) return { error: 'نسخه فیزیکی قابل تحویل پیدا نشد؛ ابتدا موجودی کتاب را بررسی کنید', status: 409 }")) { console.error('Checkout must require a physical copy.'); process.exit(1); }

const fineRoute = fs.readFileSync(path.join(root, 'src/app/api/admin/fines/route.ts'), 'utf8');
if (!fineRoute.includes('totalPages') || !fineRoute.includes('status: z.enum') || !fineRoute.includes('no-store')) {
  console.error('Admin fine listing must support bounded pagination, status filtering, and private caching.'); process.exit(1);
}
const finePage = fs.readFileSync(path.join(root, 'src/app/admin/fines/page.tsx'), 'utf8');
if (!finePage.includes('صفحه قبل') || !finePage.includes('صفحه بعد') || !finePage.includes('در حال بارگذاری')) {
  console.error('Admin fine page must expose pagination and loading states.'); process.exit(1);
}
console.log('Admin fine pagination audit: PASS');

const notificationsApi = fs.readFileSync(path.join(root, 'src/app/api/notifications/route.ts'), 'utf8');
const notificationsPage = fs.readFileSync(path.join(root, 'src/app/member/notifications/page.tsx'), 'utf8');
if (!notificationsApi.includes("body.id") || !notificationsApi.includes("userId:u.id")) throw new Error('Member notification ownership check missing');
if (!notificationsPage.includes('markRead') || !notificationsPage.includes('خواندم')) throw new Error('Individual notification read action missing');
console.log('Member notification read audit: PASS');
const config = fs.readFileSync(path.join(root, 'src/lib/config.ts'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const settingsRoute = fs.readFileSync(path.join(root, 'src/app/api/admin/settings/route.ts'), 'utf8');
if (!config.includes('https?:') || !config.includes('Number.isInteger') || !config.includes('defaultLibraryConfig')) throw new Error('Library config must validate persisted settings and provide safe defaults');
if (!layout.includes('generateMetadata') || !layout.includes('config.libraryName') || !layout.includes('config.schoolName')) throw new Error('Dynamic library branding metadata is missing');
if (!settingsRoute.includes('http(s)') && !settingsRoute.includes('https?:')) throw new Error('Settings logo URL protocol validation is missing');
console.log('Library branding and settings validation audit: PASS');

const schemaText = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
if (!schemaText.includes('@@index([dueDate,status])') || !schemaText.includes('@@index([userId,createdAt])')) throw new Error('Operational query indexes are missing');
const nextConfig = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');
for (const header of ['X-DNS-Prefetch-Control', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Strict-Transport-Security']) {
  if (!nextConfig.includes(header)) throw new Error(`Security header missing: ${header}`);
}
console.log('Production headers and operational indexes audit: PASS');

const cronFines = fs.readFileSync(path.join(root, 'src/app/api/jobs/fines/route.ts'), 'utf8');
if (cronFines.includes("update:{amount,status:'UNPAID'}")) throw new Error('Fine job must not reopen paid or waived fines.');
const cronNotifications = fs.readFileSync(path.join(root, 'src/app/api/jobs/notifications/route.ts'), 'utf8');
for (const [name, text] of [['fines', cronFines], ['notifications', cronNotifications]]) {
  if (!text.includes('export async function POST')) throw new Error(`Cron ${name} job must use POST`);
  if (text.includes('export async function GET')) throw new Error(`Cron ${name} job must not expose GET side effects`);
  if (!text.includes('no-store')) throw new Error(`Cron ${name} response must disable caching`);
}
console.log('Cron endpoint hardening audit: PASS');

const health = fs.readFileSync(path.join(root, 'src/app/api/health/route.ts'), 'utf8');
const readiness = fs.readFileSync(path.join(root, 'src/app/api/health/ready/route.ts'), 'utf8');
if (!health.includes("service: 'school-library'") || !health.includes('no-store') || health.includes('prisma.')) {
  console.error('Liveness health endpoint must stay dependency-light and uncached.');
  process.exit(1);
}
if (!readiness.includes('prisma.$queryRaw') || !readiness.includes("status: 'not_ready'") || !readiness.includes('no-store')) {
  console.error('Readiness endpoint must verify database connectivity and disable caching.');
  process.exit(1);
}
console.log('Health and readiness audit: PASS');

const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
if (!dockerfile.includes('adduser --system') || !dockerfile.includes('USER nextjs') || !dockerfile.includes('--chown=nextjs:nodejs')) {
  console.error('Production Docker runner must use a non-root user and owned application files.');
  process.exit(1);
}
console.log('Non-root Docker runner audit: PASS');


const configPreflight = fs.readFileSync(path.join(root, 'scripts/config-preflight.mjs'), 'utf8');
if (!configPreflight.includes("DATABASE_URL") || !configPreflight.includes('AUTH_SECRET') || !configPreflight.includes('CRON_SECRET')) {
  console.error('Configuration preflight must validate required environment secrets.');
  process.exit(1);
}
console.log('Configuration preflight audit: PASS');
const businessTests = fs.readFileSync(path.join(root, 'tests/business.test.ts'), 'utf8');
if (!businessTests.includes('function read(relativePath:string)')) throw new Error('Business test helper is missing.');
if (!businessTests.includes('loanCodeLooksValid')) throw new Error('Business test coverage for loan codes is missing.');
console.log('Business test harness audit: PASS');
const pkgContract = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (pkgContract.engines?.node !== '>=22.0.0 <23' || !readme.includes('Node.js 22.x')) {
  console.error('README/runtime version contract is out of sync with package.json.'); process.exit(1);
}
console.log('README/runtime contract audit: PASS');
const reservationFulfillText = fs.readFileSync(path.join(root, 'src/app/api/admin/reservations/[id]/fulfill/route.ts'), 'utf8');
if (!reservationFulfillText.includes("if (!copy) return { error: 'نسخه فیزیکی قابل تحویل پیدا نشد؛ ابتدا موجودی کتاب را بررسی کنید', status: 409 }")) {
  console.error('Reservation fulfillment must reject missing physical copies.'); process.exit(1);
}
console.log('Reservation physical-copy invariant audit: PASS');


for (const file of [reservationCancel, reservationFulfill]) {
  const text = fs.readFileSync(file, 'utf8');
  if (/100000\s*\+\s*index/.test(text)) forbidden.push(path.relative(root, file));
}

const nestedLegacyProject = path.join(root, 'school-library');
if (fs.existsSync(path.join(nestedLegacyProject, 'package.json')) || fs.existsSync(path.join(nestedLegacyProject, 'app'))) {
  console.error('Legacy nested school-library project must not ship inside the final project.'); process.exit(1);
}
console.log('Final project structure audit: PASS');
