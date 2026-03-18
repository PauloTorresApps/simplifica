import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from '../../shared/utils/hash';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/app-error';
import { RegisterInput, LoginInput } from './auth.schema';
import { JwtPayload } from '../../shared/types';

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
      { expiresIn: '7d' }
    );

    return { user, token };
  }

  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Generate token
    const token = this.app.jwt.sign(
      { sub: user.id, email: user.email, name: user.name } as JwtPayload,
      { expiresIn: '7d' }
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
