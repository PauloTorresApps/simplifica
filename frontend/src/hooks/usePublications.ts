import { useQuery } from '@tanstack/react-query';
import { publicationsService } from '../services/publications.service';
import { PublicationsFilters } from '../types';

export function usePublications(filters?: PublicationsFilters) {
  return useQuery({
    queryKey: ['publications', filters],
    queryFn: () => publicationsService.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePublication(id: string) {
  return useQuery({
    queryKey: ['publication', id],
    queryFn: () => publicationsService.getById(id),
    enabled: !!id,
  });
}

export function usePublicationsByDate(date: string) {
  return useQuery({
    queryKey: ['publications', 'date', date],
    queryFn: () => publicationsService.getByDate(date),
    enabled: !!date,
  });
}
