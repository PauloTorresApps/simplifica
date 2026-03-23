import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { errorHandler } from './shared/errors/error-handler';
import { ForbiddenError } from './shared/errors/app-error';
import { authenticate } from './modules/auth/auth.middleware';
import { requirePermission } from './shared/middlewares/require-permission';
import { authRoutes } from './modules/auth/auth.routes';
import { publicationsRoutes } from './modules/publications/publications.routes';
import { summariesRoutes } from './modules/summaries/summaries.routes';
import { adminRoutes } from './modules/admin/admin.routes';

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = Array.isArray(value) ? value[0] : value;
  const trimmed = normalized.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getOriginFromReferer(refererHeader: string | string[] | undefined): string | null {
  const referer = getHeaderValue(refererHeader);

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isDocsPath(url: string): boolean {
  const path = url.split('?')[0];
  return path === '/docs' || path.startsWith('/docs/') || path.startsWith('/documentation');
}

function parseBasicAuthHeader(
  authorizationHeader: string | null
): { username: string; password: string } | null {
  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return null;
  }

  const encoded = authorizationHeader.slice('Basic '.length).trim();

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export async function buildApp() {
  const app = Fastify({
    bodyLimit: 1024 * 1024,
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Global error handler must be set before route registration
  app.setErrorHandler(errorHandler);

  // Register plugins
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  const allowedOriginsSet = new Set(allowedOrigins);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'auth_token',
      signed: false,
    },
  });

  await app.register(rateLimit, {
    global: false,
  });

  app.addHook('onRequest', async (request) => {
    const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    if (!stateChangingMethods.has(request.method)) {
      return;
    }

    const originHeader = getHeaderValue(request.headers.origin);

    if (originHeader) {
      if (!allowedOriginsSet.has(originHeader)) {
        throw new ForbiddenError('Origem não permitida');
      }

      return;
    }

    const authCookie = request.cookies.auth_token;

    if (!authCookie) {
      return;
    }

    const refererOrigin = getOriginFromReferer(request.headers.referer);

    if (!refererOrigin || !allowedOriginsSet.has(refererOrigin)) {
      throw new ForbiddenError('Requisição bloqueada por proteção CSRF');
    }
  });

  if (env.NODE_ENV !== 'production') {
    const docsAuthEnabled = Boolean(env.DOCS_AUTH_USER && env.DOCS_AUTH_PASSWORD);

    if (docsAuthEnabled) {
      app.addHook('onRequest', async (request, reply) => {
        if (!isDocsPath(request.url)) {
          return;
        }

        const credentials = parseBasicAuthHeader(getHeaderValue(request.headers.authorization));
        const isAuthorized =
          credentials?.username === env.DOCS_AUTH_USER &&
          credentials.password === env.DOCS_AUTH_PASSWORD;

        if (isAuthorized) {
          return;
        }

        reply.header('WWW-Authenticate', 'Basic realm="Simplifica Docs"');
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticação necessária para acessar a documentação',
          },
        });
      });
    }

    // Swagger documentation
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Simplifica API',
          description: 'API para o Simplifica - Tradutor de Juridiquês para o Cidadão',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${env.PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'auth_token',
            },
          },
        },
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Decorate app with authenticate
  app.decorate('authenticate', authenticate);
  app.decorate('requirePermission', requirePermission);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(publicationsRoutes, { prefix: '/api/publications' });
  await app.register(summariesRoutes, { prefix: '/api/summaries' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
