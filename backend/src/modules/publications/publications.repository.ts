import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { getPaginationParams, createPaginatedResult, getSkip } from '../../shared/utils/pagination';
import { PaginatedResult } from '../../shared/types';

export interface PublicationWithSummary {
  id: string;
  doeId: string;
  edition: string;
  date: Date;
  pages: number;
  fileSize: string;
  downloadUrl: string;
  imageUrl: string | null;
  isSupplement: boolean;
  rawContent: string | null;
  createdAt: Date;
  updatedAt: Date;
  summaries: {
    id: string;
    content: string;
    model: string;
    tokensUsed: number | null;
    topicType: string | null;
    topicTitle: string | null;
    topicOrder: number | null;
    createdAt: Date;
  }[];
}

export class PublicationsRepository {
  async findAll(
    page: number,
    limit: number,
    filters?: { date?: string; search?: string }
  ): Promise<PaginatedResult<PublicationWithSummary>> {
    const params = getPaginationParams(page, limit);
    const skip = getSkip(params);

    const where: Prisma.PublicationWhereInput = {};

    if (filters?.date) {
      const startDate = new Date(filters.date);
      const endDate = new Date(filters.date);
      endDate.setDate(endDate.getDate() + 1);

      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (filters?.search) {
      where.OR = [
        { edition: { contains: filters.search, mode: 'insensitive' } },
        { rawContent: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.publication.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { date: 'desc' },
        include: {
          summaries: {
            orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
          },
        },
      }),
      prisma.publication.count({ where }),
    ]);

    return createPaginatedResult(data, total, params);
  }

  async findById(id: string): Promise<PublicationWithSummary | null> {
    return prisma.publication.findUnique({
      where: { id },
      include: {
        summaries: {
          orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async findByDoeId(doeId: string): Promise<PublicationWithSummary | null> {
    return prisma.publication.findUnique({
      where: { doeId },
      include: {
        summaries: {
          orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async findByDate(date: string): Promise<PublicationWithSummary[]> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    return prisma.publication.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'desc' },
      include: {
        summaries: {
          orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async create(data: Prisma.PublicationCreateInput) {
    return prisma.publication.create({
      data,
      include: {
        summaries: true,
      },
    });
  }

  async update(id: string, data: Prisma.PublicationUpdateInput) {
    return prisma.publication.update({
      where: { id },
      data,
      include: {
        summaries: true,
      },
    });
  }
}
