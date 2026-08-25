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
    businessPortfolioId: {
      type: String // Meta Business Portfolio ID
    },
    provider: {
      type: String,
      enum: ['MOCK', 'META'],
      default: 'META'
    },
    onboardingMethod: {
      type: String,
      enum: ['EMBEDDED_SIGNUP', 'MANUAL', 'MOCK'],
      default: 'EMBEDDED_SIGNUP'
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PENDING_VERIFICATION', 'ERROR', 'RESTRICTED'],
      default: 'CONNECTED',
      index: true
    },
    coexistenceStatus: {
      type: String,
      enum: ['ENABLED', 'NOT_APPLICABLE', 'PENDING_REVIEW', 'DISABLED'],
      default: 'NOT_APPLICABLE'
    },
    accountReviewStatus: {
      type: String,
      default: 'APPROVED'
    },
    tokenExpiresAt: {
      type: Date
    },
    lastVerifiedAt: {
      type: Date
    },
    lastError: {
      type: String
    },
    metaErrorCode: {
      type: Number
    },
    metaErrorSubcode: {
      type: Number
    },
    tokenMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Encrypted token for multi-tenant isolation
    encryptedAccessToken: {
      type: {
        encrypted: String,
        iv: String,
        authTag: String
      },
      select: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

whatsAppAccountSchema.index({ organizationId: 1, status: 1 });
whatsAppAccountSchema.index({ organizationId: 1, wabaId: 1 });

export const WhatsAppAccount = mongoose.model('WhatsAppAccount', whatsAppAccountSchema);
export default WhatsAppAccount;
