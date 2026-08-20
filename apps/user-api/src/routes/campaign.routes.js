import { Router } from 'express';
import { campaignController } from '../controllers/CampaignController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { validateBody } from '../middleware/requestValidator.js';
import { createCampaignSchema } from '@whatsapp-saas/shared-validation';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/', rbacGuard(Permissions.CAMPAIGNS_READ), campaignController.getCampaigns);
router.get('/:id', rbacGuard(Permissions.CAMPAIGNS_READ), campaignController.getCampaign);
router.post('/', rbacGuard(Permissions.CAMPAIGNS_CREATE), validateBody(createCampaignSchema), campaignController.createCampaign);
router.post('/:id/cancel', rbacGuard(Permissions.CAMPAIGNS_PAUSE), campaignController.cancelCampaign);

export default router;
