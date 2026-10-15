import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/** Retries serializable transactions on PostgreSQL write/unique conflicts. */
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002');
      if (!retryable || attempt === attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * attempt));
    }
  }
  throw new Error('TRANSACTION_RETRY_EXHAUSTED');
}
