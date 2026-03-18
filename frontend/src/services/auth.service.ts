import { api } from './api';
import { ApiResponse, AuthResponse, User, LoginInput, RegisterInput } from '../types';
import { getPublicApiResponseMessage, getPublicErrorMessage } from '../utils/public-error';

export const authService = {
  async login(data: LoginInput): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/login', data);

      if (!response.data.success || !response.data.data) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Nao foi possivel fazer login.'));
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel fazer login.'));
    }
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', data);

      if (!response.data.success || !response.data.data) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Nao foi possivel criar a conta.'));
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Nao foi possivel criar a conta.'));
    }
  },

  async getMe(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>('/api/auth/me');

      if (!response.data.success || !response.data.data) {
        throw new Error(getPublicApiResponseMessage(response.data, 'Sessao invalida.'));
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getPublicErrorMessage(error, 'Sessao invalida.'));
    }
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },
};
