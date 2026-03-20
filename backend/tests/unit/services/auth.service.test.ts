import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { prisma } from '../../../src/config/database';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../src/shared/errors/app-error';

vi.mock('../../../src/config/env', () => ({
  env: {
    JWT_EXPIRES_IN: '7d',
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: 10,
    PASSWORD_RESET_URL: 'http://localhost:3000/reset-password',
  },
}));

// Mock Prisma
vi.mock('../../../src/config/database', () => ({
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

// Mock Fastify instance
const mockApp = {
  jwt: {
    sign: vi.fn().mockReturnValue('mock-token'),
  },
} as any;

describe('AuthService', () => {
  let authService: AuthService;
  const mockEmailService = {
    sendEmail: vi.fn(),
  } as any;

  beforeEach(() => {
    authService = new AuthService(mockApp, mockEmailService);
    vi.clearAllMocks();

    (prisma.$transaction as any).mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );
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

  describe('requestPasswordReset', () => {
    it('should return generic message and send email when user exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      });
      (prisma.passwordResetToken.updateMany as any).mockResolvedValue({ count: 0 });
      (prisma.passwordResetToken.create as any).mockResolvedValue({ id: 'token-id' });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await authService.requestPasswordReset({ email: 'test@example.com' });

      expect(result.message).toContain('Se o email estiver cadastrado');
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should return generic message and not send email when user does not exist', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await authService.requestPasswordReset({ email: 'missing@example.com' });

      expect(result.message).toContain('Se o email estiver cadastrado');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and invalidate active reset tokens', async () => {
      (prisma.passwordResetToken.findUnique as any).mockResolvedValue({
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
      });
      (prisma.user.update as any).mockResolvedValue({ id: 'user-id' });
      (prisma.passwordResetToken.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await authService.resetPassword({
        token: '1234567890123456789012345678901234567890',
        password: 'Password123',
      });

      expect(result.message).toBe('Senha redefinida com sucesso');
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedError when token is invalid', async () => {
      (prisma.passwordResetToken.findUnique as any).mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: '1234567890123456789012345678901234567890',
          password: 'Password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
