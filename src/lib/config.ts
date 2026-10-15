import { prisma } from './prisma';

export const defaultLibraryConfig = {
  schoolName: 'مدرسه نمونه',
  logoUrl: '',
  primaryColor: '#2563eb',
  libraryName: 'کتابخانه هوشمند',
  loanDays: 14,
  dailyFine: 5000,
  maxActiveLoans: 3,
} as const;

function positiveInt(value: string | undefined, fallback: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
}

export async function getLibraryConfig() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(defaultLibraryConfig) } } });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(values.primaryColor ?? '') ? values.primaryColor! : defaultLibraryConfig.primaryColor;
  const logoUrl = values.logoUrl && /^https?:\/\//i.test(values.logoUrl) ? values.logoUrl : defaultLibraryConfig.logoUrl;
  return {
    schoolName: values.schoolName?.trim() || defaultLibraryConfig.schoolName,
    logoUrl,
    primaryColor,
    libraryName: values.libraryName?.trim() || defaultLibraryConfig.libraryName,
    loanDays: positiveInt(values.loanDays, defaultLibraryConfig.loanDays, 365) || defaultLibraryConfig.loanDays,
    dailyFine: positiveInt(values.dailyFine, defaultLibraryConfig.dailyFine, 1000000),
    maxActiveLoans: positiveInt(values.maxActiveLoans, defaultLibraryConfig.maxActiveLoans, 20) || defaultLibraryConfig.maxActiveLoans,
  };
}
