import { prisma } from '../src/lib/prisma';

async function main() {
  const books = await prisma.book.findMany({
    select: { id: true, title: true, totalStock: true, availableStock: true, copies: { select: { status: true } } },
  });
  const mismatches = books.flatMap((book) => {
    const availableCopies = book.copies.filter((copy) => copy.status === 'AVAILABLE').length;
    const issues: string[] = [];
    if (book.totalStock !== book.copies.length) issues.push(`totalStock=${book.totalStock} copies=${book.copies.length}`);
    if (book.availableStock !== availableCopies) issues.push(`availableStock=${book.availableStock} availableCopies=${availableCopies}`);
    return issues.length ? [{ id: book.id, title: book.title, issues }] : [];
  });
  if (mismatches.length) {
    console.error(JSON.stringify({ ok: false, mismatches }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(`Inventory check passed: ${books.length} books are consistent.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
