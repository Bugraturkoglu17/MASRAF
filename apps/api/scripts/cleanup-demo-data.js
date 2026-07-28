/**
 * Demo verilerini temizle: tüm masraflar, ekler ve R2 nesneleri.
 * Kullanım: node scripts/cleanup-demo-data.js
 * Northflank shell'de çalıştırın — env değişkenleri zaten yüklü.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: process.env.R2_REGION ?? 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const BUCKET = process.env.R2_BUCKET ?? process.env.R2_BUCKET_NAME;

async function clearR2() {
  console.log(`\nR2 bucket temizleniyor: ${BUCKET}`);
  let deleted = 0;
  let token;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
    );
    const objects = list.Contents ?? [];
    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: objects.map((o) => ({ Key: o.Key })), Quiet: true },
        }),
      );
      deleted += objects.length;
      process.stdout.write(`  ${deleted} nesne silindi...\r`);
    }
    token = list.NextContinuationToken;
  } while (token);

  console.log(`  Toplam ${deleted} R2 nesnesi silindi.`);
}

async function clearDatabase() {
  console.log('\nVeritabanı temizleniyor...');

  const [attachments, expenses, notifications, comments] = await Promise.all([
    prisma.attachment.count(),
    prisma.expense.count(),
    prisma.notification.count(),
    prisma.comment.count(),
  ]);

  console.log(
    `  Silinecek: ${expenses} masraf, ${attachments} ek, ${notifications} bildirim, ${comments} yorum`,
  );

  // Sıra önemli: bağımlı kayıtlar önce
  await prisma.auditLog.deleteMany({ where: { resource: { in: ['EXPENSE', 'ATTACHMENT'] } } });
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.expenseStatusHistory.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCounter.updateMany({ data: { nextVal: 10000000 } });

  console.log('  Veritabanı temizlendi.');
}

async function main() {
  console.log('=== Demo Veri Temizleme ===');
  console.log('UYARI: Bu işlem geri alınamaz!\n');

  if (!BUCKET) {
    throw new Error('R2_BUCKET veya R2_BUCKET_NAME env değişkeni eksik.');
  }

  await clearDatabase();
  await clearR2();

  console.log('\n✅ Temizleme tamamlandı.');
}

main()
  .catch((err) => {
    console.error('\n❌ Hata:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
