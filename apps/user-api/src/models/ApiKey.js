import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
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
    keyPrefix: {
      type: String,
      required: true // e.g. "wapp_live_..."
    },
    keyHash: {
      type: String,
      required: true,
      index: true
    },
    scopes: [String],
    lastUsedAt: Date,
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
