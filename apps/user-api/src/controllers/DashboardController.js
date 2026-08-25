import { Contact } from '../models/Contact.js';
import { Lead } from '../models/Lead.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Campaign } from '../models/Campaign.js';
import { Wallet } from '../models/Wallet.js';
import { Subscription } from '../models/Subscription.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { Organization } from '../models/Organization.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class DashboardController {
  async getDashboardData(req, res, next) {
    try {
      const organizationId = req.organizationId;
      const user = req.user;

      // 1. Parallel real database queries
      const [
        totalCustomers,
        totalLeads,
        totalTemplates,
        activeChatbotsCount,
        wallet,
        subscription,
        whatsAppAccount,
        phoneNumber,
        organization,
        activeCampaignsCount
      ] = await Promise.all([
        Contact.countDocuments({ organizationId, deletedAt: null }),
        Lead.countDocuments({ organizationId }),
        WhatsAppTemplate.countDocuments({ organizationId }),
        AutomationWorkflow.countDocuments({ organizationId, isActive: true }),
        Wallet.findOne({ organizationId }).lean(),
        Subscription.findOne({ organizationId }).populate('planId').lean(),
        WhatsAppAccount.findOne({ organizationId }).lean(),
        WhatsAppPhoneNumber.findOne({ organizationId, isDefault: true }).lean(),
        Organization.findById(organizationId).lean(),
        Campaign.countDocuments({ organizationId, status: { $in: ['QUEUED', 'PROCESSING'] } })
      ]);

      const currentPeriod = new Date().toISOString().substring(0, 7);
      const usage = (await UsageRecord.findOne({ organizationId, period: currentPeriod }).lean()) || {
        messagesSent: 0,
        utilityMessages: 0,
        serviceMessages: 0,
        marketingMessages: 0,
        authenticationMessages: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesFailed: 0
      };

      const totalSent = usage.messagesSent || 0;
      const utilityPct = totalSent > 0 ? Math.round((usage.utilityMessages / totalSent) * 100) : 0;
      const servicePct = totalSent > 0 ? Math.round((usage.serviceMessages / totalSent) * 100) : 0;
      const marketingPct = totalSent > 0 ? Math.round((usage.marketingMessages / totalSent) * 100) : 0;
      const authPct = totalSent > 0 ? Math.round((usage.authenticationMessages / totalSent) * 100) : 0;

      const isConnected = whatsAppAccount?.status === 'CONNECTED' || Boolean(phoneNumber);

      const dashboardPayload = {
        greeting: {
          userName: user?.name ? user.name.split(' ')[0] : 'Admin',
          subtext: 'Turn customer engagement into real business growth.'
        },
        topStats: {
          totalCustomers: totalCustomers || 0,
          leads: totalLeads || 0,
          activeChatbots: activeChatbotsCount || 0,
          formResponses: 0,
          whatsappTemplates: totalTemplates || 0
        },
        accountProfile: {
          status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
          name: phoneNumber?.verifiedName || whatsAppAccount?.name || organization?.name || 'WhatsApp Account',
          industry: 'TECHNOLOGY',
          displayPhoneNumber: phoneNumber?.displayPhoneNumber || 'Not Connected',
          wabaId: whatsAppAccount?.wabaId || 'N/A',
          phoneNumberId: phoneNumber?.phoneNumberId || 'N/A',
          coexistenceStatus: whatsAppAccount?.coexistenceStatus || 'NOT_APPLICABLE'
        },
        wallet: {
          balance: wallet?.balance !== undefined ? wallet.balance : 0,
          usedCredits: wallet?.usedCredits !== undefined ? wallet.usedCredits : 0,
          currency: wallet?.currency || 'INR'
        },
        plan: {
          name: subscription?.planId?.name || 'Starter Trial',
          billingInterval: subscription?.planId?.billingInterval || 'MONTHLY',
          expiresOn: subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Active',
          messagesUsed: totalSent,
          monthlyLimit: subscription?.planId?.monthlyMessageLimit || 5000
        },
        messagesAnalysis: {
          totalMessages: totalSent,
          breakdown: [
            { name: 'Utility', count: usage.utilityMessages || 0, percentage: utilityPct, color: '#10b981' },
            { name: 'Service', count: usage.serviceMessages || 0, percentage: servicePct, color: '#3b82f6' },
            { name: 'Marketing', count: usage.marketingMessages || 0, percentage: marketingPct, color: '#8b5cf6' },
            { name: 'Authentication', count: usage.authenticationMessages || 0, percentage: authPct, color: '#f59e0b' }
          ]
        },
        activeCampaigns: activeCampaignsCount || 0
      };

      res.status(200).json(apiSuccess(dashboardPayload));
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
export default dashboardController;
