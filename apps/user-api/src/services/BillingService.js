import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { Wallet } from '../models/Wallet.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { SubscriptionStatus } from '@whatsapp-saas/shared-constants';

export class BillingService {
  async getPlans() {
    return Plan.find({ isActive: true }).sort({ price: 1 }).lean();
  }

  async getBillingOverview(organizationId) {
    const subscription = await Subscription.findOne({ organizationId }).populate('planId').lean();
    const wallet = (await Wallet.findOne({ organizationId }).lean()) || {
      balance: 0,
      usedCredits: 0
    };
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = (await UsageRecord.findOne({ organizationId, period: currentMonth }).lean()) || {
      messagesSent: 0,
      marketingMessages: 0,
      utilityMessages: 0,
      serviceMessages: 0,
      authenticationMessages: 0
    };

    const recentTransactions = await WalletTransaction.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      subscription,
      wallet,
      usage,
      recentTransactions
    };
  }

  async addWalletCredits(organizationId, { amount, description = 'Prepaid Credit Top-up' }) {
    const rechargeAmount = parseFloat(amount);
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      const error = new Error('Invalid recharge amount');
      error.statusCode = 400;
      throw error;
    }

    const wallet = await Wallet.findOneAndUpdate(
      { organizationId },
      { $inc: { balance: rechargeAmount } },
      { new: true, upsert: true }
    );

    const transaction = await WalletTransaction.create({
      organizationId,
      amount: rechargeAmount,
      type: 'CREDIT',
      description,
      balanceAfter: wallet.balance,
      referenceType: 'PAYMENT',
      referenceId: `tx_${Date.now()}`
    });

    return {
      wallet,
      transaction
    };
  }

  async upgradePlan(organizationId, { planId, billingInterval = 'MONTHLY' }) {
    const plan = await Plan.findById(planId);
    if (!plan) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      throw error;
    }

    const durationDays = billingInterval === 'YEARLY' ? 365 : billingInterval === 'QUARTERLY' ? 90 : 30;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + durationDays);

    const subscription = await Subscription.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          planId: plan._id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd
        }
      },
      { new: true, upsert: true }
    ).populate('planId');

    return subscription;
  }
}

export const billingService = new BillingService();
export default billingService;
