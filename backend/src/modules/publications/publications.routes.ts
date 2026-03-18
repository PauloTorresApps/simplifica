import { FastifyInstance } from 'fastify';
import { PublicationsController } from './publications.controller';
import { PublicationsService } from './publications.service';
import { PublicationsRepository } from './publications.repository';

export async function publicationsRoutes(app: FastifyInstance) {
  const repository = new PublicationsRepository();
  const service = new PublicationsService(repository);
  const controller = new PublicationsController(service);

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Listar publicações com paginação e filtros',
        tags: ['Publications'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 10 },
            date: { type: 'string', format: 'date' },
            search: { type: 'string' },
          },
        },
      },
    },
    controller.list.bind(controller)
  );

  app.get(
    '/date/:date',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Listar publicações por data',
        tags: ['Publications'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
          },
          required: ['date'],
        },
      },
    },
    controller.getByDate.bind(controller)
  );

  app.get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Obter detalhes de uma publicação',
        tags: ['Publications'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    controller.getById.bind(controller)
  );
}
