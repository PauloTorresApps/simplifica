import { SummariesRepository } from './summaries.repository';
import { OpenRouterService } from './openrouter.service';
import { PublicationsRepository } from '../publications/publications.repository';
import { NotFoundError, AppError } from '../../shared/errors/app-error';
import { GenerateSummaryInput } from './summaries.schema';
import { parseLegalActs } from '../../shared/utils/legal-acts-parser';

export class SummariesService {
  constructor(
    private summariesRepository: SummariesRepository,
    private publicationsRepository: PublicationsRepository,
    private openRouterService: OpenRouterService
  ) {}

  async getByPublicationId(publicationId: string) {
    const summaries = await this.summariesRepository.findByPublicationId(publicationId);

    if (summaries.length === 0) {
      throw new NotFoundError('Resumo');
    }

    return summaries;
  }

  async generate(input: GenerateSummaryInput) {
    // Get publication
    const publication = await this.publicationsRepository.findById(input.publicationId);

    if (!publication) {
      throw new NotFoundError('Publicação');
    }

    if (!publication.rawContent) {
      throw new AppError('Publicação não possui conteúdo para gerar resumo', 400, 'NO_CONTENT');
    }

    const legalActs = parseLegalActs(publication.rawContent);

    if (legalActs.length === 0) {
      throw new AppError(
        'Não foram encontrados decretos ou leis no texto desta edição',
        422,
        'NO_LEGAL_ACTS_FOUND'
      );
    }

    await this.summariesRepository.deleteByPublicationId(input.publicationId);

    const generatedSummaries = [];

    for (const legalAct of legalActs) {
      try {
        const llmResponse = await this.openRouterService.generateSummary(legalAct.content, {
          legalType: legalAct.type,
          legalTitle: legalAct.title,
        });

        const summary = await this.summariesRepository.create({
          content: llmResponse.content,
          model: llmResponse.model,
          tokensUsed: llmResponse.tokensUsed,
          topicType: legalAct.type,
          topicTitle: legalAct.title,
          topicOrder: legalAct.order,
          publication: {
            connect: { id: input.publicationId },
          },
        });

        generatedSummaries.push(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`Erro ao gerar resumo para ${legalAct.title}: ${message}`);
      }
    }

    if (generatedSummaries.length === 0) {
      throw new AppError(
        'Não foi possível gerar os resumos dos decretos e leis desta edição',
        502,
        'SUMMARY_GENERATION_FAILED'
      );
    }

    return generatedSummaries;
  }
}
