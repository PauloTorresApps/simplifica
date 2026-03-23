import { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';
import { permissionRepository } from '../repositories/permission.repository';

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request.user as { sub?: string } | undefined)?.sub;

    if (!userId) {
      throw new UnauthorizedError('Usuário não autenticado');
    }

    const permissions = await permissionRepository.getUserPermissions(userId);

    if (!permissions.includes(permission)) {
      throw new ForbiddenError('Acesso negado: permissão insuficiente');
    }
  };
}
