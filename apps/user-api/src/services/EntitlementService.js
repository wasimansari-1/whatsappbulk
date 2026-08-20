import { Organization } from '../models/Organization.js';
import { Subscription } from '../models/Subscription.js';
import { Plan } from '../models/Plan.js';
import { Contact } from '../models/Contact.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { Wallet } from '../models/Wallet.js';

export class EntitlementService {
  async getOrganizationEntitlements(organizationId) {
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('Organization not found');

    const subscription = await Subscription.findOne({ organizationId }).populate('planId').lean();
    const plan = subscription?.planId || (await Plan.findOne({ slug: 'starter' }).lean());

    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = (await UsageRecord.findOne({ organizationId, period: currentMonth }).lean()) || {
      messagesSent: 0,
      activeContactsCount: 0
    };

    const contactCount = await Contact.countDocuments({ organizationId, deletedAt: null });
    const wallet = (await Wallet.findOne({ organizationId }).lean()) || { balance: 0 };

    return {
      planName: plan?.name || 'Starter Trial',
      planSlug: plan?.slug || 'starter',
      subscriptionStatus: subscription?.status || 'TRIAL',
      trialEndsAt: subscription?.trialEndsAt,
      limits: {
        maxContacts: plan?.maxContacts || 2500,
        monthlyMessageLimit: plan?.monthlyMessageLimit || 2000,
        maxUsers: plan?.maxUsers || 5,
        maxWhatsAppNumbers: plan?.maxWhatsAppNumbers || 1
      },
      currentUsage: {
        contacts: contactCount,
        messagesSentThisMonth: usage.messagesSent || 0,
        walletBalance: wallet.balance || 0,
        usedCredits: wallet.usedCredits || 0
      },
      features: plan?.features || {
        automationEnabled: false,
        analyticsEnabled: true,
        apiEnabled: false,
        teamInboxEnabled: true,
        crmEnabled: true
      }
    };
  }

  async canAddContacts(organizationId, countToAdd = 1) {
    const entitlements = await this.getOrganizationEntitlements(organizationId);
    const current = entitlements.currentUsage.contacts;
    const max = entitlements.limits.maxContacts;
    if (current + countToAdd > max) {
      const error = new Error(`Contact limit reached (${current}/${max}). Please upgrade your plan.`);
      error.statusCode = 403;
      throw error;
    }
    return true;
  }

  async canSendMessages(organizationId, countToSend = 1) {
    const entitlements = await this.getOrganizationEntitlements(organizationId);
    
    // Check monthly message plan limit
    const currentSent = entitlements.currentUsage.messagesSentThisMonth;
    const limit = entitlements.limits.monthlyMessageLimit;
    if (currentSent + countToSend > limit) {
      const error = new Error(`Monthly message limit exceeded (${currentSent}/${limit}). Upgrade your plan to send more.`);
      error.statusCode = 403;
      throw error;
    }

    // Check prepaid wallet balance (must have enough for message unit cost)
    const cost = countToSend * 0.40;
    if (entitlements.currentUsage.walletBalance < cost) {
      const error = new Error(`Insufficient wallet balance. Required: ₹${cost.toFixed(2)}, Available: ₹${entitlements.currentUsage.walletBalance.toFixed(2)}. Please recharge your wallet.`);
      error.statusCode = 403;
      throw error;
    }

    return true;
  }
}

export const entitlementService = new EntitlementService();
export default entitlementService;
