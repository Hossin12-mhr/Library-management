import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['DATABASE_URL', 'AUTH_SECRET', 'NEXT_PUBLIC_APP_URL', 'CRON_SECRET', 'ADMIN_SEED_EMAIL', 'ADMIN_SEED_PASSWORD'];
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const keys = new Set([...envExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
const missing = required.filter((key) => !keys.has(key));
if (missing.length) throw new Error(`.env.example is missing required keys: ${missing.join(', ')}`);

const authLine = envExample.match(/^AUTH_SECRET="?([^"\n]*)/m)?.[1] ?? '';
const cronLine = envExample.match(/^CRON_SECRET="?([^"\n]*)/m)?.[1] ?? '';
const seedPassword = envExample.match(/^ADMIN_SEED_PASSWORD="?([^"\n]*)/m)?.[1] ?? '';
if (!authLine || authLine.length < 32) throw new Error('AUTH_SECRET example must document a secret of at least 32 characters.');
if (!cronLine || cronLine.length < 16) throw new Error('CRON_SECRET example must document a non-trivial secret.');
if (!seedPassword || seedPassword.length < 12) throw new Error('ADMIN_SEED_PASSWORD example must be at least 12 characters.');

const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
for (const key of required) {
  if (!compose.includes(`${key}:`)) throw new Error(`docker-compose.yml is missing ${key}.`);
}
if (!compose.includes('change-this-to-a-random-32-character-secret')) throw new Error('Compose AUTH_SECRET placeholder is missing; keep an explicit production replacement point.');
if (!compose.includes('change-this-cron-secret')) throw new Error('Compose CRON_SECRET placeholder is missing; keep an explicit production replacement point.');

const trackedSecretFiles = ['.env', '.env.local', '.env.production', '.env.development']
  .filter((file) => fs.existsSync(path.join(root, file)));
if (trackedSecretFiles.length) throw new Error(`Secret-bearing env files must not be packaged: ${trackedSecretFiles.join(', ')}`);

console.log('Configuration preflight: PASS');
console.log('Required environment keys, secret minimums, compose placeholders, and secret-file hygiene are valid.');
