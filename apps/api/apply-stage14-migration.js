/* AŞAMA 14 migration — Neon HTTP sürücüsü üzerinden uygulanır (5432 ağda engelli, yalnızca 443 çalışıyor). */
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('1) AttachmentStatus enum...');
  await sql`DO $$ BEGIN
    CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING_UPLOAD', 'ACTIVE', 'FAILED', 'DELETED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

  console.log('2) attachments.status column...');
  await sql`ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "status" "AttachmentStatus" NOT NULL DEFAULT 'ACTIVE';`;

  console.log('3) backfill DELETED status for soft-deleted attachments...');
  await sql`UPDATE "attachments" SET "status" = 'DELETED' WHERE "deletedAt" IS NOT NULL AND "status" != 'DELETED';`;

  console.log('4) expenses.expenseCode column...');
  await sql`ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "expenseCode" VARCHAR(6);`;

  console.log('5) unique constraint on expenseCode...');
  await sql`DO $$ BEGIN
    ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expenseCode_key" UNIQUE ("expenseCode");
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

  console.log('Migration tamamlandı.');
}

main().catch((e) => {
  console.error('MIGRATION FAILED:', e.message);
  process.exit(1);
});
