import { Router } from 'express';
import { billingController } from '../controllers/BillingController.js';
import { authGuard } from '../middleware/authGuard.js';
import { rbacGuard } from '../middleware/rbacGuard.js';
import { validateBody } from '../middleware/requestValidator.js';
import { addWalletCreditsSchema } from '@whatsapp-saas/shared-validation';
import { Permissions } from '@whatsapp-saas/shared-constants';

const router = Router();

router.use(authGuard);

router.get('/plans', billingController.getPlans);
router.get('/overview', rbacGuard(Permissions.BILLING_READ), billingController.getOverview);
router.post('/credits', rbacGuard(Permissions.BILLING_MANAGE), validateBody(addWalletCreditsSchema), billingController.addCredits);
router.post('/upgrade', rbacGuard(Permissions.BILLING_MANAGE), billingController.upgradePlan);

export default router;
