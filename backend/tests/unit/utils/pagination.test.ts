import { describe, it, expect } from 'vitest';
import {
  getPaginationParams,
  createPaginatedResult,
  getSkip,
} from '../../../src/shared/utils/pagination';

describe('Pagination Utils', () => {
  describe('getPaginationParams', () => {
    it('should return default values when no params provided', () => {
      const result = getPaginationParams();
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      const result = getPaginationParams(2, 20);
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should handle string inputs', () => {
      const result = getPaginationParams('3', '15');
      expect(result).toEqual({ page: 3, limit: 15 });
    });

    it('should enforce minimum values', () => {
      const result = getPaginationParams(0, 0);
      expect(result).toEqual({ page: 1, limit: 1 });
    });

    it('should enforce maximum limit', () => {
      const result = getPaginationParams(1, 200);
      expect(result.limit).toBe(100);
    });
  });

  describe('createPaginatedResult', () => {
    it('should create correct paginated result', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 50;
      const params = { page: 1, limit: 10 };

      const result = createPaginatedResult(data, total, params);

      expect(result.data).toEqual(data);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it('should calculate totalPages correctly', () => {
      const result = createPaginatedResult([], 25, { page: 1, limit: 10 });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getSkip', () => {
    it('should calculate skip correctly', () => {
      expect(getSkip({ page: 1, limit: 10 })).toBe(0);
      expect(getSkip({ page: 2, limit: 10 })).toBe(10);
      expect(getSkip({ page: 3, limit: 20 })).toBe(40);
    });
  });
});
