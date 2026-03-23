import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/app-error';
import { createPaginatedResult, getPaginationParams, getSkip } from '../../shared/utils/pagination';
import { permissionRepository } from '../../shared/repositories/permission.repository';
import {
  ListAdminUsersQueryInput,
  PermissionIdParamInput,
  RoleAssignmentInput,
  RolePermissionAssignmentInput,
  RoleIdParamInput,
  RemoveUserRoleParamsInput,
  UserIdParamInput,
} from './admin.schema';

export class AdminService {
  async listUsers(query: ListAdminUsersQueryInput) {
    const params = getPaginationParams(query.page, query.limit);
    const skip = getSkip(params);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    const data = await Promise.all(
      users.map(async (user) => ({
        ...user,
        roles: await permissionRepository.getUserRoles(user.id),
      }))
    );

    return createPaginatedResult(data, total, params);
  }

  async getUserWithRoles(params: UserIdParamInput) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    return {
      ...user,
      roles: await permissionRepository.getUserRoles(user.id),
    };
  }

  async assignRole(params: UserIdParamInput, body: RoleAssignmentInput) {
    await permissionRepository.assignRoleToUser(params.userId, body.roleName);
  }

  async removeRole(params: RemoveUserRoleParamsInput) {
    await permissionRepository.removeRoleFromUser(params.userId, params.roleId);
  }

  async listRoles() {
    const roles = await permissionRepository.listRolesWithPermissions();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rolePermission) => ({
        id: rolePermission.permission.id,
        name: rolePermission.permission.name,
        description: rolePermission.permission.description,
        createdAt: rolePermission.permission.createdAt,
      })),
    }));
  }

  async listPermissions() {
    return permissionRepository.listPermissions();
  }

  async assignPermissionToRole(
    params: RoleIdParamInput,
    body: RolePermissionAssignmentInput
  ) {
    await permissionRepository.assignPermissionToRole(params.roleId, body.permissionName);
  }

  async removePermissionFromRole(params: PermissionIdParamInput) {
    await permissionRepository.removePermissionFromRole(params.roleId, params.permissionId);
  }
}
