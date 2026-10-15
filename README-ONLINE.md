# اجرای آنلاین بدون نصب Node.js / PostgreSQL / Docker

این نسخه برای ساده‌ترین تست آنلاین با Vercel + Neon آماده شده است.

## مسیر پیشنهادی

1. یک حساب Vercel بسازید.
2. یک دیتابیس Neon از Vercel Marketplace به پروژه وصل کنید.
3. فایل پروژه را با Vercel Drop آپلود کنید.
4. متغیرهای محیطی را تنظیم کنید.
5. Deploy را بزنید.

Vercel برای Next.js پشتیبانی مستقیم دارد و Vercel Drop اجازه می‌دهد پروژه را با Drag & Drop بدون Git یا نصب محلی Deploy کنید.

## متغیرهای محیطی

این موارد را در Production تنظیم کنید:

```env
DATABASE_URL=<connection string از Neon>
AUTH_SECRET=<یک رشته تصادفی حداقل 32 کاراکتری>
CRON_SECRET=<یک رشته تصادفی>
NEXT_PUBLIC_APP_URL=<آدرس نهایی Vercel>
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=<رمز حداقل 12 کاراکتری>
```

## Build آنلاین

`vercel.json` دستور زیر را برای Build استفاده می‌کند:

```bash
npm run vercel-build
```

این دستور به ترتیب:

1. Prisma Client را می‌سازد.
2. Schema را روی PostgreSQL قرار می‌دهد (`prisma db push`).
3. کاربر مدیر اولیه، دسته‌بندی‌ها، کتاب‌های نمونه و تنظیمات اولیه را ایجاد می‌کند.
4. Next.js را Build می‌کند.

Seed طوری تنظیم شده که در Deployهای بعدی رمز مدیر موجود را بازنویسی نکند.

## نکته امنیتی

`.env` و secretها را داخل فایل ZIP/GitHub قرار ندهید. فقط در Vercel Environment Variables وارد کنید.

## بعد از Deploy

این آدرس‌ها را تست کنید:

- `/`
- `/catalog`
- `/register`
- `/login`
- `/member`
- `/admin`
- `/api/health`

ورود مدیر با `ADMIN_SEED_EMAIL` و `ADMIN_SEED_PASSWORD` انجام می‌شود.

## اجرای خودکار جریمه و یادآوری

در `vercel.json` دو Cron روزانه تعریف شده است:
- `/api/jobs/fines` برای بررسی امانت‌های عقب‌افتاده و ثبت جریمه
- `/api/jobs/notifications` برای یادآوری سررسیدهای نزدیک

Vercel Cron باید در پروژه فعال باشد و `CRON_SECRET` در Environment Variables تنظیم شده باشد. مسیرها علاوه بر Cron، با درخواست `POST` نیز قابل اجرای دستی هستند.

## نکته مهم درباره تست اولیه

این بسته برای **دموی سریع آنلاین** تنظیم شده است. Build اولیه با `prisma db push` و `prisma db seed` دیتابیس را آماده می‌کند. برای پروژه‌ای که بعداً داده واقعی و حساس داشته باشد، بهتر است قبل از Production نهایی، migrationهای Prisma جایگزین `db push` شوند و seed اولیه فقط یک‌بار اجرا شود.

## Deployment safety note
The build command intentionally does not run `prisma db push` or `prisma db seed`. Apply migrations separately with `npm run db:deploy`, and seed only during the initial database setup when required. This prevents an ordinary application build from mutating or reseeding production data.

### Cron endpoint hardening

Automatic maintenance endpoints under `/api/jobs/*` are side-effecting and intentionally expose **POST only**. They require `Authorization: Bearer CRON_SECRET` and return `Cache-Control: no-store`. Configure the scheduler to send POST requests; do not use GET for these jobs.
