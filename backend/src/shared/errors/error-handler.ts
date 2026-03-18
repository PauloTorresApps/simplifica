import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './app-error';

type ZodIssueLike = {
  path: Array<string | number>;
  message: string;
};

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
  // Log error
  request.log.error(error);

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
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: 'FASTIFY_ERROR',
        message: error.message,
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
