import { WebhookEvent } from '../models/WebhookEvent.js';
import { webhookQueue } from '../queues/index.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { FacebookPageConnection } from '../models/FacebookPageConnection.js';
import { Lead } from '../models/Lead.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Contact } from '../models/Contact.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { Organization } from '../models/Organization.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Campaign } from '../models/Campaign.js';
import { metaClient } from './metaClient.js';
import { decrypt } from '../utils/encryption.js';
import { emitToOrganization } from '../sockets/index.js';
import { automationService } from './AutomationService.js';

// Sequential execution queue map keyed by `${organizationId}:${normalizedPhone}`
const phoneLocks = new Map();

function runSequentialForPhone(phoneKey, taskFn) {
  const previousPromise = phoneLocks.get(phoneKey) || Promise.resolve();
  const currentPromise = previousPromise
    .catch(() => {}) // Don't let previous error block future messages
    .then(async () => {
      return await taskFn();
    });

  phoneLocks.set(phoneKey, currentPromise);

  currentPromise.finally(() => {
    if (phoneLocks.get(phoneKey) === currentPromise) {
      phoneLocks.delete(phoneKey);
    }
  });

  return currentPromise;
}

export class WebhookService {
  verifyWebhook(hubMode, hubToken, hubChallenge) {
    const expectedToken = (
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      'whatsapp_bulk_saas_verify_token_2026'
    ).trim();

    if (hubMode === 'subscribe' && hubToken === expectedToken) {
      return hubChallenge;
    }
    const error = new Error('Invalid webhook verification token');
    error.statusCode = 403;
    throw error;
  }

