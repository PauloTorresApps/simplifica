import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { errorHandler } from './shared/errors/error-handler';
import { authenticate } from './modules/auth/auth.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { publicationsRoutes } from './modules/publications/publications.routes';
import { summariesRoutes } from './modules/summaries/summaries.routes';

export async function buildApp() {
  const app = Fastify({
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
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
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
