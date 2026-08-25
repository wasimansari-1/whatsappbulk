import mongoose from 'mongoose';

const automationWorkflowSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      enum: ['WHATSAPP', 'INSTAGRAM', 'MESSENGER'],
      default: 'WHATSAPP',
      index: true
    },
    type: {
      type: String,
      enum: ['AUTOMATION', 'DRIP', 'LIBRARY'],
      default: 'AUTOMATION'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    triggerType: {
      type: String,
      enum: [
        'TEMPLATE',
        'KEYWORD',
        'ANY_MESSAGE',
        'CATCH_ALL',
        'BUTTON_CLICK',
        'WELCOME_MESSAGE',
        'CONTACT_CREATED',
        'TAG_ADDED',
        'LEAD_STAGE_CHANGED',
        'CAMPAIGN_REPLIED'
      ],
      default: 'KEYWORD'
    },
    triggerConfig: {
      keyword: String,
      templateId: String,
      templateName: String,
      tag: String,
      stage: String,
      buttonPayload: String
    },
    nodes: [
      {
        id: String,
        type: {
          type: String,
          enum: [
            'START_TRIGGER',
            'SEND_MESSAGE',
            'TEXT_MESSAGE',
            'LIST_MESSAGE',
            'SEND_BUTTONS',
            'BUTTON_MESSAGE',
            'SEND_TEMPLATE',
            'SEND_IMAGE',
            'IMAGE',
            'MEDIA_BUTTON',
            'ADD_TAG',
            'ASSIGN_USER',
            'DELAY',
            'UPDATE_LEAD_STAGE',
            'CONVERT_LEAD'
          ]
        },
        position: {
          x: { type: Number, default: 100 },
          y: { type: Number, default: 100 }
        },
        config: mongoose.Schema.Types.Mixed
      }
    ],
    connections: [
      {
        fromNodeId: String,
        fromPort: String,
        toNodeId: String,
        toPort: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    executionCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: String,
      default: 'WA'
    }
  },
  {
    timestamps: true
  }
);

automationWorkflowSchema.index({ organizationId: 1, channel: 1 });
automationWorkflowSchema.index({ organizationId: 1, isActive: 1 });

export const AutomationWorkflow = mongoose.model('AutomationWorkflow', automationWorkflowSchema);
export default AutomationWorkflow;
