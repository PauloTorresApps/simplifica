import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../../shared/errors/app-error';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch (error) {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}
