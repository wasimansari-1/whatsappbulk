import { whatsAppService } from '../services/WhatsAppService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';
import { getMetaGraphApiVersion, getMetaAppId, getMetaWhatsAppConfigId, isMetaEmbeddedSignupEnabled } from '../config/metaConfig.js';

export class WhatsAppController {
  getConfig(req, res, next) {
    try {
      res.status(200).json(
        apiSuccess({
          appId: getMetaAppId(),
          configId: getMetaWhatsAppConfigId(),
          apiVersion: 'v25.0',
          embeddedSignupEnabled: isMetaEmbeddedSignupEnabled(),
          featureType: 'whatsapp_business_app_onboarding'
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const data = await whatsAppService.getWhatsAppStatus(req.organizationId);
      res.status(200).json(apiSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async getBusinessProfile(req, res, next) {
    try {
      const data = await whatsAppService.getBusinessProfile(req.organizationId);
      res.status(200).json(apiSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manual WhatsApp Connection with Live Meta Graph API Verification
   */
  async connectManual(req, res, next) {
    try {
      const result = await whatsAppService.connectManualWhatsApp(req.organizationId, req.user._id, req.body);
      res.status(200).json(apiSuccess(result, 'WhatsApp Business Account connected and verified successfully via Meta Cloud API'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Live Test of Active Meta WhatsApp Connection
   */
  async testConnection(req, res, next) {
    try {
      const result = await whatsAppService.testWhatsAppConnection(req.organizationId);
      res.status(200).json(apiSuccess(result, 'WhatsApp connection test completed'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Official Meta Embedded Signup OAuth Callback (Feature Flagged)
   */
  async handleEmbeddedSignup(req, res, next) {
    try {
      if (!isMetaEmbeddedSignupEnabled()) {
        return res.status(403).json({
          success: false,
          message: 'Automatic Meta Partner connection is coming soon. Please use Manual Connection.'
        });
      }
      const result = await whatsAppService.handleEmbeddedSignup(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'WhatsApp Business App connected with Coexistence successfully'));
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

  async disconnect(req, res, next) {
    try {
      const result = await whatsAppService.disconnectWhatsApp(req.organizationId);
      res.status(200).json(apiSuccess(result, 'WhatsApp connection disconnected'));
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
      res.status(201).json(apiSuccess(template, 'Template submitted to Meta and placed in PENDING review'));
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req, res, next) {
    try {
      const template = await whatsAppService.updateTemplate(req.organizationId, req.params.id, req.body);
      res.status(200).json(apiSuccess(template, 'Template updated successfully'));
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

  async requestPhoneOtp(req, res, next) {
    try {
      const result = await whatsAppService.requestPhoneOtp(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async verifyPhoneOtp(req, res, next) {
    try {
      const result = await whatsAppService.verifyPhoneOtp(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async connectCustom(req, res, next) {
    try {
      const result = await whatsAppService.connectCustomCredentials(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async loadDemo(req, res, next) {
    try {
      const result = await whatsAppService.loadDemoWorkspace(req.organizationId);
      res.status(200).json(apiSuccess(result, result.message));
    } catch (error) {
      next(error);
    }
  }
}

export const whatsAppController = new WhatsAppController();
export default whatsAppController;
