import 'dotenv/config';
import { buildApp } from './app';
import { env } from './config/env';
import Database from './config/database';
import { FetchPublicationsJob } from './jobs/fetch-publications.job';

async function start() {
  try {
    // Connect to database
    await Database.connect();

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

    console.log(`
🚀 Simplifica API rodando!
📍 URL: http://localhost:${env.PORT}
📚 Docs: http://localhost:${env.PORT}/docs
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

start();
