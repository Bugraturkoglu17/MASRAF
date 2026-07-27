import fs from 'node:fs';

import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const api = process.env.MASRAF_TEST_API ?? 'http://localhost:4001/api/v1';
const password = process.env.MASRAF_TEST_PASSWORD;
if (!password) throw new Error('MASRAF_TEST_PASSWORD zorunludur.');

const prisma = new PrismaClient();
let expenseId;
let createdAttachments = [];

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
}

const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, Origin: 'http://localhost:3001' });
const login = async (identifier) =>
  (
    await request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
  ).accessToken;

async function expectExpenseError(token, payload, expected) {
  try {
    await request('/expenses', {
      method: 'POST',
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    throw new Error(`Beklenen hata oluşmadı: ${expected}`);
  } catch (error) {
    if (!String(error.message).includes(expected)) throw error;
  }
}

async function cleanup() {
  if (!expenseId) return;
  const storage = new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  for (const attachment of createdAttachments) {
    await storage
      .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: attachment.fileKey }))
      .catch(() => undefined);
  }
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { expenseId } }),
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { resourceId: expenseId },
          { resourceId: { in: createdAttachments.map((item) => item.id) } },
        ],
      },
    }),
    prisma.attachment.deleteMany({ where: { expenseId } }),
    prisma.expense.deleteMany({ where: { id: expenseId } }),
  ]);
}

try {
  const userToken = await login(process.env.MASRAF_TEST_USER ?? 'kullanıcı@masraf.local');
  const categories = await request('/expense-categories', { headers: authHeaders(userToken) });
  const category = categories.find((item) => !item.requiresDueDate) ?? categories[0];
  const iso = (date) => date.toISOString().slice(0, 10);
  const today = iso(new Date());
  const future = new Date();
  future.setUTCMonth(future.getUTCMonth() + 2);
  future.setUTCDate(future.getUTCDate() + 1);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const base = {
    categoryId: category.id,
    title: 'Otomatik Entegrasyon Testi',
    description: 'Geçici test kaydı',
    amount: '1250.50',
    currency: 'TRY',
    expenseDate: today,
    ...(category.requiresDueDate ? { dueDate: today } : {}),
  };

  await expectExpenseError(
    userToken,
    { ...base, expenseDate: iso(future) },
    'Masraf tarihi en fazla 2 ay sonrası olabilir.',
  );
  await expectExpenseError(
    userToken,
    { ...base, dueDate: iso(yesterday) },
    'Vade tarihi geçmiş bir tarih olamaz.',
  );

  const expense = await request('/expenses', {
    method: 'POST',
    headers: { ...authHeaders(userToken), 'content-type': 'application/json' },
    body: JSON.stringify(base),
  });
  expenseId = expense.id;
  if (!['1250.5', '1250.50'].includes(expense.amount)) {
    throw new Error(`Decimal tutar bozuldu: ${expense.amount}`);
  }

  const files = [
    {
      path: new URL('../../web/public/icons/icon-192.png', import.meta.url),
      name: 'fatura.png',
      mime: 'image/png',
    },
    {
      path: new URL('./fixtures/sample-receipt.pdf', import.meta.url),
      name: 'fatura.pdf',
      mime: 'application/pdf',
    },
  ];
  for (const file of files) {
    const bytes = fs.readFileSync(file.path);
    const signed = await request('/attachments/upload-url', {
      method: 'POST',
      headers: { ...authHeaders(userToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        expenseId,
        fileName: file.name,
        mimeType: file.mime,
        fileSize: bytes.length,
      }),
    });
    const put = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.mime, Origin: 'http://localhost:3001' },
      body: bytes,
    });
    if (!put.ok) throw new Error(`Storage PUT ${put.status}: ${await put.text()}`);
    createdAttachments.push(
      await request('/attachments/complete', {
        method: 'POST',
        headers: { ...authHeaders(userToken), 'content-type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          fileKey: signed.fileKey,
          fileName: file.name,
          mimeType: file.mime,
          fileSize: bytes.length,
        }),
      }),
    );
  }

  const listed = await request(`/attachments/expense/${expenseId}`, {
    headers: authHeaders(userToken),
  });
  const listedAfterRefresh = await request(`/attachments/expense/${expenseId}`, {
    headers: authHeaders(userToken),
  });
  if (listed.length !== 2 || listedAfterRefresh.length !== 2) {
    throw new Error('Ekler yenileme sonrası kalıcı değil.');
  }
  for (const attachment of listed) {
    const download = await request(`/attachments/${attachment.id}/download-url`, {
      headers: authHeaders(userToken),
    });
    const response = await fetch(download.url);
    if (!response.ok || Number(response.headers.get('content-length')) !== attachment.sizeBytes) {
      throw new Error('Ek indirilemiyor veya boyutu bozuldu.');
    }
  }

  await request(`/expenses/${expenseId}/submit`, {
    method: 'POST',
    headers: authHeaders(userToken),
  });
  const managerToken = await login(process.env.MASRAF_TEST_MANAGER ?? 'müdür@masraf.local');
  const managerNotifications = await request('/notifications', {
    headers: authHeaders(managerToken),
  });
  const managerEvents = managerNotifications.filter(
    (item) => item.expenseId === expenseId && item.title === 'Yeni bir masrafınız var.',
  );
  if (managerEvents.length !== 1) {
    throw new Error(`Yönetici bildirimi tekil değil: ${managerEvents.length}`);
  }
  const detail = await request(`/expenses/${expenseId}`, { headers: authHeaders(managerToken) });
  if (detail.attachments.length !== 2) throw new Error('Yönetici ekleri göremiyor.');

  await request(`/expenses/${expenseId}/approve`, {
    method: 'POST',
    headers: authHeaders(managerToken),
  });
  const userNotifications = await request('/notifications', { headers: authHeaders(userToken) });
  const userEvents = userNotifications.filter(
    (item) => item.expenseId === expenseId && item.title.includes('onaylandı'),
  );
  if (userEvents.length !== 1) {
    throw new Error(`Kullanıcı bildirimi tekil değil: ${userEvents.length}`);
  }
  await request(`/notifications/${userEvents[0].id}/read`, {
    method: 'PATCH',
    headers: authHeaders(userToken),
  });
  const afterRead = await request('/notifications', { headers: authHeaders(userToken) });
  if (!afterRead.find((item) => item.id === userEvents[0].id)?.readAt) {
    throw new Error('Okundu durumu kalıcı değil.');
  }
  const counts = await request('/expenses/manager/counts', { headers: authHeaders(managerToken) });
  if (!/^\d+\.\d{2}$/.test(counts.monthlyTotal)) {
    throw new Error(`Toplam decimal değil: ${counts.monthlyTotal}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      pngUpload: true,
      pdfUpload: true,
      persistedAfterRefresh: true,
      managerCanOpen: true,
      dateLimits: true,
      decimalAmount: expense.amount,
      managerNotification: 1,
      userNotification: 1,
      readPersisted: true,
      managerTotals: counts.monthlyTotal,
    }),
  );
} finally {
  await cleanup();
  await prisma.$disconnect();
}
