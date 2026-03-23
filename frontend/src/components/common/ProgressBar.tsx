import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { SummaryJobStatus } from '../../types';

interface ProgressBarProps {
  progress: number;
  currentStep?: string | null;
  status: SummaryJobStatus;
}

export function ProgressBar({ progress, currentStep, status }: ProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-primary-900 font-medium">
          {status === 'COMPLETED' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : status === 'FAILED' ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-primary-700" />
          )}
          <span>
            {status === 'COMPLETED'
              ? 'Analise concluida'
              : status === 'FAILED'
                ? 'Falha na analise'
                : 'Analise em andamento'}
          </span>
        </div>
        <span className="text-sm font-semibold text-primary-800">{normalizedProgress}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-500 ease-out"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-primary-900">
        {currentStep || 'Preparando processamento dos atos legais...'}
      </p>
    </div>
  );
}
