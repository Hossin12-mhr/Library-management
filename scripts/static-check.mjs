import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const rel = path.relative(root, full);
      if (/\b(?:users|books|requests|loans|reservations)\s*\(/.test(text)) {
        failures.push(`${rel}: suspicious collection call; use .map/.filter/.find/etc.`);
      }
      if (/password\s*[:=]\s*['"][^'"]+['"]/i.test(text) && !/development-only-secret/i.test(text)) {
        failures.push(`${rel}: possible hard-coded password`);
      }
    }
  }
}

walk(path.join(root, 'src'));
if (failures.length) {
  console.error('Static preflight failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Static preflight passed.');
