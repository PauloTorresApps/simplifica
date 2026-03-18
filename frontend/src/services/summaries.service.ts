import { api } from './api';
import { ApiResponse, Summary } from '../types';

export const summariesService = {
  async getByPublicationId(publicationId: string): Promise<Summary[]> {
    const response = await api.get<ApiResponse<Summary[]>>(
      `/api/summaries/${publicationId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Erro ao buscar resumos');
    }
    return response.data.data || [];
  },

  async generate(publicationId: string): Promise<Summary[]> {
    const response = await api.post<ApiResponse<Summary[]>>(
      `/api/summaries/generate/${publicationId}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Erro ao gerar resumo');
    }
    return response.data.data;
  },
};
