import { FastifyRequest, FastifyReply } from 'fastify';
import { PublicationsService } from './publications.service';
import { listPublicationsSchema, getPublicationSchema, getPublicationsByDateSchema } from './publications.schema';
import { ApiResponse } from '../../shared/types';

export class PublicationsController {
  constructor(private service: PublicationsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listPublicationsSchema.parse(request.query);
    const result = await this.service.list(query);

    const response: ApiResponse<typeof result.data> = {
      success: true,
      data: result.data,
      meta: result.meta,
    };

    return reply.status(200).send(response);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const params = getPublicationSchema.parse(request.params);
    const publication = await this.service.getById(params);

    const response: ApiResponse<typeof publication> = {
      success: true,
      data: publication,
    };

    return reply.status(200).send(response);
  }

  async getByDate(request: FastifyRequest, reply: FastifyReply) {
    const params = getPublicationsByDateSchema.parse(request.params);
    const publications = await this.service.getByDate(params);

    const response: ApiResponse<typeof publications> = {
      success: true,
      data: publications,
    };

    return reply.status(200).send(response);
  }
}
