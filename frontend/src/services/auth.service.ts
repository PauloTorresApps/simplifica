import { api } from './api';
import { ApiResponse, AuthResponse, User, LoginInput, RegisterInput } from '../types';

export const authService = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/login', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Erro ao fazer login');
    }
    return response.data.data;
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Erro ao registrar');
    }
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Erro ao buscar usuário');
    }
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },
};
