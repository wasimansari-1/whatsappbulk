import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Contact } from '../models/Contact.js';
import { Lead } from '../models/Lead.js';
import { Wallet } from '../models/Wallet.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { emitToOrganization } from '../sockets/index.js';

export class AutomationService {
  async getWorkflows(organizationId) {
    return AutomationWorkflow.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async createWorkflow(organizationId, data) {
    return AutomationWorkflow.create({
      ...data,
      organizationId,
      isActive: true,
      executionCount: 0
    });
  }

  async updateWorkflow(organizationId, id, data) {
    return AutomationWorkflow.findOneAndUpdate(
      { organizationId, _id: id },
      { $set: data },
      { new: true }
    ).lean();
  }

  async toggleWorkflow(organizationId, id) {
    const wf = await AutomationWorkflow.findOne({ organizationId, _id: id });
    if (!wf) throw new Error('Workflow not found');
    wf.isActive = !wf.isActive;
    await wf.save();
    return wf.toObject();
  }

  async deleteWorkflow(organizationId, id) {
    await AutomationWorkflow.deleteOne({ organizationId, _id: id });
    return { success: true };
  }

  /**
   * Evaluates incoming message and triggers matching Chatbot workflows
   */
  async processIncomingMessage(organizationId, contact, messageText, buttonPayload = null) {
    const activeWorkflows = await AutomationWorkflow.find({
      organizationId,
      isActive: true
    }).lean();

    if (!activeWorkflows || activeWorkflows.length === 0) return null;

    const normalizedText = (messageText || '').trim().toLowerCase();

    for (const wf of activeWorkflows) {
      let isMatch = false;

      // 1. Keyword match
      if (wf.triggerType === 'KEYWORD') {
        const keywords = (wf.triggerConfig?.keyword || '')
          .toLowerCase()
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

        isMatch = keywords.some((k) => normalizedText.includes(k));
      }

      // 2. Button payload match
      if (buttonPayload && wf.triggerType === 'BUTTON_CLICK') {
        if (wf.triggerConfig?.buttonPayload === buttonPayload) {
          isMatch = true;
        }
      }

      if (isMatch) {
        console.log(`[Chatbot] Matched workflow: "${wf.name}" for message: "${messageText}"`);

        // Execute workflow nodes/actions
        await this.executeWorkflowActions(organizationId, contact, wf);

        // Increment execution counter
        await AutomationWorkflow.updateOne({ _id: wf._id }, { $inc: { executionCount: 1 } });
        return wf;
      }
    }

    return null;
  }

  async executeWorkflowActions(organizationId, contact, workflow) {
    const provider = getWhatsAppProvider();
    const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    const phoneNumberId = activePhone?.phoneNumberId || process.env.META_PHONE_NUMBER_ID || '1223600624165995';

    for (const node of workflow.nodes || []) {
      try {
        // Node Type: SEND_TEXT
        if (node.type === 'SEND_MESSAGE' && node.config?.text) {
          let replyText = node.config.text.replace(/\{\{name\}\}/gi, contact.name || 'Customer');

          const result = await provider.sendTextMessage({
            phoneNumberId,
            to: contact.phone,
            text: replyText
          });

          const providerMessageId = result.messageId || result.messages?.[0]?.id;

          // Save message
          const msg = await Message.create({
            organizationId,
            contactId: contact._id,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: { text: replyText },
            status: 'SENT',
            providerMessageId,
            isChatbotResponse: true
          });

          // Deduct small unit cost (₹0.05 service chat) from wallet
          await Wallet.findOneAndUpdate(
            { organizationId },
            { $inc: { balance: -0.05, usedCredits: 0.05 } }
          );

          // Update conversation
          await Conversation.findOneAndUpdate(
            { organizationId, contactId: contact._id },
            {
              $set: {
                lastMessage: {
                  text: replyText,
                  sender: 'BOT',
                  sentAt: new Date(),
                  status: 'SENT'
                }
              }
            }
          );

          emitToOrganization(organizationId, 'conversation.message', {
            contactId: contact._id,
            message: msg
          });
        }

        // Node Type: SEND_BUTTONS (Interactive WhatsApp Quick Replies)
        if (node.type === 'SEND_BUTTONS' && node.config?.buttons?.length > 0) {
          const bodyText = (node.config.body || 'Please select an option:').replace(/\{\{name\}\}/gi, contact.name || 'Customer');

          const result = await provider.sendInteractiveButtonsMessage({
            phoneNumberId,
            to: contact.phone,
            headerText: node.config.header || '',
            bodyText,
            footerText: node.config.footer || '',
            buttons: node.config.buttons
          });

          const providerMessageId = result.messageId || result.messages?.[0]?.id;

          const msg = await Message.create({
            organizationId,
            contactId: contact._id,
            direction: 'OUTBOUND',
            type: 'INTERACTIVE',
            content: {
              text: bodyText,
              buttons: node.config.buttons.map((b) => ({ text: b.title || b.text, payload: b.id }))
            },
            status: 'SENT',
            providerMessageId,
            isChatbotResponse: true
          });

          await Wallet.findOneAndUpdate(
            { organizationId },
            { $inc: { balance: -0.05, usedCredits: 0.05 } }
          );

          emitToOrganization(organizationId, 'conversation.message', {
            contactId: contact._id,
            message: msg
          });
        }

        // Node Type: UPDATE_LEAD_STAGE / CONVERT_LEAD
        if (node.type === 'UPDATE_LEAD_STAGE' || node.type === 'CONVERT_LEAD') {
          await Lead.findOneAndUpdate(
            { organizationId, phone: contact.phone },
            {
              $set: {
                name: contact.name,
                phone: contact.phone,
                email: contact.email || '',
                stage: node.config?.stage || 'HOT',
                source: 'WhatsApp Chatbot',
                dealValue: node.config?.dealValue || 10000
              },
              $setOnInsert: { organizationId, contactId: contact._id }
            },
            { upsert: true }
          );
        }

        // Node Type: ADD_TAG
        if (node.type === 'ADD_TAG' && node.config?.tag) {
          await Contact.updateOne(
            { _id: contact._id },
            { $addToSet: { tags: node.config.tag } }
          );
        }
      } catch (err) {
        console.error(`[Chatbot] Error executing node ${node.type}:`, err.message);
      }
    }
  }
}

export const automationService = new AutomationService();
export default automationService;
