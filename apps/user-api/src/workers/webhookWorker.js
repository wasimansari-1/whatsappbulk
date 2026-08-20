import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { Message } from '../models/Message.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Campaign } from '../models/Campaign.js';
import { Conversation } from '../models/Conversation.js';
import { Contact } from '../models/Contact.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { automationService } from '../services/AutomationService.js';
import { emitToOrganization } from '../sockets/index.js';

export function initWebhookWorker() {
  const worker = new Worker(
    'webhook-process',
    async (job) => {
      const { event } = job.data;
      if (!event) return { skipped: true };

      // Case 1: Status Update (SENT, DELIVERED, READ, FAILED)
      if (event.type === 'MESSAGE_STATUS') {
        const { providerMessageId, status } = event;
        const msg = await Message.findOne({ providerMessageId });
        if (!msg) return { skipped: true, reason: 'Message not found in database' };

        msg.status = status;
        await msg.save();

        const orgId = msg.organizationId;

        // If part of campaign, update recipient and aggregate campaign stats
        if (msg.campaignId) {
          const recipient = await CampaignRecipient.findOne({
            organizationId: orgId,
            providerMessageId
          });

          if (recipient) {
            recipient.status = status;
            if (status === 'DELIVERED') recipient.deliveredAt = new Date();
            if (status === 'READ') recipient.readAt = new Date();
            await recipient.save();

            const statField = status.toLowerCase(); // 'delivered' or 'read'
            if (['delivered', 'read'].includes(statField)) {
              const updatedCampaign = await Campaign.findByIdAndUpdate(
                msg.campaignId,
                { $inc: { [`stats.${statField}`]: 1 } },
                { new: true }
              );

              if (updatedCampaign) {
                emitToOrganization(orgId, 'campaign.progress', {
                  campaignId: msg.campaignId,
                  stats: updatedCampaign.stats,
                  status: updatedCampaign.status
                });
              }
            }
          }
        }

        // Update monthly usage counters
        const currentMonth = new Date().toISOString().substring(0, 7);
        if (status === 'DELIVERED') {
          await UsageRecord.findOneAndUpdate(
            { organizationId: orgId, period: currentMonth },
            { $inc: { messagesDelivered: 1 } }
          );
        } else if (status === 'READ') {
          await UsageRecord.findOneAndUpdate(
            { organizationId: orgId, period: currentMonth },
            { $inc: { messagesRead: 1 } }
          );
        }

        // Emit message status update to live inbox
        emitToOrganization(orgId, 'message.status', {
          messageId: msg._id,
          providerMessageId,
          status,
          contactId: msg.contactId
        });

        return { success: true, processed: 'MESSAGE_STATUS', status };
      }

      // Case 2: Incoming Customer Message from WhatsApp
      if (event.type === 'INCOMING_MESSAGE') {
        const { from, text, buttonPayload, providerMessageId, name } = event;
        const normalizedPhone = from.toString().replace(/\D/g, '');

        // Find or create contact
        let contact = await Contact.findOne({ phone: normalizedPhone });
        if (!contact) {
          contact = await Contact.findOne({ phone: { $regex: normalizedPhone } });
        }

        if (!contact) {
          // Auto-create contact for new incoming customer
          const defaultOrg = await Contact.findOne().select('organizationId').lean();
          if (defaultOrg) {
            contact = await Contact.create({
              organizationId: defaultOrg.organizationId,
              name: name || `Customer +${normalizedPhone}`,
              phone: normalizedPhone,
              status: 'ACTIVE',
              channel: 'WHATSAPP'
            });
          }
        }

        if (contact) {
          const orgId = contact.organizationId;

          const incomingMsg = await Message.create({
            organizationId: orgId,
            contactId: contact._id,
            direction: 'INBOUND',
            type: 'TEXT',
            content: { text: text || 'Button Selection' },
            status: 'DELIVERED',
            providerMessageId
          });

          // Update conversation
          await Conversation.findOneAndUpdate(
            { organizationId: orgId, contactId: contact._id },
            {
              $set: {
                lastMessage: {
                  text: text || 'Button Click',
                  sender: 'CONTACT',
                  sentAt: new Date(),
                  status: 'DELIVERED'
                },
                status: 'ACTIVE'
              },
              $inc: { unreadCount: 1 }
            },
            { upsert: true }
          );

          contact.lastRepliedAt = new Date();
          await contact.save();

          // Emit live incoming message event to live inbox
          emitToOrganization(orgId, 'conversation.message', {
            contactId: contact._id,
            message: incomingMsg
          });

          // Trigger automated Chatbot workflows
          try {
            await automationService.processIncomingMessage(orgId, contact, text, buttonPayload);
          } catch (botErr) {
            console.error('[WebhookWorker] Chatbot execution error:', botErr.message);
          }
        }

        return { success: true, processed: 'INCOMING_MESSAGE' };
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
