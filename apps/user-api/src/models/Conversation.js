import mongoose from 'mongoose';
import { ChannelType } from '@whatsapp-saas/shared-constants';

const conversationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: Object.values(ChannelType),
      default: ChannelType.WHATSAPP
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACTIVE', 'RESOLVED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    unreadCount: {
      type: Number,
      default: 0
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastMessage: {
      text: String,
      sender: {
        type: String,
        enum: ['CONTACT', 'AGENT', 'BOT']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      status: String
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ organizationId: 1, contactId: 1, channel: 1 }, { unique: true });
conversationSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
