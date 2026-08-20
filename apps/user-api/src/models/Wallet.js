import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    balance: {
      type: Number,
      default: 500.0, // Default promotional credit for new signups
      min: 0
    },
    usedCredits: {
      type: Number,
      default: 0.0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    autoRecharge: {
      type: Boolean,
      default: false
    },
    autoRechargeThreshold: {
      type: Number,
      default: 100
    },
    autoRechargeAmount: {
      type: Number,
      default: 500
    }
  },
  {
    timestamps: true
  }
);

export const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
