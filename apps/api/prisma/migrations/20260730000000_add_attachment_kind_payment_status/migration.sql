-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('INVOICE', 'PAYMENT_RECEIPT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_PAID', 'PAID_WITHOUT_RECEIPT', 'PAID_WITH_RECEIPT');

-- AlterTable: Attachment - kind kolonu
ALTER TABLE "attachments" ADD COLUMN "kind" "AttachmentKind" NOT NULL DEFAULT 'INVOICE';

-- AlterTable: Expense - payment alanları
ALTER TABLE "expenses" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_PAID';
ALTER TABLE "expenses" ADD COLUMN "paymentReceiptUploadedAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN "paymentReceiptUploadedBy" UUID;
