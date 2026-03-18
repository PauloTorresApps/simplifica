import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);
  const authController = new AuthController(authService);

  app.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Registrar novo usuário',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 2 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    authController.register.bind(authController)
  );

  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Login de usuário',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    authController.login.bind(authController)
  );

  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Obter dados do usuário logado',
        tags: ['Auth'],
        security: [{ cookieAuth: [] }],
      },
    },
    authController.me.bind(authController)
  );

  app.post(
    '/logout',
    {
      schema: {
        description: 'Encerrar sessão do usuário',
        tags: ['Auth'],
      },
    },
    authController.logout.bind(authController)
  );
}
