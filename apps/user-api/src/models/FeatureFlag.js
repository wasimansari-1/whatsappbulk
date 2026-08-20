import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    description: String,
    isEnabledGlobally: {
      type: Boolean,
      default: false
    },
    enabledPlans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
      }
    ],
    enabledOrganizations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
      }
    ]
  },
  {
    timestamps: true
  }
);

export const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);
export default FeatureFlag;
