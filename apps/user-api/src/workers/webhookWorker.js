import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { webhookService } from '../services/WebhookService.js';

export function initWebhookWorker() {
  const worker = new Worker(
    'webhook-process',
    async (job) => {
      const { event } = job.data;
      if (!event) return { skipped: true };

      try {
        const result = await webhookService.processWebhookEvent(event);
        return result;
      } catch (err) {
        console.error('[WebhookWorker] Processing error:', err);
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 20
    }
  );

  return worker;
}

export default initWebhookWorker;

