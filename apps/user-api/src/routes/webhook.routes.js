import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController.js';

const router = Router();

// Official Meta WhatsApp Webhook endpoints
router.get('/whatsapp', webhookController.verifyWebhook);
router.post('/whatsapp', webhookController.receiveWebhook);

export default router;
