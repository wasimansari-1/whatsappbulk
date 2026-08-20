import mongoose from 'mongoose';
import { UserRole } from '@whatsapp-saas/shared-constants';

const organizationMemberSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.AGENT,
      index: true
    },
    customPermissions: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'SUSPENDED'],
      default: 'ACTIVE'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring a user belongs once per org
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ organizationId: 1, role: 1 });

export const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema);
export default OrganizationMember;
