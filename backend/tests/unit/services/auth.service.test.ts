import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { prisma } from '../../../src/config/database';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../src/shared/errors/app-error';

// Mock Prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock Fastify instance
const mockApp = {
  jwt: {
    sign: vi.fn().mockReturnValue('mock-token'),
  },
} as any;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockApp);
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-id',
        email: input.email,
        name: input.name,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const result = await authService.register(input);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(input.email);
      expect(result.token).toBe('mock-token');
    });

    it('should throw ConflictError if email already exists', async () => {
      const input = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'existing-id',
        email: input.email,
      });

      await expect(authService.register(input)).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for non-existent user', async () => {
      const input = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getMe', () => {
    it('should return user data', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.getMe(userId);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.getMe('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });
});
