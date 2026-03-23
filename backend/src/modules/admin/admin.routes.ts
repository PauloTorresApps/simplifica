import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

export async function adminRoutes(app: FastifyInstance) {
  const service = new AdminService();
  const controller = new AdminController(service);

  app.get(
    '/users',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:users:read')],
      schema: {
        description: 'Listar usuários com papéis',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.listUsers.bind(controller)
  );

  app.get(
    '/users/:userId',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:users:read')],
      schema: {
        description: 'Obter um usuário com papéis',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.getUser.bind(controller)
  );

  app.post(
    '/users/:userId/roles',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:users:manage-roles')],
      schema: {
        description: 'Atribuir papel ao usuário',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.assignRole.bind(controller)
  );

  app.delete(
    '/users/:userId/roles/:roleId',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:users:manage-roles')],
      schema: {
        description: 'Remover papel do usuário',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.removeRole.bind(controller)
  );

  app.get(
    '/roles',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:roles:read')],
      schema: {
        description: 'Listar papéis e permissões',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.listRoles.bind(controller)
  );

  app.get(
    '/permissions',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:permissions:read')],
      schema: {
        description: 'Listar permissões',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.listPermissions.bind(controller)
  );

  app.post(
    '/roles/:roleId/permissions',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:roles:manage')],
      schema: {
        description: 'Atribuir permissão ao papel',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.assignPermissionToRole.bind(controller)
  );

  app.delete(
    '/roles/:roleId/permissions/:permissionId',
    {
      onRequest: [app.authenticate, app.requirePermission('admin:roles:manage')],
      schema: {
        description: 'Remover permissão do papel',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
      },
    },
    controller.removePermissionFromRole.bind(controller)
  );
}
