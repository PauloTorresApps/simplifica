import 'dotenv/config';
import { buildApp } from './app';
import { env } from './config/env';
import Database from './config/database';
import { FetchPublicationsJob } from './jobs/fetch-publications.job';
import { SummaryJobRepository } from './modules/summaries/summary-job.repository';

async function start() {
  try {
    // Connect to database
    await Database.connect();

    // Mark stale processing jobs as failed so users can retry after restarts
    const staleBefore = new Date(
      Date.now() - env.SUMMARY_JOB_STALE_MINUTES * 60 * 1000
    );
    const staleJobsCount = await new SummaryJobRepository().markStaleProcessingJobsAsFailed(
      staleBefore
    );
    if (staleJobsCount > 0) {
      console.log(`⚠️ ${staleJobsCount} job(s) de resumo antigo(s) marcado(s) como FAILED.`);
    }

    // Build Fastify app
    const app = await buildApp();

    // Start fetch publications job
    const fetchJob = new FetchPublicationsJob();
    fetchJob.start();

    // Run initial sync in development
    if (env.NODE_ENV === 'development') {
      console.log('🔄 Executando sincronização inicial...');
      fetchJob.runOnce().catch((err) => {
        console.error('Erro na sincronização inicial:', err);
      });
    }

    // Start server
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    const docsLine =
      env.NODE_ENV === 'production'
        ? '📚 Docs: desabilitada em produção'
        : `📚 Docs: http://localhost:${env.PORT}/docs`;

    console.log(`
🚀 Simplifica API rodando!
📍 URL: http://localhost:${env.PORT}
${docsLine}
🏥 Health: http://localhost:${env.PORT}/health
    `);
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await Database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await Database.disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  console.error('⚠️ Promise rejeitada sem tratamento:', message);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Exceção não tratada:', error);

  try {
    await Database.disconnect();
  } catch {
    // no-op
  }

  process.exit(1);
});

start();
