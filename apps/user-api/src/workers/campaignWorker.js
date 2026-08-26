import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Contact } from '../models/Contact.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { Wallet } from '../models/Wallet.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { whatsAppService } from '../services/WhatsAppService.js';
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

      // 1. Campaign state gate (check if paused or cancelled)
      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign || campaign.status === 'PAUSED' || campaign.status === 'CANCELLED') {
        return { skipped: true, reason: `Campaign status is ${campaign?.status || 'UNKNOWN'}` };
      }

      // 2. Idempotency check
      const recipient = await CampaignRecipient.findById(recipientId);
      if (!recipient || recipient.status === 'SENT' || recipient.status === 'DELIVERED' || recipient.status === 'READ') {
        return { skipped: true, reason: 'Already processed' };
      }

      // 3. Opt-out compliance gate: Never send marketing campaigns to opted-out contacts
      const contact = recipient.contactId ? await Contact.findById(recipient.contactId).lean() : null;
      if (contact?.status === 'OPT_OUT') {
        recipient.status = 'FAILED';
        recipient.errorMessage = 'Skipped: Contact opted out from WhatsApp marketing messages.';
        recipient.failedAt = new Date();
        await recipient.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { 'stats.failed': 1, 'stats.queued': -1 }
        });

        console.log(`[CampaignWorker] Skipped recipient ${phone} - Contact has OPT_OUT status.`);
        return { skipped: true, reason: 'Contact opted out' };
      }

      const token = await whatsAppService.getTenantToken(organizationId);
      const provider = getWhatsAppProvider();

      const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
      const targetPhoneId = phoneNumberId || activePhone?.phoneNumberId || process.env.META_PHONE_NUMBER_ID || '1252085087993302';

      try {
        // 2. Send via provider
        const result = await provider.sendTemplateMessage(
          {
            phoneNumberId: targetPhoneId,
            to: phone,
            templateName,
            language,
            components
          },
          token
        );

        const providerMessageId = result.messageId || result.messages?.[0]?.id;

        // 3. Update recipient record
        recipient.status = 'SENT';
        recipient.providerMessageId = providerMessageId;
        recipient.sentAt = new Date();
        await recipient.save();

        // 4. Resolve Template Body Text for Inbox visibility
        let templateDoc = await WhatsAppTemplate.findOne({ organizationId, name: templateName }).lean();
        if (!templateDoc) {
          templateDoc = await WhatsAppTemplate.findOne({ name: templateName }).lean();
        }
        const bodyTemplateText = templateDoc?.components?.find((c) => c.type === 'BODY')?.text || `Template: ${templateName}`;
        const recipientName = contact?.name || recipient?.name || 'Customer';
        const renderedMessageText = bodyTemplateText.replace(/\{\{1\}\}/g, recipientName);

        // 5. Create / Update Conversation for Live Inbox
        let conversation = null;
        if (recipient.contactId) {
          conversation = await Conversation.findOneAndUpdate(
            {
              organizationId,
              contactId: recipient.contactId,
              channel: 'WHATSAPP'
            },
            {
              $set: {
                status: 'ACTIVE',
                lastMessage: {
                  text: renderedMessageText,
                  sender: 'AGENT',
                  sentAt: new Date(),
                  status: 'SENT'
                }
              }
            },
            { upsert: true, new: true }
          ).populate('contactId assignedTo');
        }

        // 6. Create outbound Message log with complete rendered content
        const outboundMsg = await Message.create({
          organizationId,
          contactId: recipient.contactId,
          whatsappPhoneNumberId: campaign?.whatsappPhoneNumberId || activePhone?._id,
          campaignId,
          direction: 'OUTBOUND',
          type: 'TEMPLATE',
          content: {
            text: renderedMessageText,
            templateName,
            templateLanguage: language,
            templateVariables: [recipientName]
          },
          status: 'SENT',
          providerMessageId
        });

        // 7. Emit Live Socket.IO events to Inbox in real-time (0ms update)
        if (conversation) {
          emitToOrganization(organizationId, 'conversation.message', {
            conversationId: conversation._id,
            contactId: recipient.contactId,
            message: outboundMsg
          });
          emitToOrganization(organizationId, 'conversation.updated', {
            conversation
          });
        }

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
            $inc: { 'stats.failed': 1, 'stats.queued': -1 },
            $set: { lastErrorMessage: error.message }
          },
          { new: true }
        );

        if (updatedCampaign) {
          emitToOrganization(organizationId, 'campaign.progress', {
            campaignId,
            stats: updatedCampaign.stats,
            status: updatedCampaign.status,
            lastErrorMessage: error.message
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
