import { whatsAppService } from '../services/WhatsAppService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class WhatsAppController {
  async getBusinessProfile(req, res, next) {
    try {
      const data = await whatsAppService.getBusinessProfile(req.organizationId);
      res.status(200).json(apiSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async syncWithMeta(req, res, next) {
    try {
      const result = await whatsAppService.syncWithMeta(req.organizationId);
      res.status(200).json(apiSuccess(result, 'Synced with Meta WhatsApp Cloud API successfully'));
    } catch (error) {
      next(error);
    }
  }

  async connectAccount(req, res, next) {
    try {
      const result = await whatsAppService.connectMetaAccount(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'WhatsApp account credentials connected successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getTemplates(req, res, next) {
    try {
      const templates = await whatsAppService.getTemplates(req.organizationId);
      res.status(200).json(apiSuccess(templates));
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      const template = await whatsAppService.createTemplate(req.organizationId, req.body);
      res.status(201).json(apiSuccess(template, 'Template created and submitted for approval'));
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req, res, next) {
    try {
      await whatsAppService.deleteTemplate(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(null, 'Template deleted'));
    } catch (error) {
      next(error);
    }
  }
}

export const whatsAppController = new WhatsAppController();
export default whatsAppController;
