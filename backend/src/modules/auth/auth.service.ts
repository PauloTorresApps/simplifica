import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  hashToken,
} from '../../shared/utils/hash';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../shared/errors/app-error';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema';
import { JwtPayload } from '../../shared/types';
import { env } from '../../config/env';
import { EmailService } from '../../shared/services/email.service';
import { permissionRepository } from '../../shared/repositories/permission.repository';

const DUMMY_HASH_PROMISE = hashPassword('invalid-password-for-timing-protection');
const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'Se o email estiver cadastrado, enviaremos um link para redefinição de senha.';

export class AuthService {
  constructor(
    private app: FastifyInstance,
    private emailService?: EmailService
  ) {}

  private getEmailService(): EmailService {
    if (!this.emailService) {
      this.emailService = new EmailService();
    }

    return this.emailService;
  }

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
        mustChangePassword: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    await prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: { name: 'USER' },
    });

    await permissionRepository.assignRoleToUser(user.id, 'USER');

    const roles = await permissionRepository.getUserRoles(user.id);

    // Generate token
    const token = this.app.jwt.sign(
      { sub: user.id, email: user.email, name: user.name } as JwtPayload,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      user: {
        ...user,
        roles,
        mustChangePassword: false,
      },
      token,
    };
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
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        mustChangePassword: Boolean(user.mustChangePassword),
      } as JwtPayload,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const roles = await permissionRepository.getUserRoles(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        mustChangePassword: Boolean(user.mustChangePassword),
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
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const roles = await permissionRepository.getUserRoles(userId);

    return {
      ...user,
      roles,
    };
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const isCurrentPasswordValid = await comparePassword(data.currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Senha atual inválida');
    }

    const hashedPassword = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return {
      message: 'Senha alterada com sucesso',
    };
  }

  async requestPasswordReset(data: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      await DUMMY_HASH_PROMISE;
      return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const resetUrl = new URL(env.PASSWORD_RESET_URL);
    resetUrl.searchParams.set('token', token);

    try {
      await this.getEmailService().sendEmail({
        to: user.email,
        subject: 'Recuperação de senha - Simplifica',
        html: `<p>Olá, ${user.name}.</p>
<p>Recebemos uma solicitação para redefinir sua senha no Simplifica.</p>
<p><a href="${resetUrl.toString()}">Clique aqui para redefinir sua senha</a></p>
<p>Este link expira em ${env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutos.</p>
<p>Se você não solicitou esta alteração, ignore este e-mail.</p>`,
        text: `Olá, ${user.name}.\n\nRecebemos uma solicitação para redefinir sua senha no Simplifica.\nAcesse o link para redefinir sua senha: ${resetUrl.toString()}\n\nEste link expira em ${env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutos.\nSe você não solicitou esta alteração, ignore este e-mail.`,
      });
    } catch (error) {
      this.app.log.error({ error }, 'Falha ao enviar e-mail de recuperação de senha');
    }

    return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(data: ResetPasswordInput) {
    const tokenHash = hashToken(data.token);
    const now = new Date();

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    const isInvalidToken =
      !passwordResetToken ||
      passwordResetToken.usedAt !== null ||
      passwordResetToken.expiresAt.getTime() < now.getTime();

    if (isInvalidToken) {
      throw new UnauthorizedError('Token de redefinição inválido ou expirado');
    }

    const hashedPassword = await hashPassword(data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordResetToken.userId },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso' };
  }
}
