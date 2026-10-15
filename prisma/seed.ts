import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@school.local';
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set ADMIN_SEED_PASSWORD to a password with at least 12 characters before running prisma db seed.');
  }
  const adminHash = await bcrypt.hash(password, 12);
  await p.user.upsert({
    where: { email },
    update: { role: 'ADMIN', name: 'مدیر کتابخانه' },
    create: { name: 'مدیر کتابخانه', email, passwordHash: adminHash, role: 'ADMIN' },
  });

  const cats = ['ادبیات', 'علمی', 'تاریخی', 'درسی'];
  for (const name of cats) await p.category.upsert({ where: { name }, update: {}, create: { name } });
  const data = [
    ['شازده کوچولو', 'آنتوان دو سنت اگزوپری', 'ادبیات', 5],
    ['کلیله و دمنه', 'نصرالله منشی', 'ادبیات', 3],
    ['تاریخ ایران', 'اثر نمونه', 'تاریخی', 4],
  ] as const;
  for (const [title, author, cat, total] of data) {
    const c = await p.category.findUniqueOrThrow({ where: { name: cat } });
    const authorRef = await p.author.upsert({ where: { name: author }, update: {}, create: { name: author } });
    await p.book.upsert({
      where: { isbn: `SEED-${title}` },
      update: {},
      create: { title, author, authorId: authorRef.id, isbn: `SEED-${title}`, categoryId: c.id, totalStock: total, availableStock: total, description: `معرفی کتاب ${title}` },
    });
    const book = await p.book.findUniqueOrThrow({ where: { isbn: `SEED-${title}` } });
    const existingCopies = await p.bookCopy.count({ where: { bookId: book.id } });
    if (existingCopies < total) await p.bookCopy.createMany({ data: Array.from({ length: total - existingCopies }, (_, i) => ({ bookId: book.id, code: `CP-SEED-${book.id}-${existingCopies + i + 1}` })) });
  }
  for (const [key, value] of [
    ['schoolName', 'مدرسه نمونه'], ['libraryName', 'کتابخانه هوشمند'], ['loanDays', '14'], ['dailyFine', '5000'], ['maxActiveLoans', '3'],
  ]) await p.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

main().finally(() => p.$disconnect());
