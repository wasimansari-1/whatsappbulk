import { conversationService } from '../services/ConversationService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class ConversationController {
  async getConversations(req, res, next) {
    try {
      const result = await conversationService.getConversations(req.organizationId, req.query);
      res.status(200).json(apiSuccess(result.items, 'Conversations fetched', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const messages = await conversationService.getMessages(req.organizationId, req.params.contactId, req.query);
      res.status(200).json(apiSuccess(messages));
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const message = await conversationService.sendMessage(req.organizationId, req.user._id, req.body);
      res.status(201).json(apiSuccess(message, 'Message sent'));
    } catch (error) {
      next(error);
    }
  }

  async assignConversation(req, res, next) {
    try {
      const { assignedTo } = req.body;
      const conversation = await conversationService.assignConversation(req.organizationId, req.params.id, assignedTo);
      res.status(200).json(apiSuccess(conversation, 'Conversation assigned'));
    } catch (error) {
      next(error);
    }
  }
}

export const conversationController = new ConversationController();
export default conversationController;
