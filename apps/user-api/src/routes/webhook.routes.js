import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController.js';

const router = Router();

// Root webhook endpoint (e.g. /api/webhook or /api/whatsapp/webhook)
router.get('/', webhookController.verifyWebhook);
router.post('/', webhookController.receiveWebhook);

router.get('/webhook', webhookController.verifyWebhook);
router.post('/webhook', webhookController.receiveWebhook);

// Official Meta WhatsApp Webhook endpoints
router.get('/whatsapp', webhookController.verifyWebhook);
router.post('/whatsapp', webhookController.receiveWebhook);

router.get('/whatsapp/webhook', webhookController.verifyWebhook);
router.post('/whatsapp/webhook', webhookController.receiveWebhook);

// Meta Leadgen & Ads endpoints
router.get('/meta', webhookController.verifyWebhook);
router.post('/meta', webhookController.receiveWebhook);

router.get('/meta-ads', webhookController.verifyWebhook);
router.post('/meta-ads', webhookController.receiveWebhook);

export default router;

