import mongoose from 'mongoose';

const whatsAppPhoneNumberSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    whatsappAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppAccount',
      required: true,
      index: true
    },
    phoneNumberId: {
      type: String, // Meta phone number ID
      required: true,
      index: true
    },
    displayPhoneNumber: {
      type: String,
      required: true // e.g. "+91 91998 00309"
    },
    verifiedName: {
      type: String,
      default: 'Business Account'
    },
    platformType: {
      type: String,
      enum: ['CLOUD_API', 'WHATSAPP_BUSINESS_APP', 'ON_PREMISE', 'UNKNOWN'],
      default: 'CLOUD_API'
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'GREEN'
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PENDING', 'FLAGGED', 'RESTRICTED'],
      default: 'CONNECTED'
    },
    coexistenceEligible: {
      type: Boolean,
      default: false
    },
    coexistenceStatus: {
      type: String,
      enum: ['ACTIVE', 'ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING', 'DISABLED'],
      default: 'NOT_ELIGIBLE'
    },
    messagingLimitTier: {
      type: String,
      default: 'TIER_10K' // TIER_50, TIER_250, TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED
    },
    lastWebhookAt: {
      type: Date
    },
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

whatsAppPhoneNumberSchema.index({ organizationId: 1, phoneNumberId: 1 }, { unique: true });

export const WhatsAppPhoneNumber = mongoose.model('WhatsAppPhoneNumber', whatsAppPhoneNumberSchema);
export default WhatsAppPhoneNumber;
