import { AppRole, PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ALL_PERMISSIONS: { action: PermissionAction; resource: PermissionResource }[] = Object.values(
  PermissionResource,
).flatMap((resource) => Object.values(PermissionAction).map((action) => ({ action, resource })));

async function main() {
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
  const adminHash = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@masraf.local' },
    update: {},
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
      iban: 'TR000000000000000000000001',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
    update: {},
    create: { userId: admin.id, roleId: adminRoleId },
  });

  // Manager kullanıcı
  const managerHash = await argon2.hash('Manager123!');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@masraf.local' },
    update: {},
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'manager@masraf.local',
      passwordHash: managerHash,
      firstName: 'Ahmet',
      lastName: 'Yönetici',
      role: AppRole.MANAGER,
      profileCompleted: true,
      phone: '+905001234568',
      iban: 'TR000000000000000000000002',
    },
  });
  const managerRoleId = roleRecords.get('MANAGER_ROLE')!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: manager.id, roleId: managerRoleId } },
    update: {},
    create: { userId: manager.id, roleId: managerRoleId },
  });

  // Normal kullanıcı
  const userHash = await argon2.hash('User123!');
  const user = await prisma.user.upsert({
    where: { email: 'user@masraf.local' },
    update: {},
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'user@masraf.local',
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

  // Expense categories
  const categories = [
    'Ulaşım',
    'Konaklama',
    'Yemek',
    'Temsil & Ağırlama',
    'Ofis Malzemeleri',
    'Eğitim',
  ];
  for (const name of categories) {
    await prisma.expenseCategory.upsert({
      where: { organizationId_name: { organizationId: organization.id, name } },
      update: {},
      create: { organizationId: organization.id, name },
    });
  }

  console.log('\n✅ Seed tamamlandı.\n');
  console.log('Test hesapları (YALNIZCA development):');
  console.log('  ADMIN   → admin@masraf.local   / Admin123!');
  console.log('  MANAGER → manager@masraf.local / Manager123!');
  console.log('  USER    → user@masraf.local    / User123!');
}

main()
  .catch((error) => {
    console.error('Seed başarısız:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
