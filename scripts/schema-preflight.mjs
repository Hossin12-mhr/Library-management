import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const checks = [
  ['User session invalidation', /sessionVersion\s+Int\s+@default\(0\)/],
  ['Reservation nullable queue position', /model Reservation[\s\S]*?position Int\?/],
  ['Reservation queue uniqueness', /@@unique\(\[bookId,position\]\)/],
  ['Notification dedupe key', /dedupeKey String\? @unique/],
  ['Restrictive history relations', /user User @relation\(fields:\[userId\], references:\[id\], onDelete:Restrict\)/],
];
const missing = checks.filter(([, re]) => !re.test(schema)).map(([name]) => name);
if (missing.length) {
  console.error('Schema preflight failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
console.log('Schema preflight passed.');
