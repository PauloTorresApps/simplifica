import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { summariesService } from '../services/summaries.service';
import toast from 'react-hot-toast';

export function useSummaries(publicationId: string) {
  return useQuery({
    queryKey: ['summaries', publicationId],
    queryFn: () => summariesService.getByPublicationId(publicationId),
    enabled: !!publicationId,
  });
}

export function useGenerateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicationId: string) => summariesService.generate(publicationId),
    onSuccess: (_, publicationId) => {
      queryClient.invalidateQueries({ queryKey: ['summaries', publicationId] });
      queryClient.invalidateQueries({ queryKey: ['publication', publicationId] });
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast.success('Resumos de decretos e leis gerados com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao gerar resumo');
    },
  });
}
