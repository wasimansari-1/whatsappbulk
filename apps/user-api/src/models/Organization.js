import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    logo: {
      type: String
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'],
      default: 'TRIAL',
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      index: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    settings: {
      defaultCountryCode: { type: String, default: '91' },
      autoReplyEnabled: { type: Boolean, default: false },
      webhookUrl: { type: String }
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active org search
organizationSchema.index({ status: 1, createdAt: -1 });

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
