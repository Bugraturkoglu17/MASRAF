import { PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SYSTEM_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE'] as const;

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
    where: { slug: 'demo-organizasyon' },
    update: {},
    create: {
      name: 'Demo Organizasyon',
      slug: 'demo-organizasyon',
    },
  });

  const department = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Genel' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Genel',
    },
  });

  const roleRecords = new Map<string, string>();
  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: roleName } },
      update: {},
      create: {
        organizationId: organization.id,
        name: roleName,
        isSystem: true,
        description: `${roleName} sistem rolü`,
      },
    });
    roleRecords.set(roleName, role.id);
  }

  // OWNER ve ADMIN tüm izinlere sahip; diğer roller ileride ihtiyaca göre daraltılabilir.
  const ownerRoleId = roleRecords.get('OWNER')!;
  const adminRoleId = roleRecords.get('ADMIN')!;
  for (const permission of permissions) {
    for (const roleId of [ownerRoleId, adminRoleId]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
    }
  }

  const employeeRoleId = roleRecords.get('EMPLOYEE')!;
  const employeePermissions = permissions.filter(
    (p) =>
      p.resource === PermissionResource.EXPENSE &&
      [PermissionAction.CREATE, PermissionAction.READ].includes(p.action),
  );
  for (const permission of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: employeeRoleId, permissionId: permission.id } },
      update: {},
      create: { roleId: employeeRoleId, permissionId: permission.id },
    });
  }

  const passwordHash = await argon2.hash('ChangeMe123!');
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: {},
    create: {
      organizationId: organization.id,
      departmentId: department.id,
      email: 'owner@demo.local',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Yönetici',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: ownerRoleId } },
    update: {},
    create: { userId: owner.id, roleId: ownerRoleId },
  });

  await prisma.expenseCategory.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Ulaşım' } },
    update: {},
    create: { organizationId: organization.id, name: 'Ulaşım' },
  });
  await prisma.expenseCategory.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Konaklama' } },
    update: {},
    create: { organizationId: organization.id, name: 'Konaklama' },
  });
  await prisma.expenseCategory.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Yemek' } },
    update: {},
    create: { organizationId: organization.id, name: 'Yemek' },
  });

  console.log('Seed tamamlandı.');
  console.log(`Demo giriş: owner@demo.local / ChangeMe123! (yalnızca development)`);
}

main()
  .catch((error) => {
    console.error('Seed başarısız:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
