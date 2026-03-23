import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { summariesService } from '../services/summaries.service';

export function useGenerateSummaryJob() {
  return useMutation({
    mutationFn: (publicationId: string) => summariesService.generate(publicationId),
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao iniciar analise');
    },
  });
}

export function useSummaryJobStatus(jobId: string | null, publicationId: string | null) {
  const queryClient = useQueryClient();
  const lastNotifiedStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['summary-job', jobId],
    queryFn: () => summariesService.getJobStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (!status || status === 'PENDING' || status === 'PROCESSING') {
        return 2000;
      }

      return false;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const job = query.data;

    if (!job || lastNotifiedStatusRef.current === job.status) {
      return;
    }

    if (job.status === 'COMPLETED') {
      if (publicationId) {
        queryClient.invalidateQueries({ queryKey: ['summaries', publicationId] });
        queryClient.invalidateQueries({ queryKey: ['publication', publicationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast.success('Analise concluida com sucesso!');
      lastNotifiedStatusRef.current = job.status;
    }

    if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Nao foi possivel concluir a analise.');
      lastNotifiedStatusRef.current = job.status;
    }
  }, [publicationId, query.data, queryClient]);

  return query;
}
