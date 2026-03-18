import axios from 'axios';
import { ApiResponse } from '../types';

const MAX_MESSAGE_LENGTH = 180;
const SAFE_STATUS_CODES = new Set([400, 401, 403, 404, 409, 422, 429]);

function normalizeMessage(message: string | null | undefined): string {
  if (!message) {
    return '';
  }

  return message
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

export function getPublicApiResponseMessage<T>(response: ApiResponse<T>, fallback: string): string {
  const apiMessage = normalizeMessage(response.error?.message);
  return apiMessage || fallback;
}

export function getPublicErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const status = error.response?.status;
    const apiMessage = normalizeMessage(error.response?.data?.error?.message);

    if (status === 429) {
      return 'Muitas requisicoes. Tente novamente em instantes.';
    }

    if (status && SAFE_STATUS_CODES.has(status) && apiMessage) {
      return apiMessage;
    }

    return fallback;
  }

  if (error instanceof Error) {
    const safeMessage = normalizeMessage(error.message);
    return safeMessage || fallback;
  }

  return fallback;
}