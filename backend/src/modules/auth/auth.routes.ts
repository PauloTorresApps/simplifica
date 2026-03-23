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

  app.post(
    '/forgot-password',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Solicitar recuperação de senha',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    authController.forgotPassword.bind(authController)
  );

  app.post(
    '/reset-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Redefinir senha com token de recuperação',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', minLength: 32 },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    authController.resetPassword.bind(authController)
  );

  app.post(
    '/change-password',
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Alterar senha do usuário autenticado',
        tags: ['Auth'],
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    authController.changePassword.bind(authController)
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
      onRequest: [app.authenticate],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Encerrar sessão do usuário',
        tags: ['Auth'],
      },
    },
    authController.logout.bind(authController)
  );
}
