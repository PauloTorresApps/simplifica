import { SummariesRepository } from './summaries.repository';
import { OpenRouterService } from './openrouter.service';
import { PublicationsRepository } from '../publications/publications.repository';
import { NotFoundError, AppError } from '../../shared/errors/app-error';
import {
  GenerateSummaryInput,
  GetSummaryJobStatusInput,
  RetryFailedSummaryJobsQueryInput,
} from './summaries.schema';
import { parseLegalActs, parseLegalActsWithDiagnostics } from '../../shared/utils/legal-acts-parser';
import { SummaryJobRepository } from './summary-job.repository';
import { SummaryJobStatus } from '@prisma/client';
import { env } from '../../config/env';

export class SummariesService {
  constructor(
    private summariesRepository: SummariesRepository,
    private publicationsRepository: PublicationsRepository,
    private openRouterService: OpenRouterService,
    private summaryJobRepository: SummaryJobRepository
  ) {}

  private logParsingDiagnostics(publicationId: string, diagnostics: {
    hasInput: boolean;
    executiveSectionFound: boolean;
    headerMatches: number;
    keptChunks: number;
    discardedShort: number;
    discardedNonNormative: number;
    discardedDuplicate: number;
  }) {
    console.info(
      `Resumo parser [publication=${publicationId}] hasInput=${diagnostics.hasInput}; executiveSectionFound=${diagnostics.executiveSectionFound}; headers=${diagnostics.headerMatches}; kept=${diagnostics.keptChunks}; discardShort=${diagnostics.discardedShort}; discardNonNormative=${diagnostics.discardedNonNormative}; discardDuplicate=${diagnostics.discardedDuplicate}`
    );
  }

  async getByPublicationId(publicationId: string) {
    const summaries = await this.summariesRepository.findByPublicationId(publicationId);

    if (summaries.length === 0) {
      const publication = await this.publicationsRepository.findById(publicationId);

      if (publication?.rawContent) {
        const { chunks: legalActs, diagnostics } = parseLegalActsWithDiagnostics(publication.rawContent);
        this.logParsingDiagnostics(publicationId, diagnostics);

        if (legalActs.length === 0) {
          throw new AppError(
            'Esta edição foi analisada e não possui leis, medidas provisórias ou decretos publicados para simplificação.',
            422,
            'NO_LEGAL_ACTS_FOUND'
          );
        }
      }

      throw new NotFoundError('Resumo');
    }

    return summaries;
  }

