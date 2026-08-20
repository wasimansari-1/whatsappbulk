import mongoose from 'mongoose';
import { SubscriptionStatus } from '@whatsapp-saas/shared-constants';

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.TRIAL,
      index: true
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    trialEndsAt: {
      type: Date
    },
    providerSubscriptionId: {
      type: String
    },
    providerCustomerId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

subscriptionSchema.index({ organizationId: 1, status: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
