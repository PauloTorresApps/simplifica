import axios from 'axios';
import { api } from './api';
import { ApiResponse, Summary } from '../types';

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.error?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export const summariesService = {
  async getByPublicationId(publicationId: string): Promise<Summary[]> {
    try {
      const response = await api.get<ApiResponse<Summary[]>>(
        `/api/summaries/${publicationId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Erro ao buscar resumos');
      }

      return response.data.data || [];
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Erro ao buscar resumos'));
    }
  },

  async generate(publicationId: string): Promise<Summary[]> {
    try {
      const response = await api.post<ApiResponse<Summary[]>>(
        `/api/summaries/generate/${publicationId}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Erro ao gerar resumo');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Erro ao gerar resumo'));
    }
  },
};
