import mongoose from 'mongoose';

const usageRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    period: {
      type: String, // e.g. '2026-08' (YYYY-MM)
      required: true,
      index: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    messagesSent: {
      type: Number,
      default: 0
    },
    messagesDelivered: {
      type: Number,
      default: 0
    },
    messagesRead: {
      type: Number,
      default: 0
    },
    messagesFailed: {
      type: Number,
      default: 0
    },
    marketingMessages: {
      type: Number,
      default: 0
    },
    utilityMessages: {
      type: Number,
      default: 0
    },
    serviceMessages: {
      type: Number,
      default: 0
    },
    authenticationMessages: {
      type: Number,
      default: 0
    },
    activeContactsCount: {
      type: Number,
      default: 0
    },
    campaignsRun: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index by organization and month period
usageRecordSchema.index({ organizationId: 1, period: 1 }, { unique: true });

export const UsageRecord = mongoose.model('UsageRecord', usageRecordSchema);
export default UsageRecord;
