import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { contactRepository } from '../repositories/ContactRepository.js';
import { emitToOrganization } from '../sockets/index.js';

export function initImportWorker() {
  const worker = new Worker(
    'contact-import',
    async (job) => {
      const { organizationId, contacts } = job.data;
      if (!contacts || contacts.length === 0) {
        return { count: 0 };
      }

      const chunkSize = 200;
      let totalInserted = 0;

      for (let i = 0; i < contacts.length; i += chunkSize) {
        const chunk = contacts.slice(i, i + chunkSize);
        const result = await contactRepository.batchInsertContacts(organizationId, chunk);
        totalInserted += result.upsertedCount || result.modifiedCount || chunk.length;

        // Emit real-time progress
        const progress = Math.min(100, Math.round(((i + chunk.length) / contacts.length) * 100));
        emitToOrganization(organizationId, 'import.progress', {
          jobId: job.id,
          progress,
          processed: i + chunk.length,
          total: contacts.length
        });
      }

      return { totalInserted };
    },
    {
      connection: redis,
      concurrency: 5
    }
  );

  return worker;
}

export default initImportWorker;
