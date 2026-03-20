import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { OpenRouterService } from '../../../src/modules/summaries/openrouter.service';
import { AppError } from '../../../src/shared/errors/app-error';

vi.mock('../../../src/config/openrouter', () => ({
  openRouterConfig: {
    model: 'primary-model',
    fallbackModel: 'openai/gpt-oss-120b:free,openrouter/auto',
    baseUrl: 'https://openrouter.ai/api/v1',
    buildHeaders: () => ({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    }),
  },
  SUMMARY_SYSTEM_PROMPT: 'Summarize legal text.',
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    SUMMARY_MAX_CONTENT_CHARS: 120000,
    OPENROUTER_TIMEOUT_MS: 30000,
  },
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean } | undefined)?.isAxiosError),
  },
}));

function makeAxiosError(status: number, message: string) {
  return {
    isAxiosError: true,
    response: {
      status,
      data: {
        error: {
          message,
        },
      },
    },
  };
}

describe('OpenRouterService', () => {
  const mockedAxios = vi.mocked(axios, true);
  let service: OpenRouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenRouterService();
  });

  it('falls back to openai/gpt-oss-120b:free when primary model is invalid', async () => {
    mockedAxios.post
      .mockRejectedValueOnce(makeAxiosError(400, 'primary-model is not a valid model ID'))
      .mockResolvedValueOnce({
        data: {
          model: 'openai/gpt-oss-120b:free',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '<article><p>ok</p></article>',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      });

    const result = await service.generateSummary('Texto legal para teste', {
      legalType: 'DECRETO',
      legalTitle: 'Teste fallback',
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post.mock.calls[0][1]).toMatchObject({ model: 'primary-model' });
    expect(mockedAxios.post.mock.calls[1][1]).toMatchObject({
      model: 'openai/gpt-oss-120b:free',
    });
    expect(result.model).toBe('openai/gpt-oss-120b:free');
    expect(result.tokensUsed).toBe(30);
  });

  it('does not use fallback for 400 unrelated to model validity', async () => {
    mockedAxios.post.mockRejectedValueOnce(
      makeAxiosError(400, 'Missing required parameter: messages')
    );

    await expect(
      service.generateSummary('Texto legal para teste', {
        legalType: 'LEI',
        legalTitle: 'Teste sem fallback',
      })
    ).rejects.toBeInstanceOf(AppError);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('retries transient 429 errors before succeeding on the same model', async () => {
    vi.useFakeTimers();

    mockedAxios.post
      .mockRejectedValueOnce(makeAxiosError(429, 'Provider returned error'))
      .mockResolvedValueOnce({
        data: {
          model: 'primary-model',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '<article><p>retry-ok</p></article>',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 22,
            total_tokens: 34,
          },
        },
      });

    const resultPromise = service.generateSummary('Texto para teste de retry', {
      legalType: 'DECRETO',
      legalTitle: 'Teste retry',
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    vi.useRealTimers();

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post.mock.calls[0][1]).toMatchObject({ model: 'primary-model' });
    expect(mockedAxios.post.mock.calls[1][1]).toMatchObject({ model: 'primary-model' });
    expect(result.model).toBe('primary-model');
    expect(result.tokensUsed).toBe(34);
  });
});
