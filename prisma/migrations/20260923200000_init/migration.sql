-- Initial production schema for the school library.
-- Prisma creates String cuid() values in the application layer; therefore String IDs
-- intentionally have no database-side default here.
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DELIVERED', 'REJECTED', 'CANCELLED');
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');
CREATE TYPE "ReservationStatus" AS ENUM ('WAITING', 'FULFILLED', 'CANCELLED');
CREATE TYPE "FineStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'LOANED', 'LOST', 'DAMAGED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "memberCode" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_memberCode_key" ON "User"("memberCode");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "Author" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Author_name_key" ON "Author"("name");

CREATE TABLE "Book" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "authorId" TEXT,
  "isbn" TEXT,
  "publisher" TEXT,
  "publishedYear" INTEGER,
  "description" TEXT,
  "topic" TEXT,
  "coverUrl" TEXT,
  "totalStock" INTEGER NOT NULL DEFAULT 0,
  "availableStock" INTEGER NOT NULL DEFAULT 0,
  "categoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Book_author_idx" ON "Book"("author");
CREATE INDEX "Book_topic_idx" ON "Book"("topic");
CREATE INDEX "Book_categoryId_idx" ON "Book"("categoryId");
CREATE INDEX "Book_authorId_idx" ON "Book"("authorId");

CREATE TABLE "LoanRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "code" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoanRequest_code_key" ON "LoanRequest"("code");
CREATE INDEX "LoanRequest_status_createdAt_idx" ON "LoanRequest"("status", "createdAt");
CREATE INDEX "LoanRequest_userId_status_idx" ON "LoanRequest"("userId", "status");
CREATE INDEX "LoanRequest_bookId_status_idx" ON "LoanRequest"("bookId", "status");

CREATE TABLE "BookCopy" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookCopy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookCopy_code_key" ON "BookCopy"("code");
CREATE INDEX "BookCopy_bookId_status_idx" ON "BookCopy"("bookId", "status");

CREATE TABLE "MemberProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grade" TEXT,
  "className" TEXT,
  "address" TEXT,
  "guardianName" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

CREATE TABLE "Loan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "copyId" TEXT,
  "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "extensionCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Loan_code_key" ON "Loan"("code");
CREATE INDEX "Loan_userId_status_idx" ON "Loan"("userId", "status");
CREATE INDEX "Loan_dueDate_status_idx" ON "Loan"("dueDate", "status");
CREATE INDEX "Loan_copyId_idx" ON "Loan"("copyId");
CREATE INDEX "Loan_bookId_status_idx" ON "Loan"("bookId", "status");

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'WAITING',
  "position" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reservation_bookId_status_position_idx" ON "Reservation"("bookId", "status", "position");
CREATE INDEX "Reservation_userId_status_idx" ON "Reservation"("userId", "status");
CREATE UNIQUE INDEX "Reservation_bookId_position_key" ON "Reservation"("bookId", "position");

CREATE TABLE "Fine" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "FineStatus" NOT NULL DEFAULT 'UNPAID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "Fine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Fine_loanId_reason_key" ON "Fine"("loanId", "reason");
CREATE INDEX "Fine_userId_status_idx" ON "Fine"("userId", "status");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE TABLE "Setting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE "RateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "Book" ADD CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "BookCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fine" ADD CONSTRAINT "Fine_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
