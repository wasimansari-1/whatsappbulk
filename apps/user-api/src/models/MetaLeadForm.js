import mongoose from 'mongoose';

const metaLeadFormSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    metaFormId: {
      type: String,
      required: true,
      index: true
    },
    pageId: {
      type: String,
      required: true,
      index: true
    },
    pageName: {
      type: String
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'],
      default: 'ACTIVE'
    },
    leadsCount: {
      type: Number,
      default: 0
    },
    privacyPolicyUrl: {
      type: String
    },
    questions: [
      {
        key: String,
        label: String,
        type: {
          type: String,
          default: 'CUSTOM'
        }
      }
    ],
    rawMeta: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

metaLeadFormSchema.index({ organizationId: 1, metaFormId: 1 }, { unique: true });

export const MetaLeadForm = mongoose.model('MetaLeadForm', metaLeadFormSchema);
export default MetaLeadForm;
