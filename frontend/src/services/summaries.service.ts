import { api } from './api';
import { ApiResponse, Summary, SummaryJob } from '../types';
import { getPublicApiResponseMessage, getPublicErrorMessage } from '../utils/public-error';

export const summariesService = {
  async getByPublicationId(publicationId: string): Promise<Summary[]> {
    try {
      const response = await api.get<ApiResponse<Summary[]>>(
        `/api/summaries/${publicationId}`
      );

      if (!response.data.success) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Nao foi possivel buscar os resumos.'));
      }

      return response.data.data || [];
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel buscar os resumos.'));
    }
  },

  async generate(publicationId: string): Promise<SummaryJob> {
    try {
      const response = await api.post<ApiResponse<SummaryJob>>(
        `/api/summaries/generate/${publicationId}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Nao foi possivel gerar os resumos.'));
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel gerar os resumos.'));
    }
  },

  async getJobStatus(jobId: string): Promise<SummaryJob> {
    try {
      const response = await api.get<ApiResponse<SummaryJob>>(`/api/summaries/job/${jobId}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Nao foi possivel obter o status da analise.'));
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel obter o status da analise.'));
    }
  },
};
