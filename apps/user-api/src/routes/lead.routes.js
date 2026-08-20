import { Router } from 'express';
import { leadController } from '../controllers/LeadController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { validateBody } from '../middleware/requestValidator.js';
import { createLeadSchema, updateLeadSchema } from '@whatsapp-saas/shared-validation';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/', rbacGuard(Permissions.LEADS_READ), leadController.getLeads);
router.get('/counts', rbacGuard(Permissions.LEADS_READ), leadController.getStageCounts);
router.post('/', rbacGuard(Permissions.LEADS_WRITE), validateBody(createLeadSchema), leadController.createLead);
router.put('/:id', rbacGuard(Permissions.LEADS_WRITE), validateBody(updateLeadSchema), leadController.updateLead);
router.patch('/:id/stage', rbacGuard(Permissions.LEADS_WRITE), leadController.updateLeadStage);
router.delete('/:id', rbacGuard(Permissions.LEADS_DELETE), leadController.deleteLead);

export default router;
