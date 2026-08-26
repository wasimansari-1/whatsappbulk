import { campaignService } from '../services/CampaignService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class CampaignController {
  async getCampaigns(req, res, next) {
    try {
      const result = await campaignService.getCampaigns(req.organizationId, req.query);
      res.status(200).json(apiSuccess(result.items, 'Campaigns fetched successfully', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getCampaign(req, res, next) {
    try {
      const campaign = await campaignService.getCampaignById(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(campaign));
    } catch (error) {
      next(error);
    }
  }

  async getCampaignRecipients(req, res, next) {
    try {
      const recipients = await campaignService.getCampaignRecipients(req.organizationId, req.params.id, req.query);
      res.status(200).json(apiSuccess(recipients));
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req, res, next) {
    try {
      const campaign = await campaignService.createCampaign(req.organizationId, req.user._id, req.body);
      res.status(201).json(apiSuccess(campaign, 'Campaign launched successfully'));
    } catch (error) {
      next(error);
    }
  }

  async pauseCampaign(req, res, next) {
    try {
      const campaign = await campaignService.pauseCampaign(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(campaign, 'Campaign paused successfully'));
    } catch (error) {
      next(error);
    }
  }

  async resumeCampaign(req, res, next) {
    try {
      const campaign = await campaignService.resumeCampaign(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(campaign, 'Campaign resumed successfully'));
    } catch (error) {
      next(error);
    }
  }

  async retryCampaign(req, res, next) {
    try {
      const campaign = await campaignService.retryCampaign(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(campaign, 'Campaign retry initiated for failed recipients'));
    } catch (error) {
      next(error);
    }
  }

  async cancelCampaign(req, res, next) {
    try {
      const campaign = await campaignService.cancelCampaign(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(campaign, 'Campaign cancelled'));
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
export default campaignController;
