import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { ApiKey } from '../models/ApiKey.js';
import crypto from 'crypto';

export class IntegrationsService {
  async getIntegrations(organizationId) {
    let integrations = await IntegrationConfig.find({ organizationId }).lean();

    if (!integrations || integrations.length === 0) {
      const defaultConnectors = [
        {
          organizationId,
          type: 'SHOPIFY',
          name: 'Shopify E-Commerce Store',
          status: 'CONNECTED',
          config: {
            shopDomain: 'arveetech.myshopify.com',
            abandonedCartRecovery: true,
            orderConfirmation: true
          },
          eventsSubscribed: ['orders/create', 'orders/fulfilled', 'checkouts/abandoned']
        },
        {
          organizationId,
          type: 'RAZORPAY',
          name: 'Razorpay & UPI Payments',
          status: 'CONNECTED',
          config: {
            merchantId: 'rzp_live_98129038',
            autoSendReceipts: true
          },
          eventsSubscribed: ['payment.captured', 'payment.failed']
        },
        {
          organizationId,
          type: 'GOOGLE_SHEETS',
          name: 'Google Sheets Live Sync',
          status: 'CONNECTED',
          config: {
            sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            autoExportLeads: true
          },
          eventsSubscribed: ['lead.created', 'message.received']
        },
        {
          organizationId,
          type: 'WEBHOOK',
          name: 'Custom Webhook Dispatcher',
          status: 'CONNECTED',
          webhookUrl: 'https://api.yourdomain.com/webhook/whatsapp-events',
          eventsSubscribed: ['messages.all', 'leads.stage_changed']
        }
      ];

      await IntegrationConfig.insertMany(defaultConnectors);
      integrations = await IntegrationConfig.find({ organizationId }).lean();
    }

    return integrations;
  }

  async toggleIntegration(organizationId, type) {
    const integration = await IntegrationConfig.findOne({ organizationId, type });
    if (!integration) throw new Error('Integration not found');

    integration.status = integration.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    await integration.save();
    return integration.toObject();
  }

  async getApiKeys(organizationId) {
    let keys = await ApiKey.find({ organizationId }).sort({ createdAt: -1 }).lean();
    if (!keys || keys.length === 0) {
      const newKey = await ApiKey.create({
        organizationId,
        name: 'Production Server API Key',
        key: `wapp_live_${crypto.randomBytes(24).toString('hex')}`,
        status: 'ACTIVE'
      });
      keys = [newKey.toObject()];
    }
    return keys;
  }

  async generateApiKey(organizationId, name) {
    const key = `wapp_live_${crypto.randomBytes(24).toString('hex')}`;
    const apiKey = await ApiKey.create({
      organizationId,
      name: name || 'Developer REST API Key',
      key,
      status: 'ACTIVE'
    });
    return apiKey.toObject();
  }
}

export const integrationsService = new IntegrationsService();
export default integrationsService;
