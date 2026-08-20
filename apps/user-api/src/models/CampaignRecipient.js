import mongoose from 'mongoose';
import { MessageStatus } from '@whatsapp-saas/shared-constants';

const campaignRecipientSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    name: {
      type: String
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.PENDING,
      index: true
    },
    providerMessageId: {
      type: String,
      index: true
    },
    variables: {
      type: Map,
      of: String,
      default: {}
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index for high-throughput batch worker queries and webhook lookups
campaignRecipientSchema.index({ campaignId: 1, status: 1 });
campaignRecipientSchema.index({ organizationId: 1, providerMessageId: 1 });

export const CampaignRecipient = mongoose.model('CampaignRecipient', campaignRecipientSchema);
export default CampaignRecipient;
