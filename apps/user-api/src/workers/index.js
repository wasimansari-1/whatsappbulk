import { initCampaignWorker } from './campaignWorker.js';
import { initWebhookWorker } from './webhookWorker.js';
import { initImportWorker } from './importWorker.js';

export function startWorkers() {
  console.log('[Workers] Starting distributed BullMQ background workers...');
  const campaignWorker = initCampaignWorker();
  const webhookWorker = initWebhookWorker();
  const importWorker = initImportWorker();

  return {
    campaignWorker,
    webhookWorker,
    importWorker
  };
}

export default startWorkers;