  async processWebhookEvent(event) {
    if (!event) return { skipped: true };

    // Update phone number last webhook timestamp if phone number ID present
    if (event.phoneNumberId) {
      await WhatsAppPhoneNumber.updateOne(
        { phoneNumberId: event.phoneNumberId },
        { $set: { lastWebhookAt: new Date() } }
      );
    }

    // Case 1: Status Update (SENT, DELIVERED, READ, FAILED)
    if (event.type === 'MESSAGE_STATUS') {
      const { providerMessageId, status } = event;
      const normalizedStatus = (status || '').toUpperCase();

      let msg = await Message.findOne({ providerMessageId });

      // Auto-reconciliation: If message was accepted by Meta but local DB write had a transient failure
      if (!msg) {
        // 1. Try resolving via CampaignRecipient
        const recipient = await CampaignRecipient.findOne({ providerMessageId });
        if (recipient) {
          msg = await Message.create({
            organizationId: recipient.organizationId,
            campaignId: recipient.campaignId,
            contactId: recipient.contactId,
            direction: 'OUTBOUND',
            channel: 'WHATSAPP',
            type: 'TEMPLATE',
            content: { text: `[Reconciled Message - ${normalizedStatus}]` },
            status: normalizedStatus,
            providerMessageId
          });
          console.log(`[WebhookService] Auto-reconciled missing campaign message for wamid: ${providerMessageId}`);
        } else if (event.recipient_id || event.from) {
          const recipientPhone = (event.recipient_id || event.from || '').toString().replace(/\D/g, '');
          const phoneDoc = event.phoneNumberId ? await WhatsAppPhoneNumber.findOne({ phoneNumberId: String(event.phoneNumberId) }) : null;
          if (phoneDoc && recipientPhone) {
            let contact = await Contact.findOne({ organizationId: phoneDoc.organizationId, phone: recipientPhone });
            if (!contact) {
              contact = await Contact.create({
                organizationId: phoneDoc.organizationId,
                name: `Customer +${recipientPhone}`,
                phone: recipientPhone,
                channel: 'WHATSAPP',
                status: 'ACTIVE'
              });
            }
            msg = await Message.create({
              organizationId: phoneDoc.organizationId,
              whatsappPhoneNumberId: phoneDoc._id,
              contactId: contact._id,
              direction: 'OUTBOUND',
              channel: 'WHATSAPP',
              type: 'TEXT',
              content: { text: `[Reconciled Outbound Message - ${normalizedStatus}]` },
              status: normalizedStatus,
              providerMessageId
            });
            console.log(`[WebhookService] Auto-reconciled missing direct message for wamid: ${providerMessageId}`);
          }
        }
      }

      if (!msg) return { skipped: true, reason: 'Message not found in database' };

      msg.status = normalizedStatus;
      await msg.save();

      const orgId = msg.organizationId;

      // If part of campaign, update recipient and aggregate campaign stats
      if (msg.campaignId) {
        const recipient = await CampaignRecipient.findOne({
          organizationId: orgId,
          providerMessageId
        });

        if (recipient) {
          recipient.status = normalizedStatus;
          if (normalizedStatus === 'DELIVERED') recipient.deliveredAt = new Date();
          if (normalizedStatus === 'READ') recipient.readAt = new Date();
          await recipient.save();

          const statField = normalizedStatus.toLowerCase();
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
      if (normalizedStatus === 'DELIVERED') {
        await UsageRecord.findOneAndUpdate(
          { organizationId: orgId, period: currentMonth },
          { $inc: { messagesDelivered: 1 } },
          { upsert: true }
        );
      } else if (normalizedStatus === 'READ') {
        await UsageRecord.findOneAndUpdate(
          { organizationId: orgId, period: currentMonth },
          { $inc: { messagesRead: 1 } },
          { upsert: true }
        );
      }

      // Update conversation lastMessage status if matching
      await Conversation.updateOne(
        { organizationId: orgId, contactId: msg.contactId },
        { $set: { 'lastMessage.status': normalizedStatus } }
      );

      // Emit message status update to live inbox
      emitToOrganization(orgId, 'message.status', {
        messageId: msg._id,
        providerMessageId,
        status: normalizedStatus,
        contactId: msg.contactId
      });

      return { success: true, processed: 'MESSAGE_STATUS', status: normalizedStatus };
    }

    // Case 2: Incoming Customer Message from WhatsApp
    if (event.type === 'INCOMING_MESSAGE') {
      const { from, text, buttonPayload, providerMessageId, name, phoneNumberId } = event;
      const normalizedPhone = from.toString().replace(/\D/g, '');

      // Duplicate message prevention using Meta message ID
      if (providerMessageId) {
        const existingMsg = await Message.findOne({ providerMessageId });
        if (existingMsg) {
          console.log(`[WebhookService] Duplicate WhatsApp message ${providerMessageId} skipped.`);
          return { skipped: true, reason: 'Duplicate message' };
        }
      }

      // Resolve exact tenant from phoneNumberId, wabaId, or displayPhoneNumber
      let activePhoneDoc = null;
      let targetOrgId = null;

      if (phoneNumberId) {
        activePhoneDoc = await WhatsAppPhoneNumber.findOne({ phoneNumberId: String(phoneNumberId) }).lean();
      }
      if (!activePhoneDoc && event.wabaId) {
        activePhoneDoc = await WhatsAppPhoneNumber.findOne({ wabaId: String(event.wabaId) }).lean();
      }
      if (!activePhoneDoc && (event.wabaId || phoneNumberId)) {
        const accountDoc = await WhatsAppAccount.findOne({
          $or: [
            ...(event.wabaId ? [{ wabaId: String(event.wabaId) }] : []),
            ...(phoneNumberId ? [{ phoneNumberId: String(phoneNumberId) }] : [])
          ]
        }).lean();
        if (accountDoc) {
          targetOrgId = accountDoc.organizationId;
        }
      }
      if (!activePhoneDoc && event.displayPhoneNumber) {
        const cleanDisp = event.displayPhoneNumber.replace(/\D/g, '');
        activePhoneDoc = await WhatsAppPhoneNumber.findOne({
          $or: [
            { displayPhoneNumber: new RegExp(cleanDisp.slice(-10)) },
            { phoneNumber: new RegExp(cleanDisp.slice(-10)) }
          ]
        }).lean();
      }
      if (!targetOrgId && activePhoneDoc) {
        targetOrgId = activePhoneDoc.organizationId;
      }
      if (!targetOrgId) {
        const iglobalOrg = await Organization.findOne({ name: /IGlobal Tech/i }).lean();
        if (iglobalOrg) {
          targetOrgId = iglobalOrg._id;
          activePhoneDoc = await WhatsAppPhoneNumber.findOne({ organizationId: iglobalOrg._id }).lean();
        }
      }

      let contact = null;
      if (targetOrgId) {
        contact = await Contact.findOne({ organizationId: targetOrgId, phone: normalizedPhone });
      }

      if (!targetOrgId) {
        console.warn(`[WebhookService] Unknown WhatsApp PhoneNumberId ${phoneNumberId}. Incoming message from ${normalizedPhone} skipped to prevent cross-tenant leak.`);
        return { skipped: true, reason: 'No matching tenant found for this phone number' };
      }

      if (!contact) {
        contact = await Contact.create({
          organizationId: targetOrgId,
          name: name || `Customer +${normalizedPhone}`,
          phone: normalizedPhone,
          status: 'ACTIVE',
          channel: 'WHATSAPP'
        });
      } else if (name && contact.name?.startsWith('Customer +')) {
        contact.name = name;
      }

      let mediaUrl = null;
      let downloadedFilename = event.filename;

      if (event.mediaId) {
        try {
          const provider = getWhatsAppProvider();
          const token = activePhoneDoc?.accessToken
            ? (activePhoneDoc.accessToken.includes(':') ? decrypt(activePhoneDoc.accessToken) : activePhoneDoc.accessToken)
            : (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN);

          const downloaded = await provider.downloadMedia(event.mediaId, token);
          if (downloaded?.localUrl) {
            mediaUrl = downloaded.localUrl;
            if (!downloadedFilename) downloadedFilename = downloaded.filename;
            console.log(`[WebhookService] Successfully downloaded inbound media ${event.mediaId} to ${mediaUrl}`);
          }
        } catch (mediaErr) {
          console.error(`[WebhookService] Failed to download inbound media ${event.mediaId}:`, mediaErr.message);
        }
      }

      const displaySnippet = text || (event.messageType === 'IMAGE' ? '📷 Photo' : (event.messageType === 'DOCUMENT' ? (downloadedFilename || '📄 Document') : (event.messageType === 'AUDIO' || event.messageType === 'VOICE' ? '🎵 Voice Message' : (event.messageType === 'LOCATION' ? '📍 Location' : 'Incoming message'))));

      // Sequential per-customer execution mutex
      return await runSequentialForPhone(`${targetOrgId}:${normalizedPhone}`, async () => {
        // Double check duplicate inside critical section
        if (providerMessageId) {
          const existing = await Message.findOne({ providerMessageId });
          if (existing) {
            console.log(`[WebhookService] Duplicate caught inside sequential lock: ${providerMessageId}`);
            return { skipped: true, reason: 'Duplicate message inside lock' };
          }
        }

        // Save inbound message atomically
        let incomingMsg = null;
        try {
          incomingMsg = await Message.create({
            organizationId: targetOrgId,
            contactId: contact._id,
            whatsappPhoneNumberId: activePhoneDoc?._id,
            direction: 'INBOUND',
            channel: 'WHATSAPP',
            type: event.messageType || 'TEXT',
            content: {
              text: text || event.caption || (event.messageType === 'LOCATION' ? '📍 Location shared' : ''),
              mediaUrl,
              filename: downloadedFilename,
              location: event.location || null
            },
            status: 'DELIVERED',
            providerMessageId
          });
        } catch (dbErr) {
          if (dbErr.code === 11000 || dbErr.message?.includes('duplicate key') || dbErr.message?.includes('E11000')) {
            console.log(`[WebhookService] Atomic duplicate key caught for ${providerMessageId}. Skipping.`);
            return { skipped: true, reason: 'Duplicate message (E11000)' };
          }
          throw dbErr;
        }

        // Update existing conversation model
        await Conversation.findOneAndUpdate(
          { organizationId: targetOrgId, contactId: contact._id },
          {
            $set: {
              lastMessage: {
                text: displaySnippet,
                sender: 'CONTACT',
                sentAt: new Date(),
                status: 'DELIVERED'
              },
              status: 'ACTIVE'
            },
            $inc: { unreadCount: 1 },
            $setOnInsert: {
              organizationId: targetOrgId,
              contactId: contact._id,
              channel: 'WHATSAPP'
            }
          },
          { upsert: true, new: true }
        );

        // Reset 24-hour customer service window timestamp
      contact.lastRepliedAt = new Date();
      contact.lastContactedAt = new Date();

      // Check for Automated STOP / Opt-Out Keywords
      const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'arret', 'remove', 'dnd'];
      const incomingTextLower = (text || '').trim().toLowerCase();
      const isOptOut = optOutKeywords.includes(incomingTextLower);

      if (isOptOut) {
        const optOutDate = new Date();
        const kw = (text || '').trim();
        await Contact.updateOne(
          { _id: contact._id },
          {
            $set: {
              status: 'OPT_OUT',
              optOutAt: optOutDate,
              optOutKeyword: kw,
              optOutSource: 'WHATSAPP_INBOUND'
            }
          }
        );

        console.log(`[WebhookService] Contact ${contact.phone} successfully opted out via keyword: "${kw}".`);
        emitToOrganization(targetOrgId, 'contact.opt_out', {
          contactId: contact._id,
          phone: contact.phone,
          optOutAt: optOutDate,
          keyword: kw
        });
      } else if (contact.status === 'OPT_OUT') {
        if (['start', 'unstop', 'resume', 'subscribe'].includes(incomingTextLower)) {
          await Contact.updateOne(
            { _id: contact._id },
            {
              $set: {
                status: 'ACTIVE',
                optOutAt: null,
                optOutKeyword: null
              }
            }
          );
          console.log(`[WebhookService] Contact ${contact.phone} re-subscribed via keyword: "${(text || '').trim()}".`);
        }
      }

      // Emit live real-time update to existing Inbox
      emitToOrganization(targetOrgId, 'conversation.message', {
        contactId: contact._id,
        message: incomingMsg
      });

      // Trigger automated Chatbot workflows if configured (Ignore stale webhooks older than 2 minutes)
      try {
        const eventTime = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
        const messageAgeSeconds = (Date.now() - eventTime) / 1000;

        if (messageAgeSeconds > 120) {
          console.log(`[WebhookService] ⏳ Stale webhook received (${Math.round(messageAgeSeconds)}s old). Message stored in inbox, Chatbot trigger skipped.`);
        } else {
          await automationService.processIncomingMessage(targetOrgId, contact, text, buttonPayload);
        }
      } catch (botErr) {
        console.error('[WebhookService] Chatbot execution error:', botErr.message);
      }

      return { success: true, processed: 'INCOMING_MESSAGE', messageId: incomingMsg._id };
    });
  }

    // Case 3: Coexistence Echo Message (Sent from physical WhatsApp Business App)
    if (event.type === 'COEXISTENCE_ECHO_MESSAGE') {
      const { text, providerMessageId, phoneNumberId, from } = event;
      const activePhoneDoc = await WhatsAppPhoneNumber.findOne({ phoneNumberId }).lean();
      if (activePhoneDoc) {
        const orgId = activePhoneDoc.organizationId;
        const normalizedRecipient = (from || '').toString().replace(/\D/g, '');
        const contact = await Contact.findOne({ organizationId: orgId, phone: normalizedRecipient });

        if (contact) {
          const echoMsg = await Message.create({
            organizationId: orgId,
            contactId: contact._id,
            direction: 'OUTBOUND',
            channel: 'WHATSAPP',
            type: 'TEXT',
            content: { text },
            status: 'SENT',
            providerMessageId
          });

          await Conversation.findOneAndUpdate(
            { organizationId: orgId, contactId: contact._id },
            {
              $set: {
                lastMessage: {
                  text,
                  sender: 'AGENT',
                  sentAt: new Date(),
                  status: 'SENT'
                }
              }
            }
          );

          emitToOrganization(orgId, 'conversation.message', {
            contactId: contact._id,
            message: echoMsg
          });
        }
      }
      return { success: true, processed: 'COEXISTENCE_ECHO_MESSAGE' };
    }

    // Case 4: Template Status Update from Meta (APPROVED, REJECTED, PAUSED)
    if (event.type === 'TEMPLATE_STATUS') {
      const { templateName, templateLanguage, status, reason, templateId } = event;
      const normalizedStatus = (status || '').toUpperCase();

      const updatedTpl = await WhatsAppTemplate.findOneAndUpdate(
        {
          $or: [
            { providerTemplateId: templateId },
            { name: templateName, language: templateLanguage || 'en_US' }
          ]
        },
        {
          $set: {
            status: normalizedStatus,
            rejectionReason: reason || null
          }
        },
        { new: true }
      );

      if (updatedTpl) {
        emitToOrganization(updatedTpl.organizationId, 'template.status', {
          templateId: updatedTpl._id,
          name: updatedTpl.name,
          status: normalizedStatus,
          reason
        });
      }

      return { success: true, processed: 'TEMPLATE_STATUS', status: normalizedStatus };
    }

    return { processed: false, type: event.type };
  }

  async processIncomingWebhook(rawBody, signature, headers) {
    const provider = getWhatsAppProvider();

    // 1. Verify signature if configured
    if (process.env.NODE_ENV === 'production' && process.env.META_APP_SECRET) {
      const isValid = provider.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        const error = new Error('Invalid webhook signature');
        error.statusCode = 401;
        throw error;
      }
    }

    // 2. Handle Meta Leadgen Webhook Events
    if (rawBody?.object === 'page' && Array.isArray(rawBody.entry)) {
      for (const entry of rawBody.entry) {
        const pageId = entry.id;
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'leadgen' && change.value?.leadgen_id) {
            const leadgenId = change.value.leadgen_id;
            const formId = change.value.form_id;
            const campaignId = change.value.campaign_id;
            const adId = change.value.ad_id;

            console.log(`[WebhookService] Received Meta Leadgen Webhook for Page: ${pageId}, Lead: ${leadgenId}`);

            const connection = await FacebookPageConnection.findOne({ pageId, status: 'CONNECTED' })
              .select('+encryptedPageToken +encryptedAccessToken');

            if (connection) {
              try {
                let pageToken = null;
                if (connection.encryptedPageToken) {
                  pageToken = decrypt(connection.encryptedPageToken);
                } else if (connection.encryptedAccessToken) {
                  pageToken = decrypt(connection.encryptedAccessToken);
                }

                const leadDataRes = await metaClient.getLead(leadgenId, pageToken);
                const leadData = leadDataRes.success ? leadDataRes.data : null;

                let name = 'Meta Lead';
                let phone = '';
                let email = '';
                let city = '';

                if (leadData?.field_data) {
                  for (const field of leadData.field_data) {
                    const fname = field.name?.toLowerCase();
                    const val = field.values?.[0] || '';
                    if (fname.includes('full_name') || fname.includes('name')) name = val || name;
                    else if (fname.includes('phone')) phone = val;
                    else if (fname.includes('email')) email = val;
                    else if (fname.includes('city')) city = val;
                  }
                }

                if (phone) {
                  const savedLead = await Lead.findOneAndUpdate(
                    { organizationId: connection.organizationId, metaLeadId: leadgenId },
                    {
                      organizationId: connection.organizationId,
                      metaLeadId: leadgenId,
                      name: name || 'Lead ' + phone.slice(-4),
                      phone: phone.replace(/[^0-9]/g, ''),
                      email: email || undefined,
                      city: city || undefined,
                      pageId,
                      pageName: connection.pageName,
                      metaCampaignId: campaignId,
                      metaFormId: formId,
                      metaAdId: adId,
                      source: 'Meta Lead Ads Form',
                      stage: 'NEW',
                      rawMetaFields: leadData?.field_data || {}
                    },
                    { upsert: true, new: true }
                  );

                  emitToOrganization(connection.organizationId, 'lead.new', { lead: savedLead });
                  console.log(`[WebhookService] Successfully ingested CRM Lead ${leadgenId} for Org: ${connection.organizationId}`);
                }
              } catch (leadErr) {
                console.error(`[WebhookService] Error fetching Meta lead ${leadgenId}:`, leadErr.message);
              }
            }
          }
        }
      }
      return { received: true, type: 'PAGE_LEADGEN' };
    }

    return { received: true, processed: false };
  }

  async ingestAndPersistWebhook(rawBody, signature, headers) {
    const provider = getWhatsAppProvider();

    // 1. Verify signature if configured
    if (process.env.NODE_ENV === 'production' && process.env.META_APP_SECRET) {
      const isValid = provider.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        const error = new Error('Invalid webhook signature');
        error.statusCode = 401;
        throw error;
      }
    }

    // 2. Parse Meta WhatsApp events
    const events = provider.parseWebhookPayload(rawBody);

    // 3. Durably persist events to WebhookEvent collection before ACK
    const persistedEvents = [];
    for (const event of events) {
      try {
        const doc = await WebhookEvent.create({
          provider: 'META',
          providerEventId: event.providerMessageId,
          eventType: event.type,
          payload: event,
          status: 'PENDING'
        });
        persistedEvents.push({ ...event, _webhookEventId: doc._id });
      } catch (dbErr) {
        // If already persisted (duplicate webhook), still include for idempotency handler
        persistedEvents.push(event);
      }
    }

    return { persisted: true, events: persistedEvents };
  }

  async dispatchEventsForProcessing(events = []) {
    for (const event of events) {
      try {
        await this.processWebhookEvent(event);
        if (event._webhookEventId) {
          await WebhookEvent.updateOne(
            { _id: event._webhookEventId },
            { $set: { status: 'PROCESSED', processedAt: new Date() } }
          );
        }
      } catch (err) {
        console.error('[WebhookService] Error processing webhook event:', err);
        if (event._webhookEventId) {
          await WebhookEvent.updateOne(
            { _id: event._webhookEventId },
            { $set: { status: 'FAILED', error: err.message } }
          );
        }
      }
    }
  }

  async processIncomingWebhook(rawBody, signature, headers) {
    const ingest = await this.ingestAndPersistWebhook(rawBody, signature, headers);
    if (ingest.events?.length > 0) {
      await this.dispatchEventsForProcessing(ingest.events);
    }
    return { received: true, eventCount: ingest.events?.length || 0 };
  }
}

export const webhookService = new WebhookService();
export default webhookService;

