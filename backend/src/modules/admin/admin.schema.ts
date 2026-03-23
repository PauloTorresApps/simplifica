import { z } from 'zod';

export const listAdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const roleAssignmentSchema = z.object({
  roleName: z.enum(['USER', 'OPS', 'ADMIN']),
});

export const removeUserRoleParamsSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const roleIdParamSchema = z.object({
  roleId: z.string().uuid(),
});

export const permissionIdParamSchema = z.object({
  roleId: z.string().uuid(),
  permissionId: z.string().uuid(),
});

export const rolePermissionAssignmentSchema = z.object({
  permissionName: z.string().min(1),
});

export type ListAdminUsersQueryInput = z.infer<typeof listAdminUsersQuerySchema>;
export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>;
export type RemoveUserRoleParamsInput = z.infer<typeof removeUserRoleParamsSchema>;
export type RoleIdParamInput = z.infer<typeof roleIdParamSchema>;
export type PermissionIdParamInput = z.infer<typeof permissionIdParamSchema>;
export type RolePermissionAssignmentInput = z.infer<typeof rolePermissionAssignmentSchema>;
