import mongoose from 'mongoose';

export const CRMLeadStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  INTERESTED: 'INTERESTED',
  NOT_INTERESTED: 'NOT_INTERESTED',
  QUALIFIED: 'QUALIFIED',
  FOLLOW_UP: 'FOLLOW_UP',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST'
};

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    // Primary External Meta Lead ID (Enforces idempotent webhook de-duplication)
    metaLeadId: {
      type: String,
      index: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    firstName: String,
    lastName: String,
    phone: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      trim: true
    },
    city: String,
    state: String,
    country: {
      type: String,
      default: 'IN'
    },
    source: {
      type: String,
      default: 'Meta Click-to-WhatsApp'
    },
    stage: {
      type: String,
      enum: Object.values(CRMLeadStage),
      default: CRMLeadStage.NEW,
      index: true
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    dealValue: {
      type: Number,
      default: 0
    },
    notes: {
      type: String
    },
    // Meta Source Attribution (Preserves exact Meta origin)
    pageId: String,
    pageName: String,
    metaCampaignId: {
      type: String,
      index: true
    },
    metaCampaignName: String,
    metaAdSetId: String,
    metaAdSetName: String,
    metaAdId: String,
    metaAdName: String,
    metaFormId: String,
    metaFormName: String,
    rawMetaFields: {
      type: mongoose.Schema.Types.Mixed
    },
    disqualificationReason: String,
    followUpDate: Date,
    lastContactedAt: Date,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedName: {
      type: String,
      default: 'Unassigned'
    },
    activityHistory: [
      {
        action: String,
        performedBy: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        note: String
      }
    ]
  },
  {
    timestamps: true
  }
);

leadSchema.index({ organizationId: 1, stage: 1, createdAt: -1 });
leadSchema.index({ organizationId: 1, metaLeadId: 1 }, { unique: true, sparse: true });

export const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
