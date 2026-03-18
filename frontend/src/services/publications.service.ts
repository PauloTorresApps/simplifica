import { api } from './api';
import { ApiResponse, Publication, PublicationsFilters, PaginatedResponse } from '../types';

export const publicationsService = {
  async list(filters?: PublicationsFilters): Promise<PaginatedResponse<Publication>> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.date) params.append('date', filters.date);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<Publication[]>>(
      `/api/publications?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Erro ao buscar publicações');
    }

    return {
      data: response.data.data || [],
      meta: response.data.meta || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  async getById(id: string): Promise<Publication> {
    const response = await api.get<ApiResponse<Publication>>(`/api/publications/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Erro ao buscar publicação');
    }
    return response.data.data;
  },

  async getByDate(date: string): Promise<Publication[]> {
    const response = await api.get<ApiResponse<Publication[]>>(
      `/api/publications/date/${date}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Erro ao buscar publicações');
    }
    return response.data.data || [];
  },
};
