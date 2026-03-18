import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { errorHandler } from './shared/errors/error-handler';
import { ForbiddenError } from './shared/errors/app-error';
import { authenticate } from './modules/auth/auth.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { publicationsRoutes } from './modules/publications/publications.routes';
import { summariesRoutes } from './modules/summaries/summaries.routes';

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

    const originHeader = request.headers.origin;

    if (originHeader && !allowedOriginsSet.has(originHeader)) {
      throw new ForbiddenError('Origem não permitida');
    }
  });

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

  // Decorate app with authenticate
  app.decorate('authenticate', authenticate);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(publicationsRoutes, { prefix: '/api/publications' });
  await app.register(summariesRoutes, { prefix: '/api/summaries' });

  return app;
}
