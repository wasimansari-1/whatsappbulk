import mongoose from 'mongoose';
import { BillingInterval } from '@whatsapp-saas/shared-constants';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    billingInterval: {
      type: String,
      enum: Object.values(BillingInterval),
      default: BillingInterval.MONTHLY
    },
    maxUsers: {
      type: Number,
      default: 5
    },
    maxContacts: {
      type: Number,
      default: 2500
    },
    maxWhatsAppNumbers: {
      type: Number,
      default: 1
    },
    monthlyMessageLimit: {
      type: Number,
      default: 5000
    },
    maxCampaigns: {
      type: Number,
      default: 50
    },
    features: {
      automationEnabled: { type: Boolean, default: false },
      analyticsEnabled: { type: Boolean, default: true },
      apiEnabled: { type: Boolean, default: false },
      teamInboxEnabled: { type: Boolean, default: true },
      crmEnabled: { type: Boolean, default: true },
      whiteLabelEnabled: { type: Boolean, default: false }
    },
    supportLevel: {
      type: String,
      default: 'Standard'
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Plan = mongoose.model('Plan', planSchema);
export default Plan;
