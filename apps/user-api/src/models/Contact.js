import mongoose from 'mongoose';
import { ChannelType } from '@whatsapp-saas/shared-constants';

const contactSchema = new mongoose.Schema(
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
      trim: true,
      maxlength: 120
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    channel: {
      type: String,
      enum: Object.values(ChannelType),
      default: ChannelType.WHATSAPP
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'FLAGGED', 'BLOCKED', 'OPT_OUT'],
      default: 'ACTIVE',
      index: true
    },
    attributes: {
      type: Map,
      of: String,
      default: {}
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastContactedAt: {
      type: Date
    },
    lastRepliedAt: {
      type: Date
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring no duplicate contact phone within an organization
contactSchema.index({ organizationId: 1, phone: 1 }, { unique: true });
contactSchema.index({ organizationId: 1, tags: 1 });
contactSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
contactSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });

export const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
