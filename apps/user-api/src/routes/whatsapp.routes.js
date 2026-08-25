import { Router } from 'express';
import { whatsAppController } from '../controllers/WhatsAppController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

// Public Meta App ID & Config ID for frontend Facebook SDK initialization
router.get('/config', whatsAppController.getConfig);

router.use(authGuard);

router.get('/status', whatsAppController.getStatus);
router.get('/profile', rbacGuard(Permissions.WHATSAPP_READ), whatsAppController.getBusinessProfile);
router.post('/manual-connect', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.connectManual);
router.post('/test-connection', rbacGuard(Permissions.WHATSAPP_READ), whatsAppController.testConnection);
router.post('/embedded-signup', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.handleEmbeddedSignup);
router.post('/sync', rbacGuard(Permissions.WHATSAPP_MANAGE), whatsAppController.syncWithMeta);
router.post('/disconnect', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.disconnect);

router.post('/request-otp', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.requestPhoneOtp);
router.post('/verify-otp', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.verifyPhoneOtp);
router.post('/connect-custom', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.connectCustom);
router.post('/load-demo', rbacGuard(Permissions.WHATSAPP_CONNECT), whatsAppController.loadDemo);

router.get('/templates', rbacGuard(Permissions.TEMPLATES_READ), whatsAppController.getTemplates);
router.post('/templates', rbacGuard(Permissions.TEMPLATES_CREATE), whatsAppController.createTemplate);
router.put('/templates/:id', rbacGuard(Permissions.TEMPLATES_CREATE), whatsAppController.updateTemplate);
router.delete('/templates/:id', rbacGuard(Permissions.TEMPLATES_DELETE), whatsAppController.deleteTemplate);

export default router;
