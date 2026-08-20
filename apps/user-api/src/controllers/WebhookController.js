import { webhookService } from '../services/WebhookService.js';

export class WebhookController {
  // GET /api/v1/webhooks/whatsapp - Meta Verification Handshake
  verifyWebhook(req, res, next) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const responseChallenge = webhookService.verifyWebhook(mode, token, challenge);
      res.status(200).send(responseChallenge);
    } catch (error) {
      res.status(error.statusCode || 403).send('Verification failed');
    }
  }

  // POST /api/v1/webhooks/whatsapp - Ingestion
  async receiveWebhook(req, res, next) {
    try {
      const signature = req.headers['x-hub-signature-256'];
      // Fast acknowledge to Meta within 200ms
      res.status(200).json({ status: 'EVENT_RECEIVED' });

      // Process asynchronously in background
      await webhookService.processIncomingWebhook(req.body, signature, req.headers);
    } catch (error) {
      console.error('[WebhookController] Ingestion error:', error.message);
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
