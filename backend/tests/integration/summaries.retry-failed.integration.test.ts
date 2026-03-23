import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { permissionRepository } from '../../src/shared/repositories/permission.repository';

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
    getUserPermissions: vi.fn().mockResolvedValue(['summaries:retry-failed']),
    getUserPermissionsAndRoles: vi.fn().mockResolvedValue({
      roles: ['USER'],
      permissions: ['summaries:retry-failed'],
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
        totalSteps: 2,
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
        totalSteps: 2,
        completedSteps: 1,
        currentStep: 'LEI - TESTE',
        errorMessage: null,
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    async retryFailedJobs() {
      return {
        requestedLimit: 3,
        failedOlderThanMinutes: 15,
        foundCandidates: 2,
        startedCount: 2,
        skippedNoLegalActs: 0,
        skippedOtherErrors: 0,
        jobs: [
          {
            id: 'job-a',
            publicationId: '11111111-1111-1111-1111-111111111111',
            status: 'PENDING',
            totalSteps: 4,
            completedSteps: 0,
            currentStep: null,
            errorMessage: null,
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'job-b',
            publicationId: '22222222-2222-2222-2222-222222222222',
            status: 'PENDING',
            totalSteps: 1,
            completedSteps: 0,
            currentStep: null,
            errorMessage: null,
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
  vi.mocked(permissionRepository.getUserPermissions).mockResolvedValue([
    'summaries:retry-failed',
  ]);
  app = await buildAppFn();
});

afterEach(async () => {
  await app.close();
});

describe('Summaries Retry Failed Jobs', () => {
  it('should reprocess failed jobs in batch when authenticated', async () => {
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
      url: '/api/summaries/jobs/retry-failed?limit=3&failedOlderThanMinutes=15',
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().data.requestedLimit).toBe(3);
    expect(response.json().data.failedOlderThanMinutes).toBe(15);
    expect(response.json().data.startedCount).toBe(2);
  });

  it('should require authentication for retry endpoint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/summaries/jobs/retry-failed',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().success).toBe(false);
  });

  it('should return forbidden when authenticated user lacks permission', async () => {
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
    vi.mocked(permissionRepository.getUserPermissions).mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/summaries/jobs/retry-failed?limit=3&failedOlderThanMinutes=15',
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().success).toBe(false);
    expect(response.json().error?.code).toBe('FORBIDDEN');
  });
});
