import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from '../../shared/utils/hash';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/app-error';
import { RegisterInput, LoginInput } from './auth.schema';
import { JwtPayload } from '../../shared/types';
import { env } from '../../config/env';

const DUMMY_HASH_PROMISE = hashPassword('invalid-password-for-timing-protection');

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('Email já cadastrado');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = this.app.jwt.sign(
      { sub: user.id, email: user.email, name: user.name } as JwtPayload,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return { user, token };
  }

  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always run a password comparison to reduce user-enumeration timing leaks.
    const hashToCompare = user?.password ?? (await DUMMY_HASH_PROMISE);
    const isPasswordValid = await comparePassword(data.password, hashToCompare);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Generate token
    const token = this.app.jwt.sign(
      { sub: user.id, email: user.email, name: user.name } as JwtPayload,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    return user;
  }
}
