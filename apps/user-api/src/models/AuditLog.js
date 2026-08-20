import mongoose from 'mongoose';
import { AuditAction } from '@whatsapp-saas/shared-constants';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: String
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
