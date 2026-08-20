import mongoose from 'mongoose';
import { LeadStage } from '@whatsapp-saas/shared-constants';

const leadSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      default: 'WhatsApp'
    },
    stage: {
      type: String,
      enum: Object.values(LeadStage),
      default: LeadStage.NEW,
      index: true
    },
    dealValue: {
      type: Number,
      default: 0
    },
    notes: {
      type: String
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    }
  },
  {
    timestamps: true
  }
);

leadSchema.index({ organizationId: 1, stage: 1, createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
