import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

type PrismaMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

let app: FastifyInstance;
let buildAppFn: () => Promise<FastifyInstance>;
let prismaMock: PrismaMock;

function getFirstCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) {
    return '';
  }

  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return rawCookie.split(';')[0];
}

beforeAll(async () => {
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixty-four-characters-1234567890abcdef';
  process.env.JWT_EXPIRES_IN ??= '7d';
  process.env.OPENROUTER_API_KEY ??= 'sk-or-v1-test-key';
  process.env.OPENROUTER_MODEL ??= 'anthropic/claude-3.5-sonnet';
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
  app = await buildAppFn();
});

afterEach(async () => {
  await app.close();
});

describe('Auth Cookie Flow', () => {
  it('should set auth cookie on register', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      },
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);

    const setCookie = response.headers['set-cookie'];
    const authCookie = getFirstCookie(setCookie);

    expect(authCookie).toContain('auth_token=');
    expect(String(setCookie)).toContain('HttpOnly');
  });

  it('should authenticate /me using auth cookie from login', async () => {
    const { hashPassword } = await import('../../src/shared/utils/hash');
    const hashedPassword = await hashPassword('Password123');

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'Password123',
      },
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const authCookie = getFirstCookie(loginResponse.headers['set-cookie']);
    expect(authCookie).toContain('auth_token=');

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: authCookie,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().success).toBe(true);
    expect(meResponse.json().data.email).toBe('test@example.com');
  });

  it('should return unauthorized for /me without cookie', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().success).toBe(false);
  });

  it('should clear auth cookie on logout', async () => {
    const { hashPassword } = await import('../../src/shared/utils/hash');
    const hashedPassword = await hashPassword('Password123');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'Password123',
      },
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    const authCookie = getFirstCookie(loginResponse.headers['set-cookie']);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const setCookie = response.headers['set-cookie'];
    expect(String(setCookie)).toContain('auth_token=');
  });

  it('should block logout when cookie is present but origin and referer are missing', async () => {
    const { hashPassword } = await import('../../src/shared/utils/hash');
    const hashedPassword = await hashPassword('Password123');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'Password123',
      },
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    const authCookie = getFirstCookie(loginResponse.headers['set-cookie']);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error?.code).toBe('FORBIDDEN');
  });
});
