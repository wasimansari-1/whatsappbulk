import mongoose from 'mongoose';

const facebookPageConnectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    pageId: {
      type: String,
      required: true
    },
    pageName: {
      type: String,
      required: true
    },
    pageCategory: {
      type: String,
      default: 'Business & Brand'
    },
    adAccountId: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'REQUIRES_REAUTH'],
      default: 'CONNECTED',
      index: true
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    leadsSubscribed: {
      type: Boolean,
      default: true
    },
    encryptedAccessToken: {
      type: mongoose.Schema.Types.Mixed,
      select: false
    },
    encryptedPageToken: {
      type: mongoose.Schema.Types.Mixed,
      select: false
    },
    tokenExpiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

facebookPageConnectionSchema.index({ organizationId: 1, pageId: 1 }, { unique: true });
facebookPageConnectionSchema.index({ pageId: 1 });
facebookPageConnectionSchema.index({ organizationId: 1, status: 1 });

export const FacebookPageConnection = mongoose.model('FacebookPageConnection', facebookPageConnectionSchema);
export default FacebookPageConnection;
