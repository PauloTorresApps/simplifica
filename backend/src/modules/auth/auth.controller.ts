import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { ApiResponse } from '../../shared/types';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    const result = await this.authService.register(data);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    return reply.status(201).send(response);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await this.authService.login(data);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    return reply.status(200).send(response);
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { sub: string }).sub;
    const user = await this.authService.getMe(userId);

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };

    return reply.status(200).send(response);
  }
}
