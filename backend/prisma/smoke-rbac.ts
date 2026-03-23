import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_ROLES = ['USER', 'OPS', 'ADMIN'];
const EXPECTED_PERMISSIONS = [
  'summaries:retry-failed',
  'publications:sync',
  'admin:users:read',
  'admin:users:manage-roles',
  'admin:roles:read',
  'admin:permissions:read',
  'admin:roles:manage',
];

async function main() {
  const roles = await prisma.role.findMany({
    select: { name: true },
  });

  const permissions = await prisma.permission.findMany({
    select: { name: true },
  });

  const roleNames = new Set(roles.map((role) => role.name));
  const permissionNames = new Set(permissions.map((permission) => permission.name));

  const missingRoles = EXPECTED_ROLES.filter((role) => !roleNames.has(role));
  const missingPermissions = EXPECTED_PERMISSIONS.filter(
    (permission) => !permissionNames.has(permission)
  );

  if (missingRoles.length > 0 || missingPermissions.length > 0) {
    if (missingRoles.length > 0) {
      console.error('RBAC smoke falhou: roles ausentes:', missingRoles.join(', '));
    }

    if (missingPermissions.length > 0) {
      console.error(
        'RBAC smoke falhou: permissions ausentes:',
        missingPermissions.join(', ')
      );
    }

    process.exit(1);
  }

  console.log('RBAC smoke OK:', {
    roles: roles.length,
    permissions: permissions.length,
  });
}

main()
  .catch((error) => {
    console.error('RBAC smoke falhou com erro:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
