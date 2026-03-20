import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './app-error';

type ZodIssueLike = {
  path: Array<string | number>;
  message: string;
};

function sanitizeLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-or-[A-Za-z0-9_-]+/gi, 'sk-or-[REDACTED]')
    .trim();
}

function getSafeErrorLog(error: unknown): Record<string, unknown> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    return {
      type: error.name,
      code: error.code,
      statusCode: error.statusCode,
      message: sanitizeLogMessage(error.message),
      isOperational: error.isOperational,
      ...(isDevelopment && error.stack ? { stack: error.stack } : {}),
    };
  }

  if (error instanceof ZodError) {
    return {
      type: 'ZodError',
      issueCount: error.issues.length,
      issues: error.issues.slice(0, 5).map((issue) => ({
        path: issue.path.join('.') || '_',
        message: sanitizeLogMessage(issue.message),
      })),
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: sanitizeLogMessage(error.message),
      ...(isDevelopment && error.stack ? { stack: error.stack } : {}),
    };
  }

  if (error && typeof error === 'object') {
    return { type: 'UnknownObjectError' };
  }

  return {
    type: 'UnknownError',
    message: String(error),
  };
}

function isZodLikeError(error: unknown): error is { issues?: ZodIssueLike[]; errors?: ZodIssueLike[] } {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const zodCandidate = error as { name?: string; issues?: unknown; errors?: unknown };
  const hasIssuesArray = Array.isArray(zodCandidate.issues) || Array.isArray(zodCandidate.errors);

  return zodCandidate.name === 'ZodError' && hasIssuesArray;
}

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log only sanitized error metadata to avoid leaking secrets.
  request.log.error({ error: getSafeErrorLog(error) });

  // AppError (custom errors)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { errors: error.errors }),
      },
    });
  }

  // Zod validation errors
  if (error instanceof ZodError || isZodLikeError(error)) {
    const zodIssues = error instanceof ZodError
      ? error.issues
      : (error.issues ?? error.errors ?? []);

    const errors: Record<string, string[]> = {};
    zodIssues.forEach((err) => {
      const path = err.path.length > 0 ? err.path.join('.') : '_';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erro de validação',
        errors,
      },
    });
  }

  // Fastify errors
  if ('statusCode' in error) {
    const statusCode = error.statusCode || 500;
    const isServerError = statusCode >= 500;

    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: 'FASTIFY_ERROR',
        message: isServerError ? 'Erro interno do servidor' : error.message,
      },
    });
  }

  // Unknown errors
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    },
  });
}
