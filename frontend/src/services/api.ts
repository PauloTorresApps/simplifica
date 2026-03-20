import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL não configurada. Defina a variável de ambiente no frontend.');
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const requestUrl = String(error.config?.url || '');
        const isSessionProbe = requestUrl.includes('/api/auth/me');
        const currentPath = window.location.pathname;
        const isPublicAuthPage =
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath === '/forgot-password' ||
          currentPath === '/reset-password';

        if (status === 401 && !isSessionProbe && !isPublicAuthPage) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  get instance() {
    return this.api;
  }
}

export const apiService = new ApiService();
export const api = apiService.instance;
