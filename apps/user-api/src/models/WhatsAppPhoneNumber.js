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
      required: true // e.g. "+91 87009 94288"
    },
    verifiedName: {
      type: String,
      default: 'Business Account'
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'GREEN'
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PENDING', 'FLAGGED'],
      default: 'CONNECTED'
    },
    messagingLimitTier: {
      type: String,
      default: 'TIER_1K' // TIER_50, TIER_250, TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED
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
