import { SummaryJobStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export class SummaryJobRepository {
  async create(data: {
    publicationId: string;
    totalSteps: number;
  }) {
    return prisma.summaryJob.create({
      data: {
        publicationId: data.publicationId,
        totalSteps: data.totalSteps,
      },
    });
  }

  async findById(id: string) {
    return prisma.summaryJob.findUnique({
      where: { id },
    });
  }

  async findActiveByPublicationId(publicationId: string) {
    return prisma.summaryJob.findFirst({
      where: {
        publicationId,
        status: {
          in: [SummaryJobStatus.PENDING, SummaryJobStatus.PROCESSING],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(
    id: string,
    status: SummaryJobStatus,
    errorMessage?: string
  ) {
    return prisma.summaryJob.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }

  async updateProgress(id: string, completedSteps: number, currentStep: string | null) {
    return prisma.summaryJob.update({
      where: { id },
      data: {
        completedSteps,
        currentStep,
      },
    });
  }

  async markStaleProcessingJobsAsFailed(staleBefore: Date) {
    const result = await prisma.summaryJob.updateMany({
      where: {
        status: SummaryJobStatus.PROCESSING,
        updatedAt: {
          lt: staleBefore,
        },
      },
      data: {
        status: SummaryJobStatus.FAILED,
        currentStep: null,
        errorMessage:
          'Processamento interrompido por reinicio do servidor. Inicie uma nova analise.',
      },
    });

    return result.count;
  }

  async findFailedRetryCandidates(limit: number, failedBefore?: Date) {
    return prisma.summaryJob.findMany({
      where: {
        status: SummaryJobStatus.FAILED,
        ...(failedBefore
          ? {
              updatedAt: {
                lt: failedBefore,
              },
            }
          : {}),
        publication: {
          summaries: {
            none: {},
          },
        },
      },
      select: {
        publicationId: true,
      },
      distinct: ['publicationId'],
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });
  }
}
