import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { ApiResponse } from '../../shared/types';
import { env } from '../../config/env';

const AUTH_COOKIE_NAME = 'auth_token';

function parseExpiresInToSeconds(expiresIn: string): number | null {
  const value = expiresIn.trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/^(\d+)([smhdw])$/);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
  };

  return amount * multipliers[unit];
}

const cookieMaxAgeSeconds = parseExpiresInToSeconds(env.JWT_EXPIRES_IN) ?? 7 * 24 * 60 * 60;

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: cookieMaxAgeSeconds,
};

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    const result = await this.authService.register(data);

    reply.setCookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);

    const response: ApiResponse<{ user: typeof result.user }> = {
      success: true,
      data: {
        user: result.user,
      },
    };

    return reply.status(201).send(response);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await this.authService.login(data);

    reply.setCookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);

    const response: ApiResponse<{ user: typeof result.user }> = {
      success: true,
      data: {
        user: result.user,
      },
    };

    return reply.status(200).send(response);
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });

    const response: ApiResponse<{ loggedOut: boolean }> = {
      success: true,
      data: {
        loggedOut: true,
      },
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
