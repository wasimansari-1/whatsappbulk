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
router.get('/:id/recipients', rbacGuard(Permissions.CAMPAIGNS_READ), campaignController.getCampaignRecipients);
router.post('/', rbacGuard(Permissions.CAMPAIGNS_CREATE), validateBody(createCampaignSchema), campaignController.createCampaign);
router.post('/:id/pause', rbacGuard(Permissions.CAMPAIGNS_PAUSE), campaignController.pauseCampaign);
router.post('/:id/resume', rbacGuard(Permissions.CAMPAIGNS_PAUSE), campaignController.resumeCampaign);
router.post('/:id/retry', rbacGuard(Permissions.CAMPAIGNS_CREATE), campaignController.retryCampaign);
router.post('/:id/cancel', rbacGuard(Permissions.CAMPAIGNS_PAUSE), campaignController.cancelCampaign);

export default router;