  async startGeneration(input: GenerateSummaryInput) {
    const publication = await this.publicationsRepository.findById(input.publicationId);

    if (!publication) {
      throw new NotFoundError('Publicação');
    }

    if (!publication.rawContent) {
      throw new AppError('Publicação não possui conteúdo para gerar resumo', 400, 'NO_CONTENT');
    }

    const { chunks: legalActs, diagnostics } = parseLegalActsWithDiagnostics(
      publication.rawContent
    );
    this.logParsingDiagnostics(input.publicationId, diagnostics);

    if (legalActs.length === 0) {
      throw new AppError(
        'Esta edição foi analisada e não possui leis, medidas provisórias ou decretos publicados para simplificação.',
        422,
        'NO_LEGAL_ACTS_FOUND'
      );
    }

    const activeJob = await this.summaryJobRepository.findActiveByPublicationId(
      input.publicationId
    );

    if (activeJob) {
      const staleBefore = new Date(
        Date.now() - env.SUMMARY_JOB_STALE_MINUTES * 60 * 1000
      );

      if (activeJob.updatedAt < staleBefore) {
        await this.summaryJobRepository.updateStatus(
          activeJob.id,
          SummaryJobStatus.FAILED,
          'Processamento interrompido ou travado. Inicie uma nova analise.'
        );
      } else {
      return this.buildJobStatusResponse(activeJob);
      }
    }

    const job = await this.summaryJobRepository.create({
      publicationId: input.publicationId,
      totalSteps: legalActs.length,
    });

    void this.processGenerationJob(job.id, input.publicationId, legalActs).catch((error) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Erro no processamento assíncrono do job ${job.id}: ${message}`);
    });

    return this.buildJobStatusResponse(job);
  }

  async getJobStatus(input: GetSummaryJobStatusInput) {
    const job = await this.summaryJobRepository.findById(input.jobId);

    if (!job) {
      throw new NotFoundError('Job de resumo');
    }

    return this.buildJobStatusResponse(job);
  }

  async retryFailedJobs(input: RetryFailedSummaryJobsQueryInput) {
    const failedBefore =
      input.failedOlderThanMinutes > 0
        ? new Date(Date.now() - input.failedOlderThanMinutes * 60 * 1000)
        : undefined;

    const candidates = await this.summaryJobRepository.findFailedRetryCandidates(
      input.limit,
      failedBefore
    );

    const startedJobs = [];
    let skippedNoLegalActs = 0;
    let skippedOtherErrors = 0;

    for (const candidate of candidates) {
      try {
        const job = await this.startGeneration({
          publicationId: candidate.publicationId,
        });
        startedJobs.push(job);
      } catch (error) {
        if (error instanceof AppError && error.code === 'NO_LEGAL_ACTS_FOUND') {
          skippedNoLegalActs += 1;
          continue;
        }

        skippedOtherErrors += 1;
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(
          `Erro ao reprocessar jobs falhos da publicação ${candidate.publicationId}: ${message}`
        );
      }
    }

    return {
      requestedLimit: input.limit,
      failedOlderThanMinutes: input.failedOlderThanMinutes,
      foundCandidates: candidates.length,
      startedCount: startedJobs.length,
      skippedNoLegalActs,
      skippedOtherErrors,
      jobs: startedJobs,
    };
  }

  private async processGenerationJob(
    jobId: string,
    publicationId: string,
    legalActs: ReturnType<typeof parseLegalActs>
  ) {
    try {
      await this.summaryJobRepository.updateStatus(jobId, SummaryJobStatus.PROCESSING);

      await this.summariesRepository.deleteByPublicationId(publicationId);

      const generatedSummaries = [];
      let completedSteps = 0;

      for (const legalAct of legalActs) {
        await this.summaryJobRepository.updateProgress(
          jobId,
          completedSteps,
          `${legalAct.type ?? 'ATO'} - ${legalAct.title}`
        );

        try {
          const llmResponse = await this.openRouterService.generateSummary(legalAct.content, {
            legalType: legalAct.type,
            legalTitle: legalAct.title,
          });

          const summary = await this.summariesRepository.create({
            content: llmResponse.content,
            model: llmResponse.model,
            tokensUsed: llmResponse.tokensUsed,
            topicType: legalAct.type,
            topicTitle: legalAct.title,
            topicOrder: legalAct.order,
            publication: {
              connect: { id: publicationId },
            },
          });

          generatedSummaries.push(summary);
          completedSteps += 1;
          await this.summaryJobRepository.updateProgress(jobId, completedSteps, legalAct.title);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(`Erro ao gerar resumo para ${legalAct.title}: ${message}`);
        }
      }

      if (generatedSummaries.length === 0) {
        await this.summaryJobRepository.updateStatus(
          jobId,
          SummaryJobStatus.FAILED,
          'Não foi possível gerar os resumos dos decretos, leis e medidas provisórias desta edição',
        );

        return;
      }

      await this.summaryJobRepository.updateProgress(jobId, completedSteps, null);
      await this.summaryJobRepository.updateStatus(jobId, SummaryJobStatus.COMPLETED);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Erro inesperado no job ${jobId}: ${message}`);

      await this.summaryJobRepository.updateStatus(
        jobId,
        SummaryJobStatus.FAILED,
        `Falha inesperada no processamento: ${message}`
      );
    }
  }

  private buildJobStatusResponse(job: {
    id: string;
    publicationId: string;
    status: SummaryJobStatus;
    totalSteps: number;
    completedSteps: number;
    currentStep: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const progress =
      job.totalSteps > 0
        ? Math.min(100, Math.round((job.completedSteps / job.totalSteps) * 100))
        : 0;

    return {
      ...job,
      progress,
    };
  }
}
