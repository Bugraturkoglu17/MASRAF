-- CreateEnum
CREATE TYPE "PaymentRecipientType" AS ENUM ('SELF', 'THIRD_PARTY');

-- AlterTable: Expense - payment recipient snapshot fields
ALTER TABLE "expenses" ADD COLUMN "paymentRecipientType" "PaymentRecipientType" NOT NULL DEFAULT 'SELF';
ALTER TABLE "expenses" ADD COLUMN "recipientFirstName" VARCHAR(100);
ALTER TABLE "expenses" ADD COLUMN "recipientLastName" VARCHAR(100);
ALTER TABLE "expenses" ADD COLUMN "recipientIban" VARCHAR(26);
ALTER TABLE "expenses" ADD COLUMN "recipientCompanyName" VARCHAR(200);
ALTER TABLE "expenses" ADD COLUMN "recipientSnapshotCreatedAt" TIMESTAMP(3);
