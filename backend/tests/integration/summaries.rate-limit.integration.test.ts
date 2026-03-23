import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    role: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../src/shared/repositories/permission.repository', () => ({
  permissionRepository: {
    assignRoleToUser: vi.fn().mockResolvedValue(undefined),
    getUserRoles: vi.fn().mockResolvedValue(['USER']),
    getUserPermissions: vi.fn().mockResolvedValue([]),
    getUserPermissionsAndRoles: vi.fn().mockResolvedValue({
      roles: ['USER'],
      permissions: [],
    }),
    invalidateUser: vi.fn(),
    removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
    listRolesWithPermissions: vi.fn().mockResolvedValue([]),
    listPermissions: vi.fn().mockResolvedValue([]),
    assignPermissionToRole: vi.fn().mockResolvedValue(undefined),
    removePermissionFromRole: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/modules/summaries/summaries.service', () => ({
  SummariesService: class {
    async getByPublicationId() {
      return [];
    }

    async startGeneration() {
      return {
        id: 'job-id',
        publicationId: '11111111-1111-1111-1111-111111111111',
        status: 'PENDING',
        totalSteps: 3,
        completedSteps: 0,
        currentStep: null,
        errorMessage: null,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    async getJobStatus() {
      return {
        id: 'job-id',
        publicationId: '11111111-1111-1111-1111-111111111111',
        status: 'PROCESSING',
        totalSteps: 3,
        completedSteps: 1,
        currentStep: 'DECRETO - TESTE',
        errorMessage: null,
        progress: 33,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  },
}));

type PrismaMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  role: {
    upsert: ReturnType<typeof vi.fn>;
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
  process.env.DOE_ALLOWED_HOSTS ??= 'diariooficial.to.gov.br';
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

describe('Summaries Rate Limit', () => {
  it('should rate limit summary generation endpoint after max requests', async () => {
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
    const publicationId = '11111111-1111-1111-1111-111111111111';

    for (let i = 0; i < 10; i++) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/summaries/generate/${publicationId}`,
        headers: {
          origin: 'http://localhost:3000',
          cookie: authCookie,
        },
      });

      expect(response.statusCode).toBe(202);
    }

    const blockedResponse = await app.inject({
      method: 'POST',
      url: `/api/summaries/generate/${publicationId}`,
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(blockedResponse.statusCode).toBe(429);
  });
});
