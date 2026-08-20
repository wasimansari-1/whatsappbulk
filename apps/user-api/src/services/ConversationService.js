import { conversationRepository } from '../repositories/ConversationRepository.js';
import { Contact } from '../models/Contact.js';
import { Conversation } from '../models/Conversation.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { entitlementService } from './EntitlementService.js';
import { emitToOrganization } from '../sockets/index.js';

export class ConversationService {
  async getConversations(organizationId, query) {
    return conversationRepository.getConversations(organizationId, query);
  }

  async getMessages(organizationId, contactId, query) {
    // Reset unread count for conversation
    await Conversation.findOneAndUpdate(
      { organizationId, contactId },
      { $set: { unreadCount: 0 } }
    );

    return conversationRepository.getMessages(organizationId, contactId, query);
  }

  async sendMessage(organizationId, userId, { contactId, text, mediaUrl, templateName }) {
    const contact = await Contact.findOne({ organizationId, _id: contactId });
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify quota & wallet balance
    await entitlementService.canSendMessages(organizationId, 1);

    const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    const phoneNumberId = activePhone?.phoneNumberId || 'mock_phone_num_id_1';

    const provider = getWhatsAppProvider();
    let providerResult;

    if (text) {
      providerResult = await provider.sendTextMessage({
        phoneNumberId,
        to: contact.phone,
        text
      });
    }

    const providerMessageId = providerResult?.messageId || providerResult?.messages?.[0]?.id;

    // Save message in DB
    const message = await conversationRepository.createMessage(organizationId, {
      whatsappPhoneNumberId: activePhone?._id,
      contactId: contact._id,
      direction: 'OUTBOUND',
      channel: 'WHATSAPP',
      type: 'TEXT',
      content: { text },
      status: 'SENT',
      providerMessageId,
      sentBy: userId
    });

    // Realtime notification
    emitToOrganization(organizationId, 'conversation.message', {
      contactId: contact._id,
      message
    });

    return message;
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
