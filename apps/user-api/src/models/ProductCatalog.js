import mongoose from 'mongoose';

const productCatalogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    metaCatalogId: {
      type: String,
      default: 'meta_cat_1049968644261349',
      index: true
    },
    retailerId: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    availability: {
      type: String,
      enum: ['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'],
      default: 'IN_STOCK'
    },
    category: {
      type: String,
      default: 'General'
    },
    imageUrl: {
      type: String
    },
    url: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

productCatalogSchema.index({ organizationId: 1, retailerId: 1 }, { unique: true });

export const ProductCatalog = mongoose.model('ProductCatalog', productCatalogSchema);
export default ProductCatalog;
