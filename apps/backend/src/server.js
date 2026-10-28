import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import prisma from './config/prisma.js';

const server = app.listen(config.port, () => {
  logger.info(`🚀 AI Learning Companion Backend running on port ${config.port}`, {
    env: config.nodeEnv,
    frontendUrl: config.frontendUrl,
    aiProvider: config.aiProvider
  });
});

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Closed HTTP server and database connections.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
