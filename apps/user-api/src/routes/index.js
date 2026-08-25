import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import contactRoutes from './contact.routes.js';
import campaignRoutes from './campaign.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import conversationRoutes from './conversation.routes.js';
import leadRoutes from './lead.routes.js';
import billingRoutes from './billing.routes.js';
import automationRoutes from './automation.routes.js';
import webhookRoutes from './webhook.routes.js';
import complianceRoutes from './metaCompliance.routes.js';
import metaAdsRoutes from './metaAds.routes.js';
import catalogRoutes from './catalog.routes.js';
import integrationsRoutes from './integrations.routes.js';
import uploadRoutes from './upload.routes.js';

const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date(), service: 'user-api' });
});

// Meta Webhook Direct Endpoints (e.g. /api/whatsapp/webhook, /api/webhook)
apiRouter.use('/whatsapp/webhook', webhookRoutes);
apiRouter.use('/webhook', webhookRoutes);
apiRouter.use('/webhooks', webhookRoutes);

// Mount versioned v1 routes
apiRouter.use('/v1/auth', authRoutes);
apiRouter.use('/v1/dashboard', dashboardRoutes);
apiRouter.use('/v1/contacts', contactRoutes);
apiRouter.use('/v1/campaigns', campaignRoutes);
apiRouter.use('/v1/whatsapp', whatsappRoutes);
apiRouter.use('/v1/conversations', conversationRoutes);
apiRouter.use('/v1/upload', uploadRoutes);
apiRouter.use('/v1/leads', leadRoutes);
apiRouter.use('/v1/meta-ads', metaAdsRoutes);
apiRouter.use('/v1/catalog', catalogRoutes);
apiRouter.use('/v1/integrations', integrationsRoutes);
apiRouter.use('/v1/billing', billingRoutes);
apiRouter.use('/v1/automation', automationRoutes);
apiRouter.use('/v1/webhooks', webhookRoutes);
apiRouter.use('/v1/webhook', webhookRoutes);
apiRouter.use('/v1/compliance', complianceRoutes);

export default apiRouter;

