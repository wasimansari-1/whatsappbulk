import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'REFUND', 'PROMOTIONAL'],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    referenceType: {
      type: String,
      enum: ['CAMPAIGN', 'MESSAGE', 'PAYMENT', 'MANUAL_ADJUSTMENT', 'SUBSCRIPTION'],
      default: 'CAMPAIGN'
    },
    referenceId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({ organizationId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
