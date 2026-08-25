import { conversationRepository } from '../repositories/ConversationRepository.js';
import { Contact } from '../models/Contact.js';
import { Conversation } from '../models/Conversation.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { whatsAppService } from './WhatsAppService.js';
import { entitlementService } from './EntitlementService.js';
import { emitToOrganization } from '../sockets/index.js';
import { parseMetaError } from '../utils/metaErrorParser.js';

export class ConversationService {
  async getConversations(organizationId, query) {
    await whatsAppService.ensureDefaultWhatsAppConnection(organizationId);

    const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    if (!activePhone) {
      return {
        connected: false,
        reason: 'WHATSAPP_NOT_CONNECTED',
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
      };
    }
    const result = await conversationRepository.getConversations(organizationId, query);
    return {
      connected: true,
      ...result
    };
  }

  async getMessages(organizationId, contactId, query) {
    // Reset unread count for conversation
    await Conversation.findOneAndUpdate(
      { organizationId, contactId },
      { $set: { unreadCount: 0 } }
    );

    return conversationRepository.getMessages(organizationId, contactId, query);
  }

  async sendMessage(organizationId, userId, { contactId, text, mediaUrl, mediaType, filename, templateName, templateLanguage, templateVariables }) {
    const contact = await Contact.findOne({ organizationId, _id: contactId });
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify quota & wallet balance (fail-safe)
    try {
      await entitlementService.canSendMessages(organizationId, 1);
    } catch (e) {
      console.warn('[ConversationService] Entitlement check:', e.message);
    }

    await whatsAppService.ensureDefaultWhatsAppConnection(organizationId);
    const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    if (!activePhone) {
      const error = new Error('WhatsApp Business account is not connected for this workspace. Please connect your WhatsApp account in Settings / Integrations.');
      error.statusCode = 400;
      throw error;
    }

    const phoneNumberId = activePhone.phoneNumberId;
    const token = await whatsAppService.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();

    let providerResult;

    try {
      if (templateName) {
        // Send approved Meta template message
        providerResult = await provider.sendTemplateMessage(
          {
            phoneNumberId,
            to: contact.phone,
            templateName,
            language: templateLanguage || 'en_US',
            components: templateVariables && templateVariables.length > 0 ? [
              {
                type: 'body',
                parameters: templateVariables.map((v) => ({ type: 'text', text: String(v) }))
              }
            ] : []
          },
          token
        );
      } else if (mediaUrl) {
        const targetMediaType = (mediaType || 'IMAGE').toUpperCase();
        providerResult = await provider.sendMediaMessage(
          {
            phoneNumberId,
            to: contact.phone,
            type: targetMediaType,
            mediaUrl,
            caption: text || '',
            filename: filename || 'document'
          },
          token
        );
      } else if (text) {
        providerResult = await provider.sendTextMessage(
          {
            phoneNumberId,
            to: contact.phone,
            text
          },
          token
        );
      }
    } catch (metaErr) {
      const parsed = parseMetaError(metaErr, { contactId: contact._id, phone: contact.phone });
      console.error('[ConversationService] Meta Send Message Error:', parsed);

      const err = new Error(parsed.userMessage);
      err.statusCode = parsed.context?.httpStatus || 400;
      err.metaError = parsed;
      throw err;
    }

    const providerMessageId = providerResult?.messageId || providerResult?.messages?.[0]?.id;
    if (!providerMessageId) {
      const err = new Error('Meta API accepted the request but did not return a valid provider message ID (wamid).');
      err.statusCode = 502;
      throw err;
    }
    const detectedType = templateName ? 'TEMPLATE' : (mediaUrl ? (mediaType || 'IMAGE').toUpperCase() : 'TEXT');
    const displayContent = templateName
      ? `[Template: ${templateName}]`
      : (detectedType === 'IMAGE' ? (text || '📷 Photo') : (detectedType === 'DOCUMENT' ? (filename || text || '📄 Document') : (text || 'Media Message')));

    // Save message in DB
    const message = await conversationRepository.createMessage(organizationId, {
      whatsappPhoneNumberId: activePhone?._id,
      contactId: contact._id,
      direction: 'OUTBOUND',
      channel: 'WHATSAPP',
      type: detectedType,
      content: {
        text: text || '',
        templateName,
        templateLanguage: templateLanguage || 'en_US',
        templateVariables: templateVariables || [],
        mediaUrl,
        filename
      },
      status: 'SENT',
      providerMessageId,
      sentBy: userId
    });

    // Update contact last contacted
    contact.lastContactedAt = new Date();
    await contact.save();

    // Realtime notification to live inbox
    emitToOrganization(organizationId, 'conversation.message', {
      contactId: contact._id,
      message
    });

    return message;
  }

