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
    triggerType: {
      type: String,
      enum: ['KEYWORD', 'BUTTON_CLICK', 'CONTACT_CREATED', 'TAG_ADDED', 'LEAD_STAGE_CHANGED', 'CAMPAIGN_REPLIED'],
      required: true
    },
    triggerConfig: {
      keyword: String,
      tag: String,
      stage: String,
      buttonPayload: String
    },
    nodes: [
      {
        id: String,
        type: {
          type: String,
          enum: ['SEND_MESSAGE', 'SEND_BUTTONS', 'SEND_TEMPLATE', 'ADD_TAG', 'ASSIGN_USER', 'DELAY', 'UPDATE_LEAD_STAGE', 'CONVERT_LEAD']
        },
        config: mongoose.Schema.Types.Mixed
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
    }
  },
  {
    timestamps: true
  }
);

export const AutomationWorkflow = mongoose.model('AutomationWorkflow', automationWorkflowSchema);
export default AutomationWorkflow;
