import mongoose from 'mongoose';

const contactListSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    contactsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

contactListSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const ContactList = mongoose.model('ContactList', contactListSchema);
export default ContactList;
