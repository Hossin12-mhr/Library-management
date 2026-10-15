import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationRoot = path.join(root, 'prisma', 'migrations');
const lock = path.join(migrationRoot, 'migration_lock.toml');
if (!fs.existsSync(lock)) throw new Error('Prisma migration_lock.toml is missing');
const dirs = fs.readdirSync(migrationRoot, { withFileTypes: true })
  .filter((x) => x.isDirectory())
  .map((x) => x.name)
  .sort();
if (!dirs.length) throw new Error('No committed Prisma migrations found');
for (const dir of dirs) {
  const sql = path.join(migrationRoot, dir, 'migration.sql');
  if (!fs.existsSync(sql)) throw new Error(`Migration SQL missing: ${dir}`);
  const text = fs.readFileSync(sql, 'utf8');
  if (!text.includes('CREATE TABLE "User"') || !text.includes('CREATE TABLE "Book"')) {
    throw new Error(`Baseline migration does not contain core tables: ${dir}`);
  }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.scripts?.['db:deploy'] !== 'prisma migrate deploy') throw new Error('db:deploy script is not configured for Prisma deploy');
console.log(`Release preflight passed: ${dirs.length} committed migration(s).`);
