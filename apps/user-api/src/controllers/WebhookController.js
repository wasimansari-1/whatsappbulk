import { webhookService } from '../services/WebhookService.js';

export class WebhookController {
  // GET /api/whatsapp/webhook - Meta Verification Handshake
  verifyWebhook(req, res, next) {
    try {
      const mode = req.query['hub.mode'] || req.query.mode;
      const token = req.query['hub.verify_token'] || req.query.verify_token;
      const challenge = req.query['hub.challenge'] || req.query.challenge;

      const responseChallenge = webhookService.verifyWebhook(mode, token, challenge);
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(String(responseChallenge));
    } catch (error) {
      console.warn('[WebhookController] Verification failed:', error.message);
      res.status(error.statusCode || 403).send('Verification failed');
    }
  }

  // POST /api/whatsapp/webhook - Durable Ingestion
  async receiveWebhook(req, res, next) {
    try {
      const signature = req.headers['x-hub-signature-256'];

      // 1. Persist raw event durably to database / queue before acknowledging HTTP 200
      const persistPromise = webhookService.ingestAndPersistWebhook(req.body, signature, req.headers);

      // Wait for durable save (typically 5-15ms), then return HTTP 200 to Meta
      const ingestResult = await persistPromise;

      res.status(200).json({ status: 'EVENT_RECEIVED', persisted: ingestResult?.persisted || true });

      // 2. Dispatch worker / flow processing asynchronously in background
      if (ingestResult?.events && ingestResult.events.length > 0) {
        webhookService.dispatchEventsForProcessing(ingestResult.events).catch((err) => {
          console.error('[WebhookController] Background dispatch error:', err.message);
        });
      }
    } catch (error) {
      console.error('[WebhookController] Ingestion error:', error.message);
      // Return 200 to Meta on malformed payloads to avoid infinite retry loops if unprocessable
      res.status(200).json({ status: 'EVENT_RECEIVED', error: error.message });
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
