import axios from 'axios';
import cron from 'node-cron';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { OpenRouterService } from '../modules/summaries/openrouter.service';
import { SummariesRepository } from '../modules/summaries/summaries.repository';
import { PublicationsRepository } from '../modules/publications/publications.repository';
import { parseLegalActs } from '../shared/utils/legal-acts-parser';

interface DoePublication {
  id: number;
  edicao: string;
  data: string;
  data_iso8601: string;
  suplemento: boolean;
  paginas: number;
  tamanho: string;
  downloads: number;
  link: string;
  imagem: string;
}

export class FetchPublicationsJob {
  private openRouterService: OpenRouterService;
  private summariesRepository: SummariesRepository;
  private publicationsRepository: PublicationsRepository;
  private isRunning: boolean = false;

  constructor() {
    this.openRouterService = new OpenRouterService();
    this.summariesRepository = new SummariesRepository();
    this.publicationsRepository = new PublicationsRepository();
  }

  async execute(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Job de sincronização já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Iniciando sincronização com DOE-TO...');

    try {
      // Fetch publications from DOE-TO API
      const response = await axios.get<DoePublication[]>(env.DOE_API_URL);

      const publications = response.data;
      console.log(`📥 ${publications.length} publicações encontradas na API`);

      let newCount = 0;
      let errorCount = 0;

      for (const doePub of publications) {
        try {
          // Check if publication already exists
          const existing = await this.publicationsRepository.findByDoeId(
            doePub.id.toString()
          );

          if (existing) {
            continue; // Skip existing publications
          }

          console.log(`📄 Processando nova publicação: Edição ${doePub.edicao}`);

          // Create publication
          const publication = await this.publicationsRepository.create({
            doeId: doePub.id.toString(),
            edition: doePub.edicao,
            date: new Date(doePub.data_iso8601),
            pages: doePub.paginas,
            fileSize: doePub.tamanho,
            downloadUrl: doePub.link,
            imageUrl: doePub.imagem,
            isSupplement: doePub.suplemento,
          });

          // Try to download and extract PDF content
          try {
            const pdfContent = await this.downloadAndExtractPdf(doePub.link);

            if (pdfContent) {
              // Update publication with raw content
              await prisma.publication.update({
                where: { id: publication.id },
                data: { rawContent: pdfContent },
              });

                const legalActs = parseLegalActs(pdfContent);

                if (legalActs.length === 0) {
                  console.log(`ℹ️ Nenhum decreto/lei identificado na edição ${doePub.edicao}`);
                }

                let generatedCount = 0;

                for (const legalAct of legalActs) {
                  try {
                    const llmResponse = await this.openRouterService.generateSummary(legalAct.content, {
                      legalType: legalAct.type,
                      legalTitle: legalAct.title,
                    });

                    await this.summariesRepository.create({
                      content: llmResponse.content,
                      model: llmResponse.model,
                      tokensUsed: llmResponse.tokensUsed,
                      topicType: legalAct.type,
                      topicTitle: legalAct.title,
                      topicOrder: legalAct.order,
                      publication: {
                        connect: { id: publication.id },
                      },
                    });

                    generatedCount++;
                  } catch (actError) {
                    console.error(
                      `⚠️ Erro ao resumir ${legalAct.type} da edição ${doePub.edicao}:`,
                      actError
                    );
                  }
                }

                console.log(
                  `✅ ${generatedCount} resumo(s) de decretos/leis gerados para edição ${doePub.edicao}`
                );
            }
          } catch (pdfError) {
            console.error(`⚠️ Erro ao processar PDF da edição ${doePub.edicao}:`, pdfError);
          }

          newCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ Erro ao processar publicação ${doePub.id}:`, error);
        }
      }

      console.log(`✅ Sincronização concluída: ${newCount} novas, ${errorCount} erros`);
    } catch (error) {
      console.error('❌ Erro na sincronização com DOE-TO:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async downloadAndExtractPdf(url: string): Promise<string | null> {
    try {
      // Dynamic import for pdf-parse (ESM compatibility)
      const pdfParse = (await import('pdf-parse')).default;

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        maxContentLength: 50 * 1024 * 1024, // 50MB max
      });

      const pdfBuffer = Buffer.from(response.data);
      const pdfData = await pdfParse(pdfBuffer);

      // Keep full extracted content so all decrees and laws in the edition can be parsed.
      const content = pdfData.text;

      return content || null;
    } catch (error) {
      console.error('Erro ao extrair PDF:', error);
      return null;
    }
  }

  start(): void {
    console.log(`⏰ Job de sincronização agendado: ${env.DOE_SYNC_CRON}`);

    cron.schedule(env.DOE_SYNC_CRON, async () => {
      await this.execute();
    });
  }

  async runOnce(): Promise<void> {
    await this.execute();
  }
}
