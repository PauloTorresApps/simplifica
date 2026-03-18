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

  // OpenRouter
  OPENROUTER_API_KEY: z.string().startsWith('sk-or-'),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet'),

  // DOE-TO API
  DOE_API_URL: z.string().url().default('https://diariooficial.to.gov.br/api.json'),
  DOE_SYNC_CRON: z.string().default('0 8 * * 1-5'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`❌ Variáveis de ambiente inválidas: ${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();
