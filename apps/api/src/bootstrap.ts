/**
 * Production bootstrap betiği — ilk çalıştırma ve yeniden çalıştırma güvenlidir (idempotent).
 *
 * Gerekli ortam değişkenleri:
 *   DATABASE_URL          — doğrudan Neon bağlantısı (DIRECT_URL değeri kullanılmalı)
 *   DIRECT_URL            — aynı doğrudan bağlantı (Prisma schema için)
 *   BOOTSTRAP_ADMIN_EMAIL — admin kullanıcının e-posta adresi
 *   BOOTSTRAP_ADMIN_PASSWORD — geçici şifre; mustChangePassword=true ayarlanır
 *   BOOTSTRAP_ORG_NAME    — organizasyon görünen adı
 *   BOOTSTRAP_ORG_SLUG    — URL uyumlu benzersiz tanımlayıcı (küçük harf, tire)
 *
 * Oluşturulan veriler:
 *   - Tüm Permission kombinasyonları (8 action × 10 resource = 80 satır)
 *   - Sistem rolleri: ADMIN_ROLE (tüm yetkiler), MANAGER_ROLE, USER_ROLE
 *   - Organizasyon ve varsayılan departman
 *   - Admin kullanıcı (AppRole.ADMIN, ADMIN_ROLE)
 *   - Masraf kategorileri
 *   - ExpenseCounter başlangıç değeri
 *
 * Çalıştırma: node dist/bootstrap.js
 */

import { AppRole, PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// ── Ortam değişkenleri doğrulaması ───────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Zorunlu ortam değişkeni eksik: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

const ADMIN_EMAIL = requireEnv('BOOTSTRAP_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('BOOTSTRAP_ADMIN_PASSWORD');
const ORG_NAME = optionalEnv('BOOTSTRAP_ORG_NAME', 'Masraf Yönetim Sistemi');
const ORG_SLUG = optionalEnv('BOOTSTRAP_ORG_SLUG', 'masraf-org');

if (ADMIN_PASSWORD.length < 8) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD en az 8 karakter olmalıdır.');
}

// ── Sabit veri tanımları ─────────────────────────────────────────────────────

const ALL_PERMISSIONS: { action: PermissionAction; resource: PermissionResource }[] = Object.values(
  PermissionResource,
).flatMap((resource) => Object.values(PermissionAction).map((action) => ({ action, resource })));

const SYSTEM_ROLES = ['ADMIN_ROLE', 'MANAGER_ROLE', 'USER_ROLE'] as const;

const EXPENSE_CATEGORIES = [
  { name: 'Taşeron', requiresDueDate: true },
  { name: 'Menlift', requiresDueDate: true },
  { name: 'Malzeme', requiresDueDate: true },
  { name: 'Yakıt', requiresDueDate: false },
  { name: 'Yemek', requiresDueDate: false },
  { name: 'Konaklama', requiresDueDate: false },
  { name: 'Ulaşım', requiresDueDate: false },
  { name: 'Diğer', requiresDueDate: false },
  { name: 'Temsil & Ağırlama', requiresDueDate: false },
  { name: 'Ofis Malzemeleri', requiresDueDate: false },
  { name: 'Eğitim', requiresDueDate: false },
];

// ── Ana bootstrap ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Masraf bootstrap başlıyor ===');
  console.log(`Organizasyon : ${ORG_NAME} (${ORG_SLUG})`);
  console.log(`Admin e-posta: ${ADMIN_EMAIL}`);
  console.log('');

  const prisma = new PrismaClient({
    log: [
      { level: 'warn', emit: 'stdout' },
      { level: 'error', emit: 'stdout' },
    ],
  });

  try {
    // 1. İzinler ---------------------------------------------------------------
    process.stdout.write(`[1/7] ${ALL_PERMISSIONS.length} izin oluşturuluyor... `);
    const permissions = await Promise.all(
      ALL_PERMISSIONS.map((p) =>
        prisma.permission.upsert({
          where: { action_resource: { action: p.action, resource: p.resource } },
          update: {},
          create: p,
        }),
      ),
    );
    console.log(`tamam (${permissions.length} satır).`);

    // 2. Organizasyon ----------------------------------------------------------
    process.stdout.write(`[2/7] Organizasyon oluşturuluyor... `);
    const organization = await prisma.organization.upsert({
      where: { slug: ORG_SLUG },
      update: { name: ORG_NAME },
      create: { name: ORG_NAME, slug: ORG_SLUG },
    });
    console.log(`tamam (id: ${organization.id}).`);

    // 3. Varsayılan departman ---------------------------------------------------
    process.stdout.write(`[3/7] "Genel" departmanı oluşturuluyor... `);
    const department = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: 'Genel' } },
      update: {},
      create: { organizationId: organization.id, name: 'Genel' },
    });
    console.log(`tamam (id: ${department.id}).`);

    // 4. Sistem rolleri ---------------------------------------------------------
    process.stdout.write(`[4/7] Sistem rolleri oluşturuluyor... `);
    const roleMap = new Map<string, string>();
    for (const roleName of SYSTEM_ROLES) {
      const role = await prisma.role.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: roleName } },
        update: {},
        create: { organizationId: organization.id, name: roleName, isSystem: true },
      });
      roleMap.set(roleName, role.id);
    }
    console.log(`tamam (${SYSTEM_ROLES.length} rol).`);

    // 5. ADMIN_ROLE'a tüm izinler ----------------------------------------------
    process.stdout.write(`[5/7] ADMIN_ROLE izinleri atanıyor... `);
    const adminRoleId = roleMap.get('ADMIN_ROLE')!;
    await Promise.all(
      permissions.map((permission) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permission.id } },
          update: {},
          create: { roleId: adminRoleId, permissionId: permission.id },
        }),
      ),
    );
    console.log(`tamam (${permissions.length} izin).`);

    // 6. Admin kullanıcı -------------------------------------------------------
    process.stdout.write(`[6/7] Admin kullanıcı oluşturuluyor... `);
    const passwordHash = await argon2.hash(ADMIN_PASSWORD);
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        // Şifre güncellenmez; gerekirse Northflank Shell'den manüel reset yapılır.
      },
      create: {
        organizationId: organization.id,
        departmentId: department.id,
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: 'Sistem',
        lastName: 'Yöneticisi',
        role: AppRole.ADMIN,
        mustChangePassword: true,
        profileCompleted: true,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
      update: {},
      create: { userId: admin.id, roleId: adminRoleId },
    });
    console.log(`tamam (id: ${admin.id}).`);

    // 7. Masraf kategorileri ve sayaç ------------------------------------------
    process.stdout.write(`[7/7] Masraf kategorileri ve sayaç oluşturuluyor... `);
    for (const cat of EXPENSE_CATEGORIES) {
      await prisma.expenseCategory.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: cat.name } },
        update: { requiresDueDate: cat.requiresDueDate },
        create: { organizationId: organization.id, ...cat },
      });
    }
    await prisma.expenseCounter.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', nextVal: 10000000 },
    });
    console.log(`tamam (${EXPENSE_CATEGORIES.length} kategori).`);

    // ── Özet ──────────────────────────────────────────────────────────────────
    console.log('');
    console.log('=== Bootstrap tamamlandı ===');
    console.log(`  Organizasyon : ${ORG_NAME} (${ORG_SLUG})`);
    console.log(`  Admin e-posta: ${ADMIN_EMAIL}`);
    console.log('  İlk girişte şifre değiştirme zorunludur (mustChangePassword=true).');
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('Bootstrap başarısız:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
