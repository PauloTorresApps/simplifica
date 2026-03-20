import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET deve ter pelo menos 64 caracteres')
    .refine(
      (secret) => !secret.toLowerCase().includes('change-in-production'),
      'JWT_SECRET inseguro: use uma chave aleatória forte'
    ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  PASSWORD_RESET_URL: z.string().url().default('http://localhost:3000/reset-password'),

  // SMTP
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_EMAIL: z.string().email().default('noreply@simplifica.local'),
  SMTP_FROM_NAME: z.string().default('Simplifica'),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().startsWith('sk-or-'),
  OPENROUTER_MODEL: z.string().default('openrouter/hunter-alpha'),

  // DOE-TO API
  DOE_API_URL: z.string().url().default('https://diariooficial.to.gov.br/api.json'),
  DOE_ALLOWED_HOSTS: z.string().default('diariooficial.to.gov.br,doe.to.gov.br'),
  DOE_SYNC_CRON: z.string().default('0 8 * * 1-5'),
  HTTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  PDF_DOWNLOAD_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  SUMMARY_MAX_CONTENT_CHARS: z.coerce.number().int().min(1000).max(500000).default(120000),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
  DOCS_AUTH_USER: z.string().default(''),
  DOCS_AUTH_PASSWORD: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map((issue) => ({
        path: issue.path.join('.') || 'unknown',
        message: issue.message,
      }));
      const invalidVars = [...new Set(issues.map((issue) => issue.path))].join(', ');
      const details = issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join(' | ');

      throw new Error(`❌ Variáveis de ambiente inválidas: ${invalidVars}. Detalhes: ${details}`);
    }
    throw error;
  }
}

export const env = validateEnv();
