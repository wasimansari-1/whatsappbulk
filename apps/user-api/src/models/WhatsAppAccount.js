import mongoose from 'mongoose';

const whatsAppAccountSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    wabaId: {
      type: String, // WhatsApp Business Account ID from Meta
      index: true
    },
    businessId: {
      type: String // Meta Business Manager ID
    },
    provider: {
      type: String,
      enum: ['MOCK', 'META'],
      default: 'MOCK'
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PENDING_VERIFICATION', 'RESTRICTED'],
      default: 'CONNECTED',
      index: true
    },
    accountReviewStatus: {
      type: String,
      default: 'APPROVED'
    },
    accessToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true
  }
);

whatsAppAccountSchema.index({ organizationId: 1, status: 1 });

export const WhatsAppAccount = mongoose.model('WhatsAppAccount', whatsAppAccountSchema);
export default WhatsAppAccount;
