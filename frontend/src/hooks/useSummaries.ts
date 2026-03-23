import { useQuery } from '@tanstack/react-query';
import { summariesService } from '../services/summaries.service';

export function useSummaries(publicationId: string) {
  return useQuery({
    queryKey: ['summaries', publicationId],
    queryFn: () => summariesService.getByPublicationId(publicationId),
    enabled: !!publicationId,
  });
}
