import { Router } from 'express';
import { automationController } from '../controllers/AutomationController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/', rbacGuard(Permissions.AUTOMATION_READ), automationController.getWorkflows);
router.post('/', rbacGuard(Permissions.AUTOMATION_MANAGE), automationController.createWorkflow);
router.put('/:id', rbacGuard(Permissions.AUTOMATION_MANAGE), automationController.updateWorkflow);
router.patch('/:id/toggle', rbacGuard(Permissions.AUTOMATION_MANAGE), automationController.toggleWorkflow);
router.delete('/:id', rbacGuard(Permissions.AUTOMATION_MANAGE), automationController.deleteWorkflow);

export default router;
