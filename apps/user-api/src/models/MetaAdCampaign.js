import mongoose from 'mongoose';

const metaAdCampaignSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    metaCampaignId: {
      type: String,
      required: true,
      index: true
    },
    metaAccountId: {
      type: String,
      default: 'act_1049968644261349'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      enum: ['OUTCOME_LEADS', 'MESSAGES', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT'],
      default: 'MESSAGES'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'COMPLETED', 'IN_PROCESS', 'PENDING_REVIEW', 'DISAPPROVED', 'WITH_ISSUES'],
      default: 'ACTIVE',
      index: true
    },
    buyingType: {
      type: String,
      default: 'AUCTION'
    },
    dailyBudget: {
      type: Number,
      default: 500
    },
    lifetimeBudget: {
      type: Number
    },
    spend: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    leadsCount: {
      type: Number,
      default: 0
    },
    cpl: {
      type: Number,
      default: 0
    },
    cpc: {
      type: Number,
      default: 0
    },
    cpm: {
      type: Number,
      default: 0
    },
    ctr: {
      type: Number,
      default: 0
    },
    // Embedded Ad Sets and Ads Hierarchy
    adSets: [
      {
        metaAdSetId: String,
        name: String,
        status: String,
        dailyBudget: Number,
        targeting: {
          ageMin: Number,
          ageMax: Number,
          genders: [Number],
          geoLocations: [String]
        },
        ads: [
          {
            metaAdId: String,
            name: String,
            status: String,
            creativeUrl: String,
            headline: String,
            primaryText: String,
            ctaType: String
          }
        ]
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

metaAdCampaignSchema.index({ organizationId: 1, metaCampaignId: 1 }, { unique: true });

export const MetaAdCampaign = mongoose.model('MetaAdCampaign', metaAdCampaignSchema);
export default MetaAdCampaign;
