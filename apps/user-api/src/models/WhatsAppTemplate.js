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
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(TemplateCategory),
      default: TemplateCategory.MARKETING
    },
    language: {
      type: String,
      default: 'en_US'
    },
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      default: TemplateStatus.APPROVED,
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
          enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'],
          default: 'TEXT'
        },
        text: String,
        example: mongoose.Schema.Types.Mixed,
        buttons: [
          {
            type: {
              type: String,
              enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']
            },
            text: String,
            url: String,
            phoneNumber: String
          }
        ]
      }
    ],
    providerTemplateId: {
      type: String,
      index: true
    },
    rejectionReason: {
      type: String
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
