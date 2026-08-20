import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Message } from '../models/Message.js';
import { Wallet } from '../models/Wallet.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { emitToOrganization } from '../sockets/index.js';

/**
 * Worker for processing individual campaign recipients
 */
export function initCampaignWorker() {
  const worker = new Worker(
    'campaign-send',
    async (job) => {
      const {
        organizationId,
        campaignId,
        recipientId,
        phone,
        templateName,
        language,
        components,
        phoneNumberId
      } = job.data;

      // 1. Idempotency check
      const recipient = await CampaignRecipient.findById(recipientId);
      if (!recipient || recipient.status === 'SENT' || recipient.status === 'DELIVERED' || recipient.status === 'READ') {
        return { skipped: true, reason: 'Already processed' };
      }

      const provider = getWhatsAppProvider();

      try {
        // 2. Send via provider
        const result = await provider.sendTemplateMessage({
          phoneNumberId,
          to: phone,
          templateName,
          language,
          components
        });

        const providerMessageId = result.messageId || result.messages?.[0]?.id;

        // 3. Update recipient record
        recipient.status = 'SENT';
        recipient.providerMessageId = providerMessageId;
        recipient.sentAt = new Date();
        await recipient.save();

        // 4. Create outbound Message log
        await Message.create({
          organizationId,
          contactId: recipient.contactId,
          campaignId,
          direction: 'OUTBOUND',
          type: 'TEMPLATE',
          content: {
            templateName,
            templateLanguage: language
          },
          status: 'SENT',
          providerMessageId
        });

        // 5. Atomic decrement on campaign stats
        const updatedCampaign = await Campaign.findByIdAndUpdate(
          campaignId,
          {
            $inc: { 'stats.sent': 1, 'stats.queued': -1 }
          },
          { new: true }
        );

        // 6. Deduct credit from Wallet (e.g. ₹0.40 per marketing message)
        const costPerMessage = 0.40;
        await Wallet.findOneAndUpdate(
          { organizationId },
          {
            $inc: { balance: -costPerMessage, usedCredits: costPerMessage }
          }
        );

        // 7. Update usage records for monthly aggregation
        const currentMonth = new Date().toISOString().substring(0, 7);
        await UsageRecord.findOneAndUpdate(
          { organizationId, period: currentMonth },
          {
            $inc: { messagesSent: 1, marketingMessages: 1 },
            $setOnInsert: {
              organizationId,
              period: currentMonth,
              periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            }
          },
          { upsert: true }
        );

        // 8. Emit live campaign progress via Socket.IO
        if (updatedCampaign) {
          emitToOrganization(organizationId, 'campaign.progress', {
            campaignId,
            stats: updatedCampaign.stats,
            status: updatedCampaign.status
          });
        }

        return { success: true, messageId: providerMessageId };
      } catch (error) {
        recipient.status = 'FAILED';
        recipient.failedAt = new Date();
        recipient.errorMessage = error.message;
        await recipient.save();

        const updatedCampaign = await Campaign.findByIdAndUpdate(
          campaignId,
          {
            $inc: { 'stats.failed': 1, 'stats.queued': -1 }
          },
          { new: true }
        );

        if (updatedCampaign) {
          emitToOrganization(organizationId, 'campaign.progress', {
            campaignId,
            stats: updatedCampaign.stats,
            status: updatedCampaign.status
          });
        }

        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 10
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[CampaignWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export default initCampaignWorker;
