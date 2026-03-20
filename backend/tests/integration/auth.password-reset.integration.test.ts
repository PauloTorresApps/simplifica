import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const sendMailMock = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

vi.mock('../../src/config/database', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

type PrismaMock = {
  $transaction: ReturnType<typeof vi.fn>;
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  passwordResetToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

let app: FastifyInstance;
let buildAppFn: () => Promise<FastifyInstance>;
let prismaMock: PrismaMock;

beforeAll(async () => {
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET ??=
    'test-secret-with-at-least-sixty-four-characters-1234567890abcdef';
  process.env.JWT_EXPIRES_IN ??= '7d';
  process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES ??= '10';
  process.env.PASSWORD_RESET_URL ??= 'http://localhost:3000/reset-password';
  process.env.SMTP_HOST ??= 'localhost';
  process.env.SMTP_PORT ??= '587';
  process.env.SMTP_SECURE ??= 'false';
  process.env.SMTP_USER ??= '';
  process.env.SMTP_PASSWORD ??= '';
  process.env.SMTP_FROM_EMAIL ??= 'noreply@simplifica.local';
  process.env.SMTP_FROM_NAME ??= 'Simplifica';
  process.env.OPENROUTER_API_KEY ??= 'sk-or-v1-test-key';
  process.env.OPENROUTER_MODEL ??= 'openrouter/hunter-alpha';
  process.env.DOE_API_URL ??= 'https://diariooficial.to.gov.br/api.json';
  process.env.DOE_SYNC_CRON ??= '0 8 * * 1-5';
  process.env.CORS_ORIGIN ??= 'http://localhost:3000';
  process.env.NODE_ENV ??= 'test';
  process.env.PORT ??= '3333';

  const databaseModule = await import('../../src/config/database');
  prismaMock = databaseModule.prisma as unknown as PrismaMock;

  const appModule = await import('../../src/app');
  buildAppFn = appModule.buildApp;
});

beforeEach(async () => {
  vi.clearAllMocks();
  sendMailMock.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
    Promise.all(operations)
  );
  app = await buildAppFn();
});

afterEach(async () => {
  await app.close();
});

describe('Auth Password Reset Flow', () => {
  it('should return generic success for forgot-password when user exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
    });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'reset-id' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {
        email: 'test@example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().data.message).toContain('Se o email estiver cadastrado');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('should return generic success for forgot-password when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {
        email: 'missing@example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().data.message).toContain('Se o email estiver cadastrado');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should reset password with valid token', async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      usedAt: null,
    });
    prismaMock.user.update.mockResolvedValue({ id: 'user-id' });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: {
        token: '1234567890123456789012345678901234567890',
        password: 'Password123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().data.message).toBe('Senha redefinida com sucesso');
  });

  it('should reject reset-password with invalid token', async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: {
        token: '1234567890123456789012345678901234567890',
        password: 'Password123',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().success).toBe(false);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
});
