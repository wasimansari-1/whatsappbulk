import mongoose from 'mongoose';

const metaAuditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true
    },
    metaObject: {
      type: String,
      enum: ['BUSINESS', 'PAGE', 'CAMPAIGN', 'AD_SET', 'AD', 'LEAD_FORM', 'LEAD', 'TEMPLATE', 'WEBHOOK', 'SYNC'],
      required: true
    },
    metaObjectId: {
      type: String
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'SKIPPED'],
      default: 'SUCCESS'
    },
    details: {
      type: String
    },
    metaResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    performedBy: {
      type: String,
      default: 'SYSTEM'
    }
  },
  {
    timestamps: true
  }
);

metaAuditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const MetaAuditLog = mongoose.model('MetaAuditLog', metaAuditLogSchema);
export default MetaAuditLog;
