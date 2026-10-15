import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const books = await prisma.book.findMany({ select: { id: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5000 });
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/register`, changeFrequency: 'monthly', priority: 0.5 },
    ...books.map(book => ({ url: `${base}/book/${book.id}`, lastModified: book.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
}
