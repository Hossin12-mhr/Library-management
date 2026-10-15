import fs from "node:fs";
import path from "node:path";

function read(relativePath:string){return fs.readFileSync(path.join(process.cwd(),relativePath),"utf8");}

import assert from "node:assert/strict";

function fineDays(due:Date, at:Date){return Math.max(0,Math.ceil((at.getTime()-due.getTime())/86400000));}
function fineAmount(days:number, rate:number){return days*rate;}

const now=new Date("2026-01-10T00:00:00Z");
assert.equal(fineDays(new Date("2026-01-09T00:00:00Z"),now),1);
assert.equal(fineDays(new Date("2026-01-10T00:00:00Z"),now),0);
assert.equal(fineAmount(4,15000),60000);

function nextPosition(positions:number[]){return positions.length?Math.max(...positions)+1:1;}
assert.equal(nextPosition([]),1);
assert.equal(nextPosition([1,2,7]),8);

function remainingStock(total:number,available:number){return Math.max(0,Math.min(total,available));}
assert.equal(remainingStock(5,3),3);
assert.equal(remainingStock(5,-2),0);

console.log("business tests passed");

function queuePositionAfterCancellation(waiting:number[], cancelled:number){
  return waiting.filter((p)=>p!==cancelled).map((_,i)=>i+1);
}
assert.deepEqual(queuePositionAfterCancellation([1,2,3],2),[1,2]);
assert.deepEqual(queuePositionAfterCancellation([1],1),[]);
function compactQueueAfterRemoval(positions:number[], removed:number){
  const remaining=positions.filter((p)=>p!==removed).sort((a,b)=>a-b);
  return remaining.map((_,i)=>i+1);
}
assert.deepEqual(compactQueueAfterRemoval([1,2,3,4],2),[1,2,3]);
assert.deepEqual(compactQueueAfterRemoval([1,100000,100001],1),[1,2]);


function activeLoanAllowed(active:number,max:number){return active < max;}
assert.equal(activeLoanAllowed(2,3),true);
assert.equal(activeLoanAllowed(3,3),false);
assert.equal(activeLoanAllowed(0,1),true);
assert.equal(activeLoanAllowed(1,1),false);

function normalizedStock(total:number, available:number){
  if (total < 0) return 0;
  return Math.max(0, Math.min(total, available));
}
assert.equal(normalizedStock(10, 12),10);
assert.equal(normalizedStock(10, -1),0);
assert.equal(normalizedStock(-1, 4),0);

function loanCodeLooksValid(code:string){return /^LN-[A-Z0-9]{10}$/.test(code);}
assert.equal(loanCodeLooksValid("LN-ABC1234567"),true);
assert.equal(loanCodeLooksValid("loan-123"),false);


assert(/bookCopy\.findFirst\(\{ where: \{ bookId: reservation\.bookId, status: 'AVAILABLE' \}/.test(read('src/app/api/admin/reservations/[id]/fulfill/route.ts')), 'reservation fulfillment must assign a physical copy');
assert(!/copyId: copy\?\.id/.test(read('src/app/api/admin/reservations/[id]/fulfill/route.ts')), 'fulfilled reservation loan must not allow a missing physical copy');
assert(/if \(!copy\) return \{ error: 'نسخه فیزیکی قابل تحویل پیدا نشد/.test(read('src/app/api/admin/reservations/[id]/fulfill/route.ts')), 'fulfilled reservation must reject when no physical copy is available');
assert(/copyId: copy\.id/.test(read('src/app/api/admin/reservations/[id]/fulfill/route.ts')), 'fulfilled reservation loan must reference the assigned copy');

assert(!read('src/lib/auth.ts').includes("process.env.AUTH_SECRET ||"), 'Production auth must not silently fall back to a shared secret.');
assert(!read('src/app/api/jobs/fines/route.ts').includes("update:{amount,status:'UNPAID'}"), 'Fine job must not reopen settled fines.');
