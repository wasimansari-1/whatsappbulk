import { Router } from 'express';
import { whatsAppController } from '../controllers/WhatsAppController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { validateBody } from '../middleware/requestValidator.js';
import { createTemplateSchema } from '@whatsapp-saas/shared-validation';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/profile', rbacGuard(Permissions.WHATSAPP_READ), whatsAppController.getBusinessProfile);
router.post('/sync', rbacGuard(Permissions.WHATSAPP_MANAGE), whatsAppController.syncWithMeta);
router.post('/connect', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.connectAccount);

router.get('/templates', rbacGuard(Permissions.TEMPLATES_READ), whatsAppController.getTemplates);
router.post('/templates', rbacGuard(Permissions.TEMPLATES_CREATE), validateBody(createTemplateSchema), whatsAppController.createTemplate);
router.delete('/templates/:id', rbacGuard(Permissions.TEMPLATES_DELETE), whatsAppController.deleteTemplate);

export default router;
