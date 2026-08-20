import mongoose from 'mongoose';
import { CampaignStatus, ChannelType } from '@whatsapp-saas/shared-constants';

const campaignSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      enum: Object.values(ChannelType),
      default: ChannelType.WHATSAPP
    },
    whatsappPhoneNumberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppPhoneNumber',
      required: true
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppTemplate',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true
    },
    audienceType: {
      type: String,
      enum: ['ALL', 'TAGS', 'LISTS', 'CUSTOM'],
      default: 'ALL'
    },
    targetTags: [String],
    targetListIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContactList'
      }
    ],
    variableMapping: {
      type: Map,
      of: String,
      default: {}
    },
    stats: {
      totalRecipients: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    scheduledAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sendSpeedPerMinute: {
      type: Number,
      default: 60
    }
  },
  {
    timestamps: true
  }
);

campaignSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, scheduledAt: 1 }); // for scheduler cron

export const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
