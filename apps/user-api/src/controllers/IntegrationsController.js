import { integrationsService } from '../services/IntegrationsService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class IntegrationsController {
  async getIntegrations(req, res, next) {
    try {
      const integrations = await integrationsService.getIntegrations(req.organizationId);
      res.status(200).json(apiSuccess(integrations, 'Integrations fetched'));
    } catch (error) {
      next(error);
    }
  }

  async toggleIntegration(req, res, next) {
    try {
      const integration = await integrationsService.toggleIntegration(req.organizationId, req.params.type);
      res.status(200).json(apiSuccess(integration, `Integration status updated to ${integration.status}`));
    } catch (error) {
      next(error);
    }
  }

  async getApiKeys(req, res, next) {
    try {
      const keys = await integrationsService.getApiKeys(req.organizationId);
      res.status(200).json(apiSuccess(keys, 'API Keys fetched'));
    } catch (error) {
      next(error);
    }
  }

  async generateApiKey(req, res, next) {
    try {
      const apiKey = await integrationsService.generateApiKey(req.organizationId, req.body.name);
      res.status(201).json(apiSuccess(apiKey, 'API Key generated'));
    } catch (error) {
      next(error);
    }
  }
}

export const integrationsController = new IntegrationsController();
export default integrationsController;
