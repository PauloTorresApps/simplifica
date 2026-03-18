import { FastifyRequest, FastifyReply } from 'fastify';
import { SummariesService } from './summaries.service';
import { getSummarySchema, generateSummarySchema } from './summaries.schema';
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
    const summaries = await this.service.generate(params);

    const response: ApiResponse<typeof summaries> = {
      success: true,
      data: summaries,
    };

    return reply.status(201).send(response);
  }
}
