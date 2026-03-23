import { FastifyRequest, FastifyReply } from 'fastify';
import { SummariesService } from './summaries.service';
import {
  getSummarySchema,
  generateSummarySchema,
  getSummaryJobStatusSchema,
  retryFailedSummaryJobsQuerySchema,
} from './summaries.schema';
import { ApiResponse } from '../../shared/types';

export class SummariesController {
  constructor(private service: SummariesService) {}

  async getByPublicationId(request: FastifyRequest, reply: FastifyReply) {
    const params = getSummarySchema.parse(request.params);
    const summaries = await this.service.getByPublicationId(params.publicationId);

    const response: ApiResponse<typeof summaries> = {
      success: true,
      data: summaries,
    };

    return reply.status(200).send(response);
  }

  async generate(request: FastifyRequest, reply: FastifyReply) {
    const params = generateSummarySchema.parse(request.params);
    const job = await this.service.startGeneration(params);

    const response: ApiResponse<typeof job> = {
      success: true,
      data: job,
    };

    return reply.status(202).send(response);
  }

  async getJobStatus(request: FastifyRequest, reply: FastifyReply) {
    const params = getSummaryJobStatusSchema.parse(request.params);
    const job = await this.service.getJobStatus(params);

    const response: ApiResponse<typeof job> = {
      success: true,
      data: job,
    };

    return reply.status(200).send(response);
  }

  async retryFailedJobs(request: FastifyRequest, reply: FastifyReply) {
    const query = retryFailedSummaryJobsQuerySchema.parse(request.query);
    const result = await this.service.retryFailedJobs(query);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    return reply.status(200).send(response);
  }
}
