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

const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date(), service: 'user-api' });
});

// Mount versioned v1 routes
apiRouter.use('/v1/auth', authRoutes);
apiRouter.use('/v1/dashboard', dashboardRoutes);
apiRouter.use('/v1/contacts', contactRoutes);
apiRouter.use('/v1/campaigns', campaignRoutes);
apiRouter.use('/v1/whatsapp', whatsappRoutes);
apiRouter.use('/v1/conversations', conversationRoutes);
apiRouter.use('/v1/leads', leadRoutes);
apiRouter.use('/v1/billing', billingRoutes);
apiRouter.use('/v1/automation', automationRoutes);
apiRouter.use('/v1/webhooks', webhookRoutes);

export default apiRouter;
