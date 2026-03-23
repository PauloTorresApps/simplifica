import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '../../shared/types';
import {
  listAdminUsersQuerySchema,
  permissionIdParamSchema,
  roleAssignmentSchema,
  roleIdParamSchema,
  rolePermissionAssignmentSchema,
  removeUserRoleParamsSchema,
  userIdParamSchema,
} from './admin.schema';
import { AdminService } from './admin.service';

export class AdminController {
  constructor(private service: AdminService) {}

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const query = listAdminUsersQuerySchema.parse(request.query);
    const result = await this.service.listUsers(query);

    const response: ApiResponse<typeof result.data> = {
      success: true,
      data: result.data,
      meta: result.meta,
    };

    return reply.status(200).send(response);
  }

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const params = userIdParamSchema.parse(request.params);
    const user = await this.service.getUserWithRoles(params);

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };

    return reply.status(200).send(response);
  }

  async assignRole(request: FastifyRequest, reply: FastifyReply) {
    const params = userIdParamSchema.parse(request.params);
    const body = roleAssignmentSchema.parse(request.body);
    await this.service.assignRole(params, body);

    const response: ApiResponse<{ assigned: boolean }> = {
      success: true,
      data: { assigned: true },
    };

    return reply.status(201).send(response);
  }

  async removeRole(request: FastifyRequest, reply: FastifyReply) {
    const params = removeUserRoleParamsSchema.parse(request.params);
    await this.service.removeRole(params);

    return reply.status(204).send();
  }

  async listRoles(_request: FastifyRequest, reply: FastifyReply) {
    const roles = await this.service.listRoles();

    const response: ApiResponse<typeof roles> = {
      success: true,
      data: roles,
    };

    return reply.status(200).send(response);
  }

  async listPermissions(_request: FastifyRequest, reply: FastifyReply) {
    const permissions = await this.service.listPermissions();

    const response: ApiResponse<typeof permissions> = {
      success: true,
      data: permissions,
    };

    return reply.status(200).send(response);
  }

  async assignPermissionToRole(request: FastifyRequest, reply: FastifyReply) {
    const params = roleIdParamSchema.parse(request.params);
    const body = rolePermissionAssignmentSchema.parse(request.body);
    await this.service.assignPermissionToRole(params, body);

    const response: ApiResponse<{ assigned: boolean }> = {
      success: true,
      data: { assigned: true },
    };

    return reply.status(201).send(response);
  }

  async removePermissionFromRole(request: FastifyRequest, reply: FastifyReply) {
    const params = permissionIdParamSchema.parse(request.params);
    await this.service.removePermissionFromRole(params);

    return reply.status(204).send();
  }
}
