import axios from 'axios';
import cron from 'node-cron';
import { env } from '../config/env';
import { OpenRouterService } from '../modules/summaries/openrouter.service';
import { SummariesRepository } from '../modules/summaries/summaries.repository';
import { PublicationsRepository } from '../modules/publications/publications.repository';
import { parseLegalActs } from '../shared/utils/legal-acts-parser';
import { extractExecutiveActsContent } from '../shared/utils/doe-content-extractor';
import { validateExternalUrl } from '../shared/utils/external-url-guard';

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

const ALLOWED_PDF_CONTENT_TYPES = [
  'application/pdf',
  'application/octet-stream',
  'binary/octet-stream',
];

export class FetchPublicationsJob {
  private openRouterService: OpenRouterService;
  private summariesRepository: SummariesRepository;
  private publicationsRepository: PublicationsRepository;
  private readonly allowedHosts: string[];
  private isRunning: boolean = false;

  constructor() {
    this.openRouterService = new OpenRouterService();
    this.summariesRepository = new SummariesRepository();
    this.publicationsRepository = new PublicationsRepository();
    this.allowedHosts = env.DOE_ALLOWED_HOSTS.split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    if (this.allowedHosts.length === 0) {
      throw new Error('DOE_ALLOWED_HOSTS deve conter ao menos um hostname válido');
    }
  }

  async execute(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Job de sincronização já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Iniciando sincronização com DOE-TO...');

    try {
      const safeDoeApiUrl = validateExternalUrl(env.DOE_API_URL, this.allowedHosts);

      // Fetch publications from DOE-TO API
      const response = await axios.get<DoePublication[]>(safeDoeApiUrl.toString(), {
        timeout: env.HTTP_TIMEOUT_MS,
        maxRedirects: 2,
      });

      const publications = response.data;
      console.log(`📥 ${publications.length} publicações encontradas na API`);

      let newCount = 0;
      let retriedCount = 0;
      let errorCount = 0;

      for (const doePub of publications) {
        try {
          const existing = await this.publicationsRepository.findByDoeId(doePub.id.toString());

          let publication = existing;
          let isRetry = false;

          if (!publication) {
            console.log(`📄 Processando nova publicação: Edição ${doePub.edicao}`);

            publication = await this.publicationsRepository.create({
              doeId: doePub.id.toString(),
              edition: doePub.edicao,
              date: new Date(doePub.data_iso8601),
              pages: doePub.paginas,
              fileSize: doePub.tamanho,
              downloadUrl: doePub.link,
              imageUrl: doePub.imagem,
              isSupplement: doePub.suplemento,
            });

            newCount++;
          } else {
            if (publication.summaries.length > 0) {
              continue;
            }

            isRetry = true;
            console.log(`🔁 Reprocessando edição sem resumo: ${doePub.edicao}`);
          }

          // Try to download and extract PDF content
          try {
            let pdfContent = publication.rawContent;

            if (!pdfContent) {
              pdfContent = await this.downloadAndExtractPdf(doePub.link);
            }

            if (pdfContent) {
              if (!publication.rawContent) {
                // Save extracted content only when publication has no previous raw content
                publication = await this.publicationsRepository.update(publication.id, {
                  rawContent: pdfContent,
                });
              }

                const legalActs = parseLegalActs(pdfContent);

                if (legalActs.length === 0) {
                  console.log(
                    `ℹ️ Nenhum decreto/lei/medida provisoria identificado na edição ${doePub.edicao}`
                  );
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
                  `✅ ${generatedCount} resumo(s) de decretos/leis/medidas provisórias gerados para edição ${doePub.edicao}`
                );

                if (isRetry) {
                  retriedCount++;
                }
            } else {
              console.log(`ℹ️ Edição ${doePub.edicao} sem conteúdo PDF disponível para análise`);
            }
          } catch (pdfError) {
            console.error(`⚠️ Erro ao processar PDF da edição ${doePub.edicao}:`, pdfError);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Erro ao processar publicação ${doePub.id}:`, error);
        }
      }

      console.log(`✅ Sincronização concluída: ${newCount} novas, ${retriedCount} reprocessadas, ${errorCount} erros`);
    } catch (error) {
      console.error('❌ Erro na sincronização com DOE-TO:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async downloadAndExtractPdf(url: string): Promise<string | null> {
    try {
      const safePdfUrl = validateExternalUrl(url, this.allowedHosts);

      const response = await axios.get(safePdfUrl.toString(), {
        responseType: 'arraybuffer',
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        timeout: env.PDF_DOWNLOAD_TIMEOUT_MS,
        maxRedirects: 1,
      });

      const contentTypeHeader = response.headers['content-type'];
      const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

      if (contentType && !ALLOWED_PDF_CONTENT_TYPES.some((allowed) => contentType.includes(allowed))) {
        console.error(`Conteúdo inesperado para PDF: ${contentType}`);
        return null;
      }

      const pdfBuffer = Buffer.from(response.data);
      return await extractExecutiveActsContent(pdfBuffer);
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
