import { FastifyInstance } from 'fastify';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { SummariesRepository } from './summaries.repository';
import { PublicationsRepository } from '../publications/publications.repository';
import { OpenRouterService } from './openrouter.service';

export async function summariesRoutes(app: FastifyInstance) {
  const summariesRepository = new SummariesRepository();
  const publicationsRepository = new PublicationsRepository();
  const openRouterService = new OpenRouterService();
  const service = new SummariesService(
    summariesRepository,
    publicationsRepository,
    openRouterService
  );
  const controller = new SummariesController(service);

  app.get(
    '/:publicationId',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Obter resumos de uma publicação',
        tags: ['Summaries'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            publicationId: { type: 'string', format: 'uuid' },
          },
          required: ['publicationId'],
        },
      },
    },
    controller.getByPublicationId.bind(controller)
  );

  app.post(
    '/generate/:publicationId',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Gerar resumo para uma publicação',
        tags: ['Summaries'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            publicationId: { type: 'string', format: 'uuid' },
          },
          required: ['publicationId'],
        },
      },
    },
    controller.generate.bind(controller)
  );
}
