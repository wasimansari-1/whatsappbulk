import { Router } from 'express';
import { contactController } from '../controllers/ContactController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { validateBody } from '../middleware/requestValidator.js';
import { createContactSchema, bulkContactActionSchema } from '@whatsapp-saas/shared-validation';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/', rbacGuard(Permissions.CONTACTS_READ), contactController.getContacts);
router.get('/tags', rbacGuard(Permissions.CONTACTS_READ), contactController.getTags);
router.get('/:id', rbacGuard(Permissions.CONTACTS_READ), contactController.getContact);
router.post('/', rbacGuard(Permissions.CONTACTS_WRITE), validateBody(createContactSchema), contactController.createContact);
router.put('/:id', rbacGuard(Permissions.CONTACTS_WRITE), contactController.updateContact);
router.delete('/:id', rbacGuard(Permissions.CONTACTS_DELETE), contactController.deleteContact);
router.post('/bulk', rbacGuard(Permissions.CONTACTS_WRITE), validateBody(bulkContactActionSchema), contactController.bulkActions);
router.post('/import', rbacGuard(Permissions.CONTACTS_IMPORT), contactController.importContacts);

export default router;
