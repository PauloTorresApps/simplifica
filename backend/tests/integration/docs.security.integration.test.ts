import { afterAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const originalEnv = { ...process.env };

function applyBaseEnv(overrides: Record<string, string>): void {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'test-secret-with-at-least-sixty-four-characters-1234567890abcdef';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';
  process.env.OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';
  process.env.DOE_API_URL = 'https://diariooficial.to.gov.br/api.json';
  process.env.DOE_ALLOWED_HOSTS = 'diariooficial.to.gov.br';
  process.env.DOE_SYNC_CRON = '0 8 * * 1-5';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.PORT = '3333';
  process.env.HTTP_TIMEOUT_MS = '15000';
  process.env.PDF_DOWNLOAD_TIMEOUT_MS = '30000';
  process.env.OPENROUTER_TIMEOUT_MS = '30000';
  process.env.SUMMARY_MAX_CONTENT_CHARS = '120000';

  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, originalEnv);
}

async function buildTestApp(overrides: Record<string, string>): Promise<FastifyInstance> {
  applyBaseEnv(overrides);
  vi.resetModules();
  const { buildApp } = await import('../../src/app');
  return buildApp();
}

afterAll(() => {
  restoreEnv();
});

describe('Docs Security', () => {
  it('should require basic auth for docs when credentials are configured', async () => {
    const app = await buildTestApp({
      NODE_ENV: 'development',
      DOCS_AUTH_USER: 'docs-user',
      DOCS_AUTH_PASSWORD: 'docs-pass',
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect(response.statusCode).toBe(401);
      expect(String(response.headers['www-authenticate'])).toContain('Basic');
    } finally {
      await app.close();
      restoreEnv();
    }
  });

  it('should allow docs access with valid basic auth credentials', async () => {
    const app = await buildTestApp({
      NODE_ENV: 'development',
      DOCS_AUTH_USER: 'docs-user',
      DOCS_AUTH_PASSWORD: 'docs-pass',
    });

    try {
      const credentials = Buffer.from('docs-user:docs-pass').toString('base64');
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
        headers: {
          authorization: `Basic ${credentials}`,
        },
      });

      expect([200, 301, 302, 308]).toContain(response.statusCode);
    } finally {
      await app.close();
      restoreEnv();
    }
  });

  it('should hide docs in production', async () => {
    const app = await buildTestApp({
      NODE_ENV: 'production',
      DOCS_AUTH_USER: 'docs-user',
      DOCS_AUTH_PASSWORD: 'docs-pass',
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
      restoreEnv();
    }
  });
});
