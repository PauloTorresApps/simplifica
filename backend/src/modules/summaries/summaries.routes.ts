import { FastifyInstance } from 'fastify';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { SummariesRepository } from './summaries.repository';
import { PublicationsRepository } from '../publications/publications.repository';
import { OpenRouterService } from './openrouter.service';
import { SummaryJobRepository } from './summary-job.repository';

export async function summariesRoutes(app: FastifyInstance) {
  const summariesRepository = new SummariesRepository();
  const publicationsRepository = new PublicationsRepository();
  const openRouterService = new OpenRouterService();
  const summaryJobRepository = new SummaryJobRepository();
  const service = new SummariesService(
    summariesRepository,
    publicationsRepository,
    openRouterService,
    summaryJobRepository
  );
  const controller = new SummariesController(service);

  app.get(
    '/:publicationId',
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
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
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
        },
      },
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

  app.get(
    '/job/:jobId',
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
      schema: {
        description: 'Obter status de um job de geração de resumo',
        tags: ['Summaries'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
          required: ['jobId'],
        },
      },
    },
    controller.getJobStatus.bind(controller)
  );

  app.post(
    '/jobs/retry-failed',
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        description:
          'Reprocessar jobs falhos de resumo sem análise concluída (uso operacional interno)',
        tags: ['Summaries'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            failedOlderThanMinutes: {
              type: 'integer',
              minimum: 0,
              maximum: 10080,
              default: 0,
            },
          },
        },
      },
    },
    controller.retryFailedJobs.bind(controller)
  );
}
