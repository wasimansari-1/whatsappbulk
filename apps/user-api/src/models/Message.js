import mongoose from 'mongoose';
import { ChannelType, MessageStatus, MessageType } from '@whatsapp-saas/shared-constants';

const messageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    whatsappPhoneNumberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppPhoneNumber'
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true
    },
    direction: {
      type: String,
      enum: ['OUTBOUND', 'INBOUND'],
      required: true
    },
    channel: {
      type: String,
      enum: Object.values(ChannelType),
      default: ChannelType.WHATSAPP
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT
    },
    content: {
      text: String,
      mediaUrl: String,
      caption: String,
      filename: String,
      location: mongoose.Schema.Types.Mixed,
      templateName: String,
      templateLanguage: String,
      templateVariables: [String],
      buttons: [
        {
          btnType: { type: String, default: 'QUICK_REPLY' },
          text: { type: String },
          payload: { type: String }
        }
      ]
    },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
      index: true
    },
    providerMessageId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    isChatbotResponse: {
      type: Boolean,
      default: false
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ organizationId: 1, contactId: 1, createdAt: -1 });
messageSchema.index({ organizationId: 1, providerMessageId: 1 }, { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } });
messageSchema.index({ organizationId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
export default Message;
