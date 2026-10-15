import './globals.css';
import { getLibraryConfig } from '@/lib/config';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getLibraryConfig();
  return {
    title: `${config.libraryName} | ${config.schoolName}`,
    description: `سامانه مدیریت ${config.libraryName} ${config.schoolName}`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getLibraryConfig();
  return (
    <html lang="fa" dir="rtl">
      <body style={{ ['--library-primary' as string]: config.primaryColor }}>
        {children}
      </body>
    </html>
  );
}
