import { billingService } from '../services/BillingService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class BillingController {
  async getPlans(req, res, next) {
    try {
      const plans = await billingService.getPlans();
      res.status(200).json(apiSuccess(plans));
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req, res, next) {
    try {
      const overview = await billingService.getBillingOverview(req.organizationId);
      res.status(200).json(apiSuccess(overview));
    } catch (error) {
      next(error);
    }
  }

  async addCredits(req, res, next) {
    try {
      const result = await billingService.addWalletCredits(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'Credits added to wallet successfully'));
    } catch (error) {
      next(error);
    }
  }

  async upgradePlan(req, res, next) {
    try {
      const subscription = await billingService.upgradePlan(req.organizationId, req.body);
      res.status(200).json(apiSuccess(subscription, 'Plan upgraded successfully'));
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
export default billingController;
