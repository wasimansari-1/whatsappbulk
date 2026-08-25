import mongoose from 'mongoose';
import { TemplateCategory, TemplateStatus } from '@whatsapp-saas/shared-constants';

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    whatsappAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppAccount',
      required: true,
      index: true
    },
    wabaId: {
      type: String,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'MARKETING',
      index: true
    },
    language: {
      type: String,
      default: 'en_US',
      index: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'FLAGGED', 'DELETED'],
      default: 'PENDING',
      index: true
    },
    components: [
      {
        type: {
          type: String,
          enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
          required: true
        },
        format: {
          type: String,
          enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION', 'NONE'],
          default: 'TEXT'
        },
        text: String,
        example: mongoose.Schema.Types.Mixed,
        buttons: [
          {
            type: {
              type: String,
              enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE', 'OTP']
            },
            text: String,
            url: String,
            phoneNumber: String,
            example: mongoose.Schema.Types.Mixed
          }
        ]
      }
    ],
    providerTemplateId: {
      type: String,
      index: true
    },
    rejectionReason: {
      type: String,
      default: null
    },
    metaQualityRating: {
      type: String,
      default: 'UNKNOWN'
    },
    metaResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

whatsAppTemplateSchema.index({ organizationId: 1, name: 1, language: 1 }, { unique: true });
whatsAppTemplateSchema.index({ organizationId: 1, status: 1 });

export const WhatsAppTemplate = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
export default WhatsAppTemplate;
