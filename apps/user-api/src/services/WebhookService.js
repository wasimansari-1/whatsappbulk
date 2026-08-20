import { WebhookEvent } from '../models/WebhookEvent.js';
import { webhookQueue } from '../queues/index.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';

export class WebhookService {
  verifyWebhook(hubMode, hubToken, hubChallenge) {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_bulk_saas_verify_token_2026';
    if (hubMode === 'subscribe' && hubToken === expectedToken) {
      return hubChallenge;
    }
    const error = new Error('Invalid webhook verification token');
    error.statusCode = 403;
    throw error;
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

    // 2. Parse into unified events
    const events = provider.parseWebhookPayload(rawBody);

    // 3. Persist and enqueue each event
    for (const event of events) {
      try {
        const webhookDoc = await WebhookEvent.create({
          provider: 'META',
          providerEventId: event.providerMessageId,
          eventType: event.type,
          payload: event,
          status: 'PENDING'
        });

        // Enqueue to BullMQ worker
        await webhookQueue.add('process-event', {
          eventId: webhookDoc._id,
          event
        });
      } catch (err) {
        // Ignore duplicate key error on providerEventId
        if (err.code !== 11000) {
          console.error('[WebhookService] Error saving webhook event:', err);
        }
      }
    }

    return { received: true, eventCount: events.length };
  }
}

export const webhookService = new WebhookService();
export default webhookService;
