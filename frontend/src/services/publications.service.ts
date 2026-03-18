import { api } from './api';
import { ApiResponse, Publication, PublicationsFilters, PaginatedResponse } from '../types';
import { getPublicApiResponseMessage, getPublicErrorMessage } from '../utils/public-error';

export const publicationsService = {
  async list(filters?: PublicationsFilters): Promise<PaginatedResponse<Publication>> {
    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.date) params.append('date', filters.date);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get<ApiResponse<Publication[]>>(
        `/api/publications?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(
          getPublicApiResponseMessage(response.data, 'Nao foi possivel buscar publicacoes.')
        );
      }

      return {
        data: response.data.data || [],
        meta: response.data.meta || { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel buscar publicacoes.'));
    }
  },

  async getById(id: string): Promise<Publication> {
    try {
      const response = await api.get<ApiResponse<Publication>>(`/api/publications/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(
          getPublicApiResponseMessage(response.data, 'Nao foi possivel buscar a publicacao.')
        );
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel buscar a publicacao.'));
    }
  },

  async getByDate(date: string): Promise<Publication[]> {
    try {
      const response = await api.get<ApiResponse<Publication[]>>(
        `/api/publications/date/${date}`
      );

      if (!response.data.success) {
        throw new Error(
          getPublicApiResponseMessage(response.data, 'Nao foi possivel buscar publicacoes.')
        );
      }

      return response.data.data || [];
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel buscar publicacoes.'));
    }
  },
};
