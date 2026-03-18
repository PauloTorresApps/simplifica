import { PrismaClient } from '@prisma/client';
import { env } from './env';

class Database {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    }
    return Database.instance;
  }

  static async connect(): Promise<void> {
    const prisma = Database.getInstance();
    await prisma.$connect();
    console.log('✅ Database connected');
  }

  static async disconnect(): Promise<void> {
    const prisma = Database.getInstance();
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
}

export const prisma = Database.getInstance();
export default Database;
