import { prisma } from '../../config/database';
import { NotFoundError } from '../errors/app-error';

type CachedPermissionEntry = {
  permissions: string[];
  roles: string[];
  expiresAt: number;
};

const CACHE_TTL_MS = 60 * 1000;

export class PermissionRepository {
  private cache = new Map<string, CachedPermissionEntry>();

  private getCache(userId: string): CachedPermissionEntry | null {
    const entry = this.cache.get(userId);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(userId);
      return null;
    }

    return entry;
  }

  private setCache(userId: string, roles: string[], permissions: string[]) {
    this.cache.set(userId, {
      roles,
      permissions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  invalidateUser(userId: string) {
    this.cache.delete(userId);
  }

  async getUserPermissionsAndRoles(userId: string) {
    const cached = this.getCache(userId);

    if (cached) {
      return {
        roles: cached.roles,
        permissions: cached.permissions,
      };
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roleSet = new Set<string>();
    const permissionSet = new Set<string>();

    for (const userRole of userRoles) {
      roleSet.add(userRole.role.name);

      for (const rolePermission of userRole.role.rolePermissions) {
        permissionSet.add(rolePermission.permission.name);
      }
    }

    const roles = [...roleSet];
    const permissions = [...permissionSet];

    this.setCache(userId, roles, permissions);

    return { roles, permissions };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await this.getUserPermissionsAndRoles(userId);
    return result.permissions;
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const result = await this.getUserPermissionsAndRoles(userId);
    return result.roles;
  }

  async assignRoleToUser(userId: string, roleName: string) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      create: {
        userId,
        roleId: role.id,
      },
      update: {},
    });

    this.invalidateUser(userId);
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    this.invalidateUser(userId);
  }

  async listRolesWithPermissions() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async listPermissions() {
    return prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async assignPermissionToRole(roleId: string, permissionName: string) {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
      select: { id: true },
    });

    if (!permission) {
      throw new NotFoundError('Permission');
    }

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
      create: {
        roleId,
        permissionId: permission.id,
      },
      update: {},
    });

    const affectedUsers = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const affectedUser of affectedUsers) {
      this.invalidateUser(affectedUser.userId);
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    const affectedUsers = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const affectedUser of affectedUsers) {
      this.invalidateUser(affectedUser.userId);
    }
  }
}

export const permissionRepository = new PermissionRepository();
