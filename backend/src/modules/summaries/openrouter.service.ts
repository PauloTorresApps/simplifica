import axios from 'axios';
import { openRouterConfig, SUMMARY_SYSTEM_PROMPT } from '../../config/openrouter';

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

export interface SummaryGenerationContext {
  legalType?: string;
  legalTitle?: string;
}

export class OpenRouterService {
  async generateSummary(
    content: string,
    context?: SummaryGenerationContext
  ): Promise<LLMResponse> {
    try {
      const clippedContent = content.slice(0, 15000);
      const contextualPrefix = context?.legalTitle
        ? `Tipo do ato: ${context.legalType ?? 'N/A'}\nTítulo do ato: ${context.legalTitle}\n\n`
        : '';

      const response = await axios.post<OpenRouterResponse>(
        `${openRouterConfig.baseUrl}/chat/completions`,
        {
          model: openRouterConfig.model,
          messages: [
            {
              role: 'system',
              content: SUMMARY_SYSTEM_PROMPT,
            },
            {
              role: 'user',
                content: `Por favor, simplifique o seguinte texto jurídico para o cidadão comum:\n\n${contextualPrefix}${clippedContent}`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        },
        {
          headers: openRouterConfig.headers,
          timeout: 60000, // 60 seconds
        }
      );

      const choice = response.data.choices[0];

      if (!choice || !choice.message.content) {
        throw new Error('Resposta vazia do OpenRouter');
      }

      return {
        content: choice.message.content,
        model: response.data.model,
        tokensUsed: response.data.usage.total_tokens,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Erro ao gerar resumo: ${message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Erro ao gerar resumo: ${error.message}`);
      }
      throw new Error('Erro ao gerar resumo');
    }
  }
}
