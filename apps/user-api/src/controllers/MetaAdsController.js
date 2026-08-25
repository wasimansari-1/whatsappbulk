import { metaAdsService } from '../services/MetaAdsService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class MetaAdsController {
  async getBusinessOverview(req, res, next) {
    try {
      const overview = await metaAdsService.getBusinessOverview(req.organizationId);
      res.status(200).json(apiSuccess(overview));
    } catch (error) {
      next(error);
    }
  }

  async getPages(req, res, next) {
    try {
      const pages = await metaAdsService.getPages(req.organizationId);
      res.status(200).json(apiSuccess(pages, 'Facebook Pages fetched from Meta'));
    } catch (error) {
      next(error);
    }
  }

  async getLeadForms(req, res, next) {
    try {
      const forms = await metaAdsService.getLeadForms(req.organizationId, req.query.pageId);
      res.status(200).json(apiSuccess(forms, 'Lead forms fetched'));
    } catch (error) {
      next(error);
    }
  }

  async createLeadForm(req, res, next) {
    try {
      const form = await metaAdsService.createLeadForm(req.organizationId, req.body);
      res.status(201).json(apiSuccess(form, 'Lead Form created on Meta Page'));
    } catch (error) {
      next(error);
    }
  }

  async getCampaigns(req, res, next) {
    try {
      const campaigns = await metaAdsService.getCampaigns(req.organizationId, req.query.status);
      res.status(200).json(apiSuccess(campaigns, 'Meta campaigns fetched'));
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req, res, next) {
    try {
      const campaign = await metaAdsService.createCampaign(req.organizationId, req.body);
      res.status(201).json(apiSuccess(campaign, 'Campaign published to Meta'));
    } catch (error) {
      next(error);
    }
  }

  async updateCampaignStatus(req, res, next) {
    try {
      const campaign = await metaAdsService.updateCampaignStatus(req.organizationId, req.params.id, req.body.status);
      res.status(200).json(apiSuccess(campaign, `Campaign status updated to ${campaign.status}`));
    } catch (error) {
      next(error);
    }
  }

  async syncAll(req, res, next) {
    try {
      const result = await metaAdsService.syncAll(req.organizationId);
      res.status(200).json(apiSuccess(result, 'Meta assets synchronized successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getActivityLogs(req, res, next) {
    try {
      const logs = await metaAdsService.getActivityLogs(req.organizationId);
      res.status(200).json(apiSuccess(logs, 'Activity audit logs fetched'));
    } catch (error) {
      next(error);
    }
  }

  async connectPage(req, res, next) {
    try {
      const result = await metaAdsService.connectFacebookPage(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async disconnectPage(req, res, next) {
    try {
      const result = await metaAdsService.disconnectFacebookPage(req.organizationId, req.body?.pageId);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async oauthStart(req, res, next) {
    try {
      const redirectUri = req.query.redirectUri || 'http://localhost:3000/leads';
      const result = metaAdsService.generateOAuthStart(req.organizationId, req.user?._id, redirectUri, req.user?.email);
      res.status(200).json(apiSuccess(result, 'OAuth start URL generated'));
    } catch (error) {
      next(error);
    }
  }

  async oauthCallback(req, res, next) {
    try {
      const result = await metaAdsService.handleOAuthCallback(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'Facebook OAuth authorization successful and assets discovered'));
    } catch (error) {
      next(error);
    }
  }

  async connectAssets(req, res, next) {
    try {
      const result = await metaAdsService.connectSelectedAssets(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async oauthExchange(req, res, next) {
    try {
      const result = await metaAdsService.handleMetaOAuthExchange(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'Facebook OAuth connection completed and live sync initiated'));
    } catch (error) {
      next(error);
    }
  }

  async getUserAssets(req, res, next) {
    try {
      const assets = await metaAdsService.getUserAssets(req.organizationId);
      res.status(200).json(apiSuccess(assets, 'Meta assets and Pages fetched'));
    } catch (error) {
      next(error);
    }
  }

  async syncHistoricalLeads(req, res, next) {
    try {
      const result = await metaAdsService.syncHistoricalLeads(req.organizationId);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async getInsights(req, res, next) {
    try {
      const insights = await metaAdsService.getInsights(req.organizationId);
      res.status(200).json(apiSuccess(insights, 'Meta ad insights fetched'));
    } catch (error) {
      next(error);
    }
  }

  async updateMetaToken(req, res, next) {
    try {
      const result = await metaAdsService.updateMetaTokenAndSync(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'Meta token updated and live sync completed'));
    } catch (error) {
      next(error);
    }
  }

  async loadDemo(req, res, next) {
    try {
      const result = await metaAdsService.loadDemoLeads(req.organizationId);
      res.status(200).json(apiSuccess(result, 'Live Meta sync completed'));
    } catch (error) {
      next(error);
    }
  }
}

export const metaAdsController = new MetaAdsController();
export default metaAdsController;
