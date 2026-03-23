import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { permissionRepository } from '../../src/shared/repositories/permission.repository';

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
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

type PrismaMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

let app: FastifyInstance;
let buildAppFn: () => Promise<FastifyInstance>;
let prismaMock: PrismaMock;

const adminUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'admin@example.com',
  password: '',
  name: 'Admin User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const regularUser = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  email: 'user@example.com',
  password: '',
  name: 'Regular User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function getFirstCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) {
    return '';
  }

  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return rawCookie.split(';')[0];
}

async function loginWith(email: string, password: string) {
  const { hashPassword } = await import('../../src/shared/utils/hash');
  const hashedPassword = await hashPassword(password);

  prismaMock.user.findUnique.mockResolvedValue({
    ...(email === adminUser.email ? adminUser : regularUser),
    password: hashedPassword,
  });

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email,
      password,
    },
    headers: {
      origin: 'http://localhost:3000',
    },
  });

  return getFirstCookie(loginResponse.headers['set-cookie']);
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

  prismaMock.user.findMany.mockResolvedValue([
    {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    },
    {
      id: regularUser.id,
      email: regularUser.email,
      name: regularUser.name,
      createdAt: regularUser.createdAt,
      updatedAt: regularUser.updatedAt,
    },
  ]);
  prismaMock.user.count.mockResolvedValue(2);

  vi.mocked(permissionRepository.getUserRoles).mockImplementation(async (userId: string) => {
    if (userId === adminUser.id) {
      return ['ADMIN'];
    }

    return ['USER'];
  });

  vi.mocked(permissionRepository.getUserPermissions).mockImplementation(async (userId: string) => {
    if (userId === adminUser.id) {
      return ['admin:users:read', 'admin:users:manage-roles'];
    }

    return [];
  });

  app = await buildAppFn();
});

afterEach(async () => {
  await app.close();
});

describe('Admin RBAC Routes', () => {
  it('should require authentication to list users', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return forbidden for user without admin permission', async () => {
    const authCookie = await loginWith('user@example.com', 'Password123');

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error?.code).toBe('FORBIDDEN');
  });

  it('should return forbidden when user has OPS-like permission but not admin permission', async () => {
    const authCookie = await loginWith('user@example.com', 'Password123');
    vi.mocked(permissionRepository.getUserPermissions).mockResolvedValue([
      'summaries:retry-failed',
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error?.code).toBe('FORBIDDEN');
  });

  it('should allow admin to list users', async () => {
    const authCookie = await loginWith('admin@example.com', 'Password123');

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=10',
      headers: {
        cookie: authCookie,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().data).toHaveLength(2);
  });

  it('should allow admin to assign and remove role', async () => {
    const authCookie = await loginWith('admin@example.com', 'Password123');

    const assignResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${regularUser.id}/roles`,
      payload: {
        roleName: 'OPS',
      },
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(assignResponse.statusCode).toBe(201);
    expect(vi.mocked(permissionRepository.assignRoleToUser)).toHaveBeenCalledWith(
      regularUser.id,
      'OPS'
    );

    const removeResponse = await app.inject({
      method: 'DELETE',
      url: `/api/admin/users/${regularUser.id}/roles/cccccccc-cccc-cccc-cccc-cccccccccccc`,
      headers: {
        origin: 'http://localhost:3000',
        cookie: authCookie,
      },
    });

    expect(removeResponse.statusCode).toBe(204);
    expect(vi.mocked(permissionRepository.removeRoleFromUser)).toHaveBeenCalledWith(
      regularUser.id,
      'cccccccc-cccc-cccc-cccc-cccccccccccc'
    );
  });
});
