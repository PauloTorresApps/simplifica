import { PublicationsRepository } from './publications.repository';
import { NotFoundError } from '../../shared/errors/app-error';
import { ListPublicationsInput, GetPublicationInput, GetPublicationsByDateInput } from './publications.schema';

export class PublicationsService {
  constructor(private repository: PublicationsRepository) {}

  async list(input: ListPublicationsInput) {
    return this.repository.findAll(input.page, input.limit, {
      date: input.date,
      search: input.search,
    });
  }

  async getById(input: GetPublicationInput) {
    const publication = await this.repository.findById(input.id);

    if (!publication) {
      throw new NotFoundError('Publicação');
    }

    return publication;
  }

  async getByDate(input: GetPublicationsByDateInput) {
    return this.repository.findByDate(input.date);
  }
}
