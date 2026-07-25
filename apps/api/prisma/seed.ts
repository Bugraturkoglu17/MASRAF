import { AppRole, PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Bugra.441';

const ALL_PERMISSIONS: { action: PermissionAction; resource: PermissionResource }[] = Object.values(
  PermissionResource,
).flatMap((resource) => Object.values(PermissionAction).map((action) => ({ action, resource })));

async function renameSeedAccount(
  role: AppRole,
  previousEmail: string,
  targetEmail: string,
): Promise<void> {
  const target = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (target) {
    if (target.role !== role) {
      throw new Error(`${targetEmail} adresi başka bir role ait.`);
    }
    return;
  }

  const previous = await prisma.user.findFirst({ where: { email: previousEmail, role } });
  if (previous) {
    await prisma.user.update({ where: { id: previous.id }, data: { email: targetEmail } });
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENVIRONMENT === 'production') {
    throw new Error('Production ortamında demo seed çalıştırılamaz.');
  }
  console.log('Seed başlıyor...');

  const permissions = await Promise.all(
    ALL_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { action_resource: { action: p.action, resource: p.resource } },
        update: {},
        create: p,
      }),
    ),
  );

  const organization = await prisma.organization.upsert({
    where: { slug: 'masraf-demo' },
    update: {},
    create: { name: 'Masraf Demo Şirketi', slug: 'masraf-demo' },
  });

  const department = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Genel' } },
    update: {},
    create: { organizationId: organization.id, name: 'Genel' },
  });

  // System roles for RBAC
  const systemRoleNames = ['ADMIN_ROLE', 'MANAGER_ROLE', 'USER_ROLE'] as const;
  const roleRecords = new Map<string, string>();
  for (const roleName of systemRoleNames) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: roleName } },
      update: {},
      create: { organizationId: organization.id, name: roleName, isSystem: true },
    });
    roleRecords.set(roleName, role.id);
  }

  const adminRoleId = roleRecords.get('ADMIN_ROLE')!;
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRoleId, permissionId: permission.id },
    });
  }

  // Admin kullanıcı
  await renameSeedAccount(AppRole.MANAGER, 'manager@masraf.local', 'müdür@masraf.local');
  await renameSeedAccount(AppRole.USER, 'user@masraf.local', 'kullanıcı@masraf.local');

  const adminHash = await argon2.hash(DEMO_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@masraf.local' },
    update: {
      passwordHash: adminHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      iban: null,
    },
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'admin@masraf.local',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Kullanıcı',
      role: AppRole.ADMIN,
      profileCompleted: true,
      phone: '+905001234567',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
    update: {},
    create: { userId: admin.id, roleId: adminRoleId },
  });

  // Manager kullanıcı
  const managerHash = await argon2.hash(DEMO_PASSWORD);
  const manager = await prisma.user.upsert({
    where: { email: 'müdür@masraf.local' },
    update: {
      passwordHash: managerHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      iban: null,
    },
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'müdür@masraf.local',
      passwordHash: managerHash,
      firstName: 'Ahmet',
      lastName: 'Yönetici',
      role: AppRole.MANAGER,
      profileCompleted: true,
      phone: '+905001234568',
    },
  });
  const managerRoleId = roleRecords.get('MANAGER_ROLE')!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: manager.id, roleId: managerRoleId } },
    update: {},
    create: { userId: manager.id, roleId: managerRoleId },
  });

  // Normal kullanıcı
  const userHash = await argon2.hash(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: 'kullanıcı@masraf.local' },
    update: {
      passwordHash: userHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'kullanıcı@masraf.local',
      passwordHash: userHash,
      firstName: 'Ayşe',
      lastName: 'Çalışan',
      role: AppRole.USER,
      profileCompleted: true,
      phone: '+905001234569',
      iban: 'TR000000000000000000000003',
    },
  });
  const userRoleId = roleRecords.get('USER_ROLE')!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: userRoleId } },
    update: {},
    create: { userId: user.id, roleId: userRoleId },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: { in: [admin.id, manager.id, user.id] }, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Expense categories
  const categories: { name: string; requiresDueDate: boolean }[] = [
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
  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: cat.name } },
      update: { requiresDueDate: cat.requiresDueDate },
      create: {
        organizationId: organization.id,
        name: cat.name,
        requiresDueDate: cat.requiresDueDate,
      },
    });
  }

  // Expense counter (8-digit sequential numbers)
  await prisma.expenseCounter.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', nextVal: 10000000 },
  });

  console.log('\n✅ Seed tamamlandı.\n');
  console.log('Test hesapları (YALNIZCA development):');
  console.log(`  ADMIN   → admin@masraf.local     / ${DEMO_PASSWORD}`);
  console.log(`  MANAGER → müdür@masraf.local     / ${DEMO_PASSWORD}`);
  console.log(`  USER    → kullanıcı@masraf.local / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seed başarısız:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
