import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: 'META'
    },
    providerEventId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    error: String,
    processedAt: Date
  },
  {
    timestamps: true
  }
);

// TTL index to automatically archive/expire processed webhook logs after 30 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
export default WebhookEvent;
