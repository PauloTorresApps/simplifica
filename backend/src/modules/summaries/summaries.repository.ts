import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class SummariesRepository {
  async findByPublicationId(publicationId: string) {
    return prisma.summary.findMany({
      where: { publicationId },
      orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findLatestByPublicationId(publicationId: string) {
    return prisma.summary.findFirst({
      where: { publicationId },
      orderBy: [{ topicOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async deleteByPublicationId(publicationId: string) {
    return prisma.summary.deleteMany({
      where: { publicationId },
    });
  }

  async create(data: Prisma.SummaryCreateInput) {
    return prisma.summary.create({
      data,
    });
  }
}
