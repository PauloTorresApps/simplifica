export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Publication {
  id: string;
  doeId: string;
  edition: string;
  date: string;
  pages: number;
  fileSize: string;
  downloadUrl: string;
  imageUrl: string | null;
  isSupplement: boolean;
  rawContent?: string | null;
  createdAt: string;
  updatedAt: string;
  summaries: Summary[];
}

export interface Summary {
  id: string;
  publicationId: string;
  content: string;
  model: string;
  tokensUsed: number | null;
  topicType: string | null;
  topicTitle: string | null;
  topicOrder: number | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface PublicationsFilters {
  page?: number;
  limit?: number;
  date?: string;
  search?: string;
}
