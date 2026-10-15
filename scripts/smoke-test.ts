import assert from 'node:assert/strict';

function calculateLateDays(now: Date, due: Date) {
  return Math.max(0, Math.ceil((now.getTime() - due.getTime()) / 86400000));
}
function calculateFine(days: number, dailyRate: number) { return Math.max(0, days) * Math.max(0, dailyRate); }

const base = new Date('2026-09-10T10:00:00Z');
assert.equal(calculateLateDays(base, new Date('2026-09-10T10:00:00Z')), 0);
assert.equal(calculateLateDays(new Date('2026-09-12T10:00:00Z'), new Date('2026-09-10T10:00:00Z')), 2);
assert.equal(calculateFine(3, 5000), 15000);
assert.equal(calculateFine(0, 5000), 0);
console.log('Smoke tests passed.');
