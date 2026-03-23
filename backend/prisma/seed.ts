import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = ['USER', 'OPS', 'ADMIN'] as const;
const PERMISSIONS = [
  { name: 'summaries:retry-failed', description: 'Reprocessar jobs falhos de sumarios' },
  { name: 'publications:sync', description: 'Executar sincronizacao de publicacoes' },
  { name: 'admin:users:read', description: 'Listar usuarios no painel admin' },
  {
    name: 'admin:users:manage-roles',
    description: 'Atribuir e remover papeis de usuarios',
  },
  { name: 'admin:roles:read', description: 'Listar papeis e permissoes' },
  { name: 'admin:permissions:read', description: 'Listar permissoes' },
  { name: 'admin:roles:manage', description: 'Gerenciar permissoes de papeis' },
] as const;

const ROLE_PERMISSIONS: Record<(typeof ROLES)[number], string[]> = {
  USER: [],
  OPS: ['summaries:retry-failed', 'publications:sync'],
  ADMIN: PERMISSIONS.map((permission) => permission.name),
};

function parseEmails(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  for (const roleName of ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
      },
    });
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
      },
      create: {
        name: permission.name,
        description: permission.description,
      },
    });
  }

  const roles = await prisma.role.findMany({
    where: { name: { in: [...ROLES] } },
    select: { id: true, name: true },
  });

  const permissions = await prisma.permission.findMany({
    where: { name: { in: PERMISSIONS.map((permission) => permission.name) } },
    select: { id: true, name: true },
  });

  const roleByName = new Map(roles.map((role) => [role.name, role]));
  const permissionByName = new Map(permissions.map((permission) => [permission.name, permission]));

  for (const roleName of ROLES) {
    const role = roleByName.get(roleName);

    if (!role) {
      continue;
    }

    for (const permissionName of ROLE_PERMISSIONS[roleName]) {
      const permission = permissionByName.get(permissionName);

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const userRole = roleByName.get('USER');

  if (userRole) {
    const usersWithoutRole = await prisma.user.findMany({
      where: {
        userRoles: {
          none: {},
        },
      },
      select: { id: true },
    });

    for (const user of usersWithoutRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: userRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: userRole.id,
          assignedBy: 'seed',
        },
      });
    }
  }

  const opsRole = roleByName.get('OPS');
  const opsEmails = parseEmails(process.env.OPS_ADMIN_EMAILS);

  if (opsRole && opsEmails.length > 0) {
    const opsUsers = await prisma.user.findMany({
      where: {
        OR: opsEmails.map((email) => ({
          email: {
            equals: email,
            mode: 'insensitive' as const,
          },
        })),
      },
      select: { id: true },
    });

    for (const user of opsUsers) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: opsRole.id,
          },
        },
        update: {
          assignedBy: 'seed',
        },
        create: {
          userId: user.id,
          roleId: opsRole.id,
          assignedBy: 'seed',
        },
      });
    }
  }
}

main()
  .catch(async (error) => {
    console.error('Seed RBAC falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