  async editMessage(organizationId, userId, messageId, newText) {
    const { Message } = await import('../models/Message.js');
    const message = await Message.findOne({ _id: messageId, organizationId });
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (message.direction !== 'OUTBOUND') {
      const error = new Error('Only outbound messages can be edited');
      error.statusCode = 400;
      throw error;
    }

    message.content = { ...message.content, text: newText };
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Update conversation snippet if this was the last message
    await Conversation.findOneAndUpdate(
      { organizationId, contactId: message.contactId },
      { $set: { 'lastMessage.text': newText } }
    );

    // Emit live update
    emitToOrganization(organizationId, 'message.edited', {
      messageId: message._id,
      contactId: message.contactId,
      text: newText,
      editedAt: message.editedAt
    });

    return message;
  }

  async deleteMessage(organizationId, userId, messageId, { deleteForEveryone = false } = {}) {
    const { Message } = await import('../models/Message.js');
    const message = await Message.findOne({ _id: messageId, organizationId });
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    const contactId = message.contactId;

    if (deleteForEveryone && message.direction === 'OUTBOUND') {
      message.isDeleted = true;
      message.deletedForEveryone = true;
      message.content = { text: '🚫 This message was deleted' };
      message.type = 'TEXT';
      await message.save();

      // Update conversation snippet
      await Conversation.findOneAndUpdate(
        { organizationId, contactId: message.contactId },
        { $set: { 'lastMessage.text': '🚫 This message was deleted' } }
      );

      emitToOrganization(organizationId, 'message.deleted_for_everyone', {
        messageId,
        contactId,
        message
      });
      return { success: true, messageId, deleteForEveryone: true };
    } else {
      await Message.deleteOne({ _id: messageId, organizationId });

      emitToOrganization(organizationId, 'message.deleted', {
        messageId,
        contactId,
        deleteForEveryone: false
      });
      return { success: true, messageId, deleteForEveryone: false };
    }
  }

  async initiateConversation(organizationId, { phone, name, contactId }) {
    await whatsAppService.ensureDefaultWhatsAppConnection(organizationId);

    let contact = null;
    if (contactId) {
      contact = await Contact.findOne({ organizationId, _id: contactId });
    } else if (phone) {
      const cleanPhone = phone.toString().replace(/\D/g, '');
      contact = await Contact.findOne({ organizationId, phone: cleanPhone });
      if (!contact) {
        contact = await Contact.create({
          organizationId,
          name: name || `Customer +${cleanPhone}`,
          phone: cleanPhone,
          channel: 'WHATSAPP',
          status: 'ACTIVE'
        });
      }
    }

    if (!contact) {
      const err = new Error('Contact not found or phone number is invalid.');
      err.statusCode = 400;
      throw err;
    }

    let conversation = await Conversation.findOne({
      organizationId,
      contactId: contact._id
    }).populate('contactId assignedTo');

    if (!conversation) {
      conversation = await Conversation.create({
        organizationId,
        contactId: contact._id,
        channel: 'WHATSAPP',
        status: 'ACTIVE',
        lastMessage: {
          text: 'Started conversation',
          sender: 'AGENT',
          sentAt: new Date()
        }
      });
      conversation = await Conversation.findById(conversation._id).populate('contactId assignedTo');
    }

    return conversation;
  }

  async assignConversation(organizationId, conversationId, assignedToUserId) {
    const conversation = await Conversation.findOneAndUpdate(
      { organizationId, _id: conversationId },
      { $set: { assignedTo: assignedToUserId } },
      { new: true }
    ).populate('assignedTo', 'name email avatar');

    return conversation;
  }
}

export const conversationService = new ConversationService();
export default conversationService;

