import mongoose from 'mongoose';

const integrationConfigSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['SHOPIFY', 'WOOCOMMERCE', 'RAZORPAY', 'GOOGLE_SHEETS', 'ZAPIER', 'WEBHOOK', 'CUSTOM_API'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PAUSED'],
      default: 'DISCONNECTED'
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    webhookUrl: {
      type: String
    },
    eventsSubscribed: [String],
    lastSyncedAt: Date
  },
  {
    timestamps: true
  }
);

integrationConfigSchema.index({ organizationId: 1, type: 1 });

export const IntegrationConfig = mongoose.model('IntegrationConfig', integrationConfigSchema);
export default IntegrationConfig;
