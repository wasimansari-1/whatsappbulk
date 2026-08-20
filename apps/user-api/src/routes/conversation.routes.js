import { Router } from 'express';
import { conversationController } from '../controllers/ConversationController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/', rbacGuard(Permissions.INBOX_READ), conversationController.getConversations);
router.get('/:contactId/messages', rbacGuard(Permissions.INBOX_READ), conversationController.getMessages);
router.post('/messages', rbacGuard(Permissions.INBOX_SEND), conversationController.sendMessage);
router.post('/:id/assign', rbacGuard(Permissions.INBOX_ASSIGN), conversationController.assignConversation);

export default router;
