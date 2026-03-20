import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OpenRouterService } from '../../../src/modules/summaries/openrouter.service';
import { AppError } from '../../../src/shared/errors/app-error';

const { chatSendMock } = vi.hoisted(() => ({
  chatSendMock: vi.fn(),
}));

vi.mock('@openrouter/sdk', () => ({
  OpenRouter: vi.fn(function OpenRouterMock(this: { chat: { send: typeof chatSendMock } }) {
    this.chat = {
      send: chatSendMock,
    };
  }),
}));

vi.mock('../../../src/config/openrouter', () => ({
  openRouterConfig: {
    apiKey: 'test-key',
    model: 'primary-model',
    fallbackModel: 'openai/gpt-oss-120b:free,openrouter/auto,nvidia/nemotron-3-super-120b-a12b:free',
    timeoutMs: 30000,
    baseUrl: 'https://openrouter.ai/api/v1',
    httpReferer: 'https://simplifica.app',
    title: 'Simplifica - Tradutor de Juridiquês',
    providerSort: {
      by: 'throughput',
      partition: 'model',
    },
  },
  SUMMARY_SYSTEM_PROMPT: 'Summarize legal text.',
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    SUMMARY_MAX_CONTENT_CHARS: 120000,
    OPENROUTER_RATE_LIMIT_DELAY_MS: 12000,
    OPENROUTER_MAX_TOKENS: 5000,
  },
}));

function makeProviderError(statusCode: number, message: string) {
  return {
    statusCode,
    error: {
      message,
    },
    body: JSON.stringify({
      error: {
        message,
      },
    }),
  };
}

describe('OpenRouterService', () => {
  let service: OpenRouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    chatSendMock.mockReset();
    service = new OpenRouterService();
  });

  it('falls back to openai/gpt-oss-120b:free when primary model is invalid', async () => {
    chatSendMock
      .mockRejectedValueOnce(makeProviderError(400, 'primary-model is not a valid model ID'))
      .mockResolvedValueOnce({
        id: 'chatcmpl-1',
        object: 'chat.completion',
        created: 1710000000,
        model: 'openai/gpt-oss-120b:free',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<article><p>ok</p></article>',
            },
          },
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

    const result = await service.generateSummary('Texto legal para teste', {
      legalType: 'DECRETO',
      legalTitle: 'Teste fallback',
    });

    expect(chatSendMock).toHaveBeenCalledTimes(2);
    expect(chatSendMock.mock.calls[0][0]).toMatchObject({
      chatGenerationParams: {
        models: ['primary-model', 'openai/gpt-oss-120b:free', 'openrouter/auto'],
        provider: {
          sort: {
            by: 'throughput',
            partition: 'model',
          },
        },
      },
    });
    expect(chatSendMock.mock.calls[0][1]).toMatchObject({ timeoutMs: 30000 });
    expect(chatSendMock.mock.calls[1][0]).toMatchObject({
      chatGenerationParams: {
        models: [
          'openai/gpt-oss-120b:free',
          'openrouter/auto',
          'nvidia/nemotron-3-super-120b-a12b:free',
        ],
      },
    });
    expect(chatSendMock.mock.calls[0][0].chatGenerationParams.models).toHaveLength(3);
    expect(chatSendMock.mock.calls[1][0].chatGenerationParams.models).toHaveLength(3);
    expect(chatSendMock.mock.calls[0][0].chatGenerationParams).not.toHaveProperty('model');
    expect(chatSendMock.mock.calls[1][0].chatGenerationParams).not.toHaveProperty('model');
    expect(result.model).toBe('openai/gpt-oss-120b:free');
    expect(result.tokensUsed).toBe(30);
  });

  it('does not use fallback for 400 unrelated to model validity', async () => {
    chatSendMock.mockRejectedValueOnce(makeProviderError(400, 'Missing required parameter: messages'));

    await expect(
      service.generateSummary('Texto legal para teste', {
        legalType: 'LEI',
        legalTitle: 'Teste sem fallback',
      })
    ).rejects.toBeInstanceOf(AppError);

    expect(chatSendMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient 429 errors before succeeding on the same model', async () => {
    vi.useFakeTimers();

    chatSendMock
      .mockRejectedValueOnce(makeProviderError(429, 'Provider returned error'))
      .mockResolvedValueOnce({
        id: 'chatcmpl-2',
        object: 'chat.completion',
        created: 1710000001,
        model: 'primary-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<article><p>retry-ok</p></article>',
            },
          },
        ],
        usage: {
          promptTokens: 12,
          completionTokens: 22,
          totalTokens: 34,
        },
      });

    const resultPromise = service.generateSummary('Texto para teste de retry', {
      legalType: 'DECRETO',
      legalTitle: 'Teste retry',
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    vi.useRealTimers();

    expect(chatSendMock).toHaveBeenCalledTimes(2);
    expect(chatSendMock.mock.calls[0][0]).toMatchObject({
      chatGenerationParams: {
        models: ['primary-model', 'openai/gpt-oss-120b:free', 'openrouter/auto'],
      },
    });
    expect(chatSendMock.mock.calls[1][0]).toMatchObject({
      chatGenerationParams: {
        models: ['primary-model', 'openai/gpt-oss-120b:free', 'openrouter/auto'],
      },
    });
    expect(result.model).toBe('primary-model');
    expect(result.tokensUsed).toBe(34);
  });
});
