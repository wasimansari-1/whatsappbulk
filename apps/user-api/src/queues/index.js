import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

const defaultQueueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 5000
    },
    removeOnFail: {
      age: 604800 // Keep failed jobs for 7 days
    }
  }
};

export const campaignQueue = new Queue('campaign-send', defaultQueueConfig);
export const messageQueue = new Queue('message-send', defaultQueueConfig);
export const webhookQueue = new Queue('webhook-process', defaultQueueConfig);
export const contactImportQueue = new Queue('contact-import', defaultQueueConfig);
export const notificationQueue = new Queue('notification-send', defaultQueueConfig);

export const allQueues = [
  campaignQueue,
  messageQueue,
  webhookQueue,
  contactImportQueue,
  notificationQueue
];

export async function getQueuesHealth() {
  const statuses = await Promise.all(
    allQueues.map(async (q) => {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getCompletedCount(),
          q.getFailedCount(),
          q.getDelayedCount()
        ]);
        return {
          name: q.name,
          status: 'HEALTHY',
          counts: { waiting, active, completed, failed, delayed }
        };
      } catch (err) {
        return {
          name: q.name,
          status: 'ERROR',
          error: err.message
        };
      }
    })
  );
  return statuses;
}

export default {
  campaignQueue,
  messageQueue,
  webhookQueue,
  contactImportQueue,
  notificationQueue,
  getQueuesHealth
};
